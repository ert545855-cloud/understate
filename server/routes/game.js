const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { saveUserFull } = require('../services/saveService');
const { generalLimiter } = require('../middleware/rateLimiter');
const { getConnectionStatus } = require('../database/connection');
const sb = require('../services/supabaseService');
const { userToPublic } = require('../auth/authController');
const { signRefreshToken, verifyRefreshToken } = require('../config/jwt');
const logger = require('../utils/logger');

router.post('/save', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const saved = await saveUserFull(req.user.id, req.body);
    res.json({ success: saved, message: saved ? 'Kaydedildi' : 'DB bağlı değil' });
  } catch (err) {
    logger.error('Game save:', err.message);
    res.status(500).json({ success: false });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const user = await sb.findUserById(req.user.id);
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

router.get('/online', (req, res) => {
  const { getOnlineGamePlayers } = require('../socket/gameHandler');
  const players = getOnlineGamePlayers();
  res.json({
    success: true,
    count: players.length,
    players: players.map(p => ({ username: p.username, level: p.level, city: p.city })),
  });
});

module.exports = router;
