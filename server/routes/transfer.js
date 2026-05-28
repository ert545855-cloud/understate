// #16 Money Transfer Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const transferSvc = require('../services/transferService');

router.post('/', authMiddleware, async (req, res) => {
  const { to, amount, message } = req.body;
  if (!to || !amount) return res.status(400).json({ success: false, message: 'to ve amount gerekli' });
  const result = await transferSvc.transfer({
    senderId: req.user.id,
    receiverUsername: to,
    amount,
    message,
  });
  res.json({ success: result.ok, ...result });
});

router.get('/history', authMiddleware, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const history = await transferSvc.getHistory(req.user.id, limit);
  res.json({ success: true, transfers: history });
});

module.exports = router;
