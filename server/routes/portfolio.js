// #27 Portfolio History Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const portfolioSvc = require('../services/portfolioService');

router.get('/', authMiddleware, async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const history = await portfolioSvc.getHistory(req.user.id, days);
  res.json({ success: true, history });
});

router.post('/snapshot', authMiddleware, async (req, res) => {
  await portfolioSvc.recordSnapshot(req.user.id);
  res.json({ success: true });
});

module.exports = router;
