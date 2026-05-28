const express = require('express');
const router = express.Router();
const sb = require('../services/supabaseService');
const db = require('../services/dbService');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sanitizeInput } = require('../middleware/sanitize');
const { userToPublic } = require('../auth/authController');
const logger = require('../utils/logger');

// GET /api/profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!sb.isReady()) return res.status(503).json({ success: false, message: 'DB bağlı değil' });
    const user = await sb.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, user: userToPublic(user) });
  } catch (err) {
    logger.error('Profile GET:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// PUT /api/profile — cloud save
router.put('/', authMiddleware, sanitizeInput, async (req, res) => {
  try {
    if (!sb.isReady()) return res.status(503).json({ success: false, message: 'DB bağlı değil' });
    await sb.saveUserGameData(req.user.id, req.body);
    const user = await sb.findUserById(req.user.id);
    res.json({ success: true, user: userToPublic(user) });
  } catch (err) {
    logger.error('Profile PUT:', err.message);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// #21 — Public profile view (by username)
router.get('/view/:username', async (req, res) => {
  if (!db.isReady()) return res.status(503).json({ success: false });
  const { rows } = await db.query(
    `SELECT id, username, level, xp, score, city, position_tag, is_online,
            game_data, created_at, presidency_until
     FROM users WHERE LOWER(username)=LOWER($1)`,
    [req.params.username]
  ).catch(() => ({ rows: [] }));
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Oyuncu bulunamadı' });
  const u = rows[0];
  res.json({ success: true, profile: {
    id: u.id, username: u.username, level: u.level, xp: u.xp, score: u.score,
    city: u.city, positionTag: u.position_tag, isOnline: u.is_online,
    gang: u.game_data?.gang || null, party: u.game_data?.party || null,
    alliance: u.game_data?.alliance || null,
    isPresident: u.presidency_until && new Date(u.presidency_until) > new Date(),
    memberSince: u.created_at,
  }});
});

// #23 — Referral code + stats
router.get('/referral', authMiddleware, async (req, res) => {
  if (!db.isReady()) return res.status(503).json({ success: false });
  const { rows } = await db.query(
    `SELECT referral_code FROM users WHERE id=$1`, [req.user.id]
  ).catch(() => ({ rows: [] }));
  res.json({ success: true, referralCode: rows[0]?.referral_code });
});

router.get('/referral/stats', authMiddleware, async (req, res) => {
  if (!db.isReady()) return res.status(503).json({ success: false });
  const { rows } = await db.query(
    `SELECT r.bonus_paid, r.created_at, u.username AS referred_username, u.level AS referred_level
     FROM referrals r JOIN users u ON u.id=r.referred_id
     WHERE r.referrer_id=$1 ORDER BY r.created_at DESC`,
    [req.user.id]
  ).catch(() => ({ rows: [] }));
  res.json({ success: true, referrals: rows, total: rows.length });
});

// #23 — Use referral code (call after registration)
router.post('/referral/use', authMiddleware, async (req, res) => {
  if (!db.isReady()) return res.status(503).json({ success: false });
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'code gerekli' });
  const { rows: ref } = await db.query(
    `SELECT id FROM users WHERE UPPER(referral_code)=UPPER($1) AND id!=$2`, [code, req.user.id]
  ).catch(() => ({ rows: [] }));
  if (!ref[0]) return res.status(404).json({ success: false, message: 'Geçersiz referans kodu' });

  try {
    await db.query(
      `INSERT INTO referrals (referrer_id, referred_id) VALUES ($1,$2)`,
      [ref[0].id, req.user.id]
    );
    // Bonus: referrer gets 5000₺, referred gets 2000₺
    await db.query(`UPDATE users SET money=money+5000 WHERE id=$1`, [ref[0].id]).catch(() => {});
    await db.query(`UPDATE users SET money=money+2000 WHERE id=$1`, [req.user.id]).catch(() => {});
    await db.query(`UPDATE referrals SET bonus_paid=TRUE WHERE referrer_id=$1 AND referred_id=$2`,
      [ref[0].id, req.user.id]).catch(() => {});
    res.json({ success: true, message: 'Referans bonusu uygulandı! +2.000₺', bonus: 2000 });
  } catch(e) {
    if (e.code === '23505') return res.json({ success: false, message: 'Referans kodu zaten kullanıldı' });
    res.status(500).json({ success: false });
  }
});

module.exports = router;
