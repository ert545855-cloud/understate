// #4 Session Management Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const sessions = require('../services/sessionService');

router.get('/', authMiddleware, async (req, res) => {
  const list = await sessions.listSessions(req.user.id);
  res.json({ success: true, sessions: list });
});

router.delete('/:sessionId', authMiddleware, async (req, res) => {
  await sessions.revokeSession(req.params.sessionId, req.user.id);
  res.json({ success: true });
});

router.delete('/', authMiddleware, async (req, res) => {
  const currentToken = req.headers.authorization?.split(' ')[1];
  await sessions.revokeAllSessions(req.user.id, currentToken);
  res.json({ success: true, message: 'Tüm oturumlar kapatıldı' });
});

module.exports = router;
