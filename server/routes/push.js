const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { sendPushToMany } = require('../services/pushService');
const sb = require('../services/supabaseService');
const logger = require('../utils/logger');

router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ success: false, message: 'Geçersiz abonelik' });
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const user = await sb.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false });
    const subs = Array.isArray(user.push_subscriptions) ? user.push_subscriptions : [];
    if (!subs.find(s => s.endpoint === subscription.endpoint)) {
      subs.push(subscription);
      await sb.updateUser(req.user.id, { push_subscriptions: subs });
    }
    logger.info(`[Push] Abone: ${req.user.username}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('[Push] Subscribe hatası:', err.message);
    res.status(500).json({ success: false });
  }
});

router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ success: false });
    if (!sb.isReady()) return res.json({ success: false });
    const user = await sb.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false });
    const subs = (user.push_subscriptions || []).filter(s => s.endpoint !== endpoint);
    await sb.updateUser(req.user.id, { push_subscriptions: subs });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.post('/broadcast', adminMiddleware, async (req, res) => {
  try {
    const { title, body, url } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: 'title ve body gerekli' });
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { rows: users } = await sb.query("SELECT push_subscriptions FROM users WHERE push_subscriptions IS NOT NULL AND push_subscriptions != '[]'::jsonb");
    const allSubs = (users || []).flatMap(u => u.push_subscriptions || []);
    const payload = { title, body, icon: '/icon-192.png', badge: '/icon-72.png', url: url || '/' };
    const result = await sendPushToMany(allSubs, payload);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[Push] Broadcast hatası:', err.message);
    res.status(500).json({ success: false });
  }
});

router.post('/send/:userId', adminMiddleware, async (req, res) => {
  try {
    const { title, body, url } = req.body;
    if (!sb.isReady()) return res.json({ success: false });
    const user = await sb.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    if (!user.push_subscriptions?.length) return res.json({ success: false, message: 'Kullanıcının push aboneliği yok' });
    const payload = { title, body, icon: '/icon-192.png', badge: '/icon-72.png', url: url || '/' };
    const result = await sendPushToMany(user.push_subscriptions, payload);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
