const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { saveUserFull } = require('../services/saveService');
const { generalLimiter } = require('../middleware/rateLimiter');
const { getConnectionStatus } = require('../database/connection');
const User = require('../models/User');
const logger = require('../utils/logger');

// Oyun verisi kaydet
router.post('/save', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const saved = await saveUserFull(req.user.id, req.body);
    res.json({ success: saved, message: saved ? 'Kaydedildi' : 'DB bağlı değil' });
  } catch (err) {
    logger.error('Game save:', err.message);
    res.status(500).json({ success: false });
  }
});

// Oyuncu profili (token ile)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!getConnectionStatus()) return res.json({ success: false, message: 'DB bağlı değil' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Hata raporu (ErrorBoundary'den gelir — sessizce loglanır)
router.post('/error-report', authMiddleware, (req, res) => {
  try {
    const { message, stack, version, ts } = req.body || {};
    logger.warn(`[ErrorBoundary] user=${req.user?.username} v=${version} msg=${String(message || '').slice(0, 200)}`);
    if (stack) logger.warn(`[ErrorBoundary] stack=${String(stack).slice(0, 400)}`);
  } catch (_) {}
  res.json({ success: true });
});

// Online oyuncu sayısı (public — money bilgisi gizlendi)
router.get('/online', (req, res) => {
  const { getOnlineGamePlayers } = require('../socket/gameHandler');
  const players = getOnlineGamePlayers();
  res.json({
    success: true,
    count: players.length,
    players: players.map(p => ({
      username: p.username,
      level: p.level,
      city: p.city,
      // money, userId, socketId intentionally excluded
    })),
  });
});

module.exports = router;
