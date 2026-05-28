// #18 Direct Messages Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const dmSvc = require('../services/dmService');

router.get('/inbox', authMiddleware, async (req, res) => {
  const inbox = await dmSvc.getInbox(req.user.id);
  res.json({ success: true, inbox });
});

router.get('/conversation/:userId', authMiddleware, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  await dmSvc.markRead(req.user.id, req.params.userId);
  const messages = await dmSvc.getConversation(req.user.id, req.params.userId, limit);
  res.json({ success: true, messages });
});

router.post('/send', authMiddleware, async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ success: false, message: 'to ve message gerekli' });
  const result = await dmSvc.sendDM(req.user.id, to, message);
  res.json({ success: result.ok, ...result });
});

router.post('/read/:userId', authMiddleware, async (req, res) => {
  await dmSvc.markRead(req.user.id, req.params.userId);
  res.json({ success: true });
});

module.exports = router;
