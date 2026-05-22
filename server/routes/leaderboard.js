const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../services/leaderboardService');
const monitoring = require('../services/monitoringService');
const roomManager = require('../rooms/roomManager');

router.get('/', async (req, res) => {
  const type = req.query.type === 'money' ? 'money' : 'level';
  const result = await getLeaderboard(type);
  res.json(result);
});

router.get('/online', (req, res) => {
  const stats = monitoring.getStats(roomManager.getAllRooms().length);
  res.json({
    success: true,
    online: stats.connectedSockets,
    peak: stats.peakOnline,
    rooms: stats.roomCount,
    uptime: stats.uptimeFormatted,
  });
});

module.exports = router;
