const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { saveUserFull } = require('../services/saveService');
const { generalLimiter } = require('../middleware/rateLimiter');
const db = require('../services/dbService');
const { userToPublic } = require('../auth/authController');
const logger = require('../utils/logger');
const { validateSaveData } = require('../middleware/saveValidator');

// ── USER SAVE ─────────────────────────────────────────────────────────────────
router.post('/save', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const current = db.isReady() ? await db.findUserById(req.user.id) : null;
    const validated = validateSaveData(req.body, current, req.user.id);
    const saved = await saveUserFull(req.user.id, validated);
    res.json({ success: saved, message: saved ? 'Kaydedildi' : 'DB bağlı değil' });
  } catch (err) {
    logger.error('Game save:', err.message);
    res.status(500).json({ success: false });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false });
    res.json({ success: true, user: userToPublic(user) });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.post('/error-report', authMiddleware, (req, res) => {
  try {
    const { message, stack, version } = req.body || {};
    logger.warn(`[ErrorBoundary] user=${req.user?.username} v=${version} msg=${String(message || '').slice(0, 200)}`);
    if (stack) logger.warn(`[ErrorBoundary] stack=${String(stack).slice(0, 400)}`);
  } catch (_) {}
  res.json({ success: true });
});

// ── ONLINE PLAYERS ────────────────────────────────────────────────────────────
router.get('/online', (req, res) => {
  const { getOnlineGamePlayers } = require('../socket/gameHandler');
  const players = getOnlineGamePlayers();
  res.json({
    success: true,
    count: players.length,
    players: players.map(p => ({ username: p.username, level: p.level, city: p.city })),
  });
});

// ── FULL GAME STATE ───────────────────────────────────────────────────────────
router.get('/state', async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const state = await db.getFullGameState();
    res.json({ success: true, state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GANGS ─────────────────────────────────────────────────────────────────────
router.get('/gangs', async (req, res) => {
  try {
    const gangs = db.isReady() ? await db.getGangs() : [];
    res.json({ success: true, gangs });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/gangs', authMiddleware, generalLimiter, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { gangs } = req.body;
    if (!Array.isArray(gangs)) return res.status(400).json({ success: false, message: 'gangs array gerekli' });
    await db.setGangs(gangs);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.put('/gangs/:gangId', authMiddleware, generalLimiter, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false });
    const { gangId } = req.params;
    await db.upsertGang({ ...req.body, id: gangId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.delete('/gangs/:gangId', authMiddleware, generalLimiter, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false });
    await db.deleteGang(req.params.gangId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// ── PARTIES ───────────────────────────────────────────────────────────────────
router.get('/parties', async (req, res) => {
  try {
    const parties = db.isReady() ? await db.getParties() : [];
    res.json({ success: true, parties });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/parties', authMiddleware, generalLimiter, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false });
    const { parties } = req.body;
    if (!Array.isArray(parties)) return res.status(400).json({ success: false });
    await db.setParties(parties);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.put('/parties/:partyId', authMiddleware, generalLimiter, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false });
    await db.upsertParty({ ...req.body, id: req.params.partyId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.delete('/parties/:partyId', authMiddleware, generalLimiter, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false });
    await db.deleteParty(req.params.partyId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// ── ALLIANCES ─────────────────────────────────────────────────────────────────
router.get('/alliances', async (req, res) => {
  try {
    const alliances = db.isReady() ? await db.getAlliances() : [];
    res.json({ success: true, alliances });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/alliances', authMiddleware, generalLimiter, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false });
    const { alliances } = req.body;
    if (!Array.isArray(alliances)) return res.status(400).json({ success: false });
    await db.setAlliances(alliances);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// ── ELECTIONS ─────────────────────────────────────────────────────────────────
router.get('/elections', async (req, res) => {
  try {
    const [elections, elections_multi] = await Promise.all([
      db.isReady() ? db.getElections() : { phase:'idle', candidates:[], votes:{} },
      db.isReady() ? db.getElectionsMulti() : {},
    ]);
    res.json({ success: true, elections, elections_multi });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/elections', authMiddleware, generalLimiter, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false });
    const { elections, elections_multi } = req.body;
    if (elections !== undefined)       await db.setElections(elections);
    if (elections_multi !== undefined) await db.setElectionsMulti(elections_multi);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// ── LAWS ──────────────────────────────────────────────────────────────────────
router.get('/laws', async (req, res) => {
  try {
    const laws = db.isReady() ? await db.getLaws() : [];
    res.json({ success: true, laws });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/laws', authMiddleware, generalLimiter, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false });
    const { laws } = req.body;
    if (!Array.isArray(laws)) return res.status(400).json({ success: false });
    await db.setLaws(laws);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
router.get('/announcements', async (req, res) => {
  try {
    const announcements = db.isReady() ? await db.getAnnouncements() : [];
    res.json({ success: true, announcements });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/announcements', authMiddleware, generalLimiter, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false });
    const { announcements } = req.body;
    if (!Array.isArray(announcements)) return res.status(400).json({ success: false });
    await db.setAnnouncements(announcements);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: true, notifications: [] });
    const notifications = await db.getNotifications(req.user.id, 30);
    res.json({ success: true, notifications });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/notifications/read', authMiddleware, async (req, res) => {
  try {
    if (db.isReady()) await db.markNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;
