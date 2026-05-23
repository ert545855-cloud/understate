const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../services/leaderboardService');
const monitoring = require('../services/monitoringService');
const roomManager = require('../rooms/roomManager');
const { getOnlineGamePlayers } = require('../socket/gameHandler');

const VALID_TYPES = ['level', 'money', 'bank', 'score', 'gang'];

// Tekli tip sorgulama
router.get('/', async (req, res) => {
  const type = VALID_TYPES.includes(req.query.type) ? req.query.type : 'level';
  const result = await getLeaderboard(type);
  res.json(result);
});

// Tüm kategorileri tek sorguda döner (UI için kullanışlı)
router.get('/all', async (req, res) => {
  try {
    const results = await Promise.all(VALID_TYPES.map(t => getLeaderboard(t)));
    const combined = {};
    VALID_TYPES.forEach((t, i) => { combined[t] = results[i].data || []; });
    res.json({ success: true, data: combined, types: VALID_TYPES });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Hata' });
  }
});

// Online istatistikler
router.get('/online', (req, res) => {
  const stats       = monitoring.getStats(roomManager.getAllRooms().length);
  const gamePlayers = getOnlineGamePlayers();
  res.json({
    success: true,
    online:  stats.connectedSockets,
    peak:    stats.peakOnline,
    rooms:   stats.roomCount,
    uptime:  stats.uptimeFormatted,
    inGame:  gamePlayers.length,
  });
});

module.exports = router;
