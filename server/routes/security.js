// #33 IP Ban + #34 Security Flags Routes
const express = require('express');
const router  = express.Router();
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { authMiddleware } = require('../middleware/authMiddleware');
const secSvc = require('../services/securityService');
const errLog = require('../services/errorLogService');

// IP Bans
router.get('/ip-bans', adminMiddleware, async (req, res) => {
  const list = await secSvc.listIPBans();
  res.json({ success: true, bans: list });
});

router.post('/ip-ban', adminMiddleware, async (req, res) => {
  const { ip, reason, hours } = req.body;
  if (!ip) return res.status(400).json({ success: false, message: 'ip gerekli' });
  await secSvc.banIP(ip, { reason, bannedBy: req.user.id, hours });
  res.json({ success: true });
});

router.delete('/ip-ban/:ip', adminMiddleware, async (req, res) => {
  await secSvc.unbanIP(decodeURIComponent(req.params.ip));
  res.json({ success: true });
});

// Security flags
router.get('/flags', adminMiddleware, async (req, res) => {
  const flags = await secSvc.getAllUnresolved();
  res.json({ success: true, flags });
});

router.get('/flags/:userId', adminMiddleware, async (req, res) => {
  const flags = await secSvc.getFlags(req.params.userId);
  res.json({ success: true, flags });
});

router.post('/freeze/:userId', adminMiddleware, async (req, res) => {
  const { reason = 'Admin kararı' } = req.body;
  await secSvc.autoFreeze(req.params.userId, reason);
  res.json({ success: true });
});

router.post('/unfreeze/:userId', adminMiddleware, async (req, res) => {
  await secSvc.unfreezeUser(req.params.userId);
  res.json({ success: true });
});

// Error logs
router.get('/errors', adminMiddleware, async (req, res) => {
  const { limit, type } = req.query;
  const logs = await errLog.getRecent(parseInt(limit) || 100, type);
  res.json({ success: true, logs });
});

module.exports = router;
