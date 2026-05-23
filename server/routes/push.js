const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { sendPushToMany } = require('../services/pushService');
const User = require('../models/User');
const logger = require('../utils/logger');

// VAPID public key (tarayıcıya güvenli, şifreli değil)
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// Push aboneliği kaydet
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ success: false, message: 'Geçersiz abonelik' });
    }
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { pushSubscriptions: subscription }
    });
    logger.info(`[Push] Abone: ${req.user.username}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('[Push] Subscribe hatası:', err.message);
    res.status(500).json({ success: false });
  }
});

// Push aboneliğini sil
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ success: false });
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { pushSubscriptions: { endpoint } }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Admin: tüm kullanıcılara push gönder
router.post('/broadcast', adminMiddleware, async (req, res) => {
  try {
    const { title, body, url } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: 'title ve body gerekli' });

    const users = await User.find({ pushSubscriptions: { $exists: true, $not: { $size: 0 } } })
                            .select('pushSubscriptions');
    const allSubs = users.flatMap(u => u.pushSubscriptions || []);

    const payload = { title, body, icon: '/icon-192.png', badge: '/icon-72.png', url: url || '/' };
    const result  = await sendPushToMany(allSubs, payload);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[Push] Broadcast hatası:', err.message);
    res.status(500).json({ success: false });
  }
});

// Admin: belirli kullanıcıya push gönder
router.post('/send/:userId', adminMiddleware, async (req, res) => {
  try {
    const { title, body, url } = req.body;
    const user = await User.findById(req.params.userId).select('pushSubscriptions username');
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    if (!user.pushSubscriptions?.length) {
      return res.json({ success: false, message: 'Kullanıcının push aboneliği yok' });
    }
    const payload = { title, body, icon: '/icon-192.png', badge: '/icon-72.png', url: url || '/' };
    const result  = await sendPushToMany(user.pushSubscriptions, payload);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
