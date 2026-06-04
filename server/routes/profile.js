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


// ── Avatar upload (POST /api/profile/avatar) ──────────────────────────────────
// AWS S3 varsa S3'e, yoksa sunucuda /assets/avatars/ klasörüne kaydeder.
const multer  = require('multer');
const path_m  = require('path');
const fs      = require('fs');

let upload;
let useS3 = false;

if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  try {
    const multerS3 = require('multer-s3');
    const { S3Client } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    upload = multer({
      storage: multerS3({
        s3,
        bucket: process.env.AWS_S3_BUCKET,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (_req, file, cb) => cb(null, `avatars/${Date.now()}-${file.originalname}`),
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Sadece resim dosyası yüklenebilir'));
      },
    });
    useS3 = true;
  } catch (_) {
    // multer-s3 veya aws-sdk yüklü değilse yerel depoya düş
  }
}

if (!useS3) {
  const avatarDir = path_m.join(__dirname, '../../assets/avatars');
  if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
  const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarDir),
    filename:    (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`),
  });
  upload = multer({
    storage: diskStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
      else cb(new Error('Sadece resim dosyası yüklenebilir'));
    },
  });
}

router.post('/avatar', authMiddleware, (req, res, next) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'Dosya seçilmedi' });

    const avatarUrl = useS3
      ? req.file.location
      : `/assets/avatars/${req.file.filename}`;

    try {
      await db.query('UPDATE users SET avatar=$1, avatar_url=$2, updated_at=NOW() WHERE id=$3',
        [avatarUrl, avatarUrl, req.user.id]);
      res.json({ success: true, avatarUrl });
    } catch (e) {
      logger.error('Avatar update DB hatası:', e.message);
      res.status(500).json({ success: false, message: 'Veritabanı hatası' });
    }
  });
});

module.exports = router;
