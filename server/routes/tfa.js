// #35 Two-Factor Auth Routes
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const tfaSvc = require('../services/twoFactorService');

router.get('/status', authMiddleware, async (req, res) => {
  const enabled = await tfaSvc.is2FAEnabled(req.user.id);
  res.json({ success: true, enabled });
});

router.post('/setup', authMiddleware, async (req, res) => {
  const result = await tfaSvc.setup2FA(req.user.id);
  res.json({ success: result.ok, secret: result.secret, otpauth: result.otpauth, backupCodes: result.backupCodes });
});

router.post('/enable', authMiddleware, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'token gerekli' });
  const result = await tfaSvc.enable2FA(req.user.id, token);
  res.json({ success: result.ok, ...result });
});

router.post('/disable', authMiddleware, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'token gerekli' });
  const result = await tfaSvc.disable2FA(req.user.id, token);
  res.json({ success: result.ok, ...result });
});

module.exports = router;
