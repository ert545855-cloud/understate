// #12 Daily Streak Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const streakSvc = require('../services/streakService');

router.get('/', authMiddleware, async (req, res) => {
  const streak = await streakSvc.getStreak(req.user.id);
  res.json({ success: true, streak, rewards: streakSvc.STREAK_REWARDS });
});

router.post('/claim', authMiddleware, async (req, res) => {
  const result = await streakSvc.claimDaily(req.user.id);
  res.json({ success: result.ok, ...result });
});

module.exports = router;
