"use strict";
const express = require('express');
const router  = express.Router();
const db      = require('../services/dbService');
const { authMiddleware: authenticateToken } = require('../middleware/authMiddleware');

// UC paketleri (fiyat TL, gerçek ödeme entegrasyonu placeholder)
const UC_PACKAGES = [
  { id: 'uc_50',   uc: 50,   price: 9.99,   label: '50 UC',   bonus: 0,    icon: '💎' },
  { id: 'uc_150',  uc: 150,  price: 24.99,  label: '150 UC',  bonus: 10,   icon: '💎' },
  { id: 'uc_350',  uc: 350,  price: 49.99,  label: '350 UC',  bonus: 30,   icon: '💎' },
  { id: 'uc_750',  uc: 750,  price: 99.99,  label: '750 UC',  bonus: 75,   icon: '💎' },
  { id: 'uc_1500', uc: 1500, price: 179.99, label: '1500 UC', bonus: 200,  icon: '💎' },
  { id: 'uc_3000', uc: 3000, price: 299.99, label: '3000 UC', bonus: 500,  icon: '💎' },
];

const VIP_PACKAGES = [
  { id: 'vip_30',  days: 30,  price: 49.99,  label: '1 Aylık VIP',  perks: ['%2 banka faizi', 'Özel çerçeve', '+50% XP'] },
  { id: 'vip_90',  days: 90,  price: 129.99, label: '3 Aylık VIP',  perks: ['%2 banka faizi', 'Özel çerçeve', '+50% XP', 'Aylık 100 UC'] },
  { id: 'vip_365', days: 365, price: 399.99, label: 'Yıllık VIP',   perks: ['%2 banka faizi', 'Özel çerçeve', '+50% XP', 'Aylık 150 UC', 'Özel rozet'] },
];

// GET /api/store/packages — tüm paketleri listele
router.get('/packages', (req, res) => {
  res.json({ success: true, ucPackages: UC_PACKAGES, vipPackages: VIP_PACKAGES });
});

// POST /api/store/purchase/uc — UC satın al (simüle — gerçek ödeme entegrasyonu hazır değil)
router.post('/purchase/uc', authenticateToken, async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = UC_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return res.status(400).json({ success: false, message: 'Geçersiz paket' });

    const userId = req.user.id;
    const user = await db.findUserById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    const totalUC = pkg.uc + pkg.bonus;
    const newCoins = (user.under_coin || 0) + totalUC;

    await db.query(`UPDATE users SET under_coin = $1, updated_at = NOW() WHERE id = $2`, [newCoins, userId]);

    // Satın alma kaydı
    await db.query(`
      INSERT INTO store_purchases (user_id, package_id, uc_amount, price_tl, status, created_at)
      VALUES ($1, $2, $3, $4, 'completed', NOW())
    `, [userId, pkg.id, totalUC, pkg.price]).catch(() => {});

    const io = req.app.get('io');
    if (io) {
      io.to(user.socket_id || '').emit('coinsUpdate', {
        underCoin: newCoins,
        delta: totalUC,
        reason: `${pkg.label} satın aldın`,
        from: 'store',
        timestamp: Date.now(),
      });
    }

    res.json({ success: true, newCoins, delta: totalUC, package: pkg });
  } catch (err) {
    console.error('[store] UC purchase error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/store/purchase/vip — VIP satın al (simüle)
router.post('/purchase/vip', authenticateToken, async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = VIP_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return res.status(400).json({ success: false, message: 'Geçersiz paket' });

    const userId = req.user.id;
    const user = await db.findUserById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    const now = Date.now();
    const currentExpiry = user.premium_expiry ? new Date(user.premium_expiry).getTime() : now;
    const baseTime = Math.max(currentExpiry, now);
    const newExpiry = new Date(baseTime + pkg.days * 86400000);

    await db.query(`
      UPDATE users
      SET premium = true, premium_expiry = $1, vip = true, updated_at = NOW()
      WHERE id = $2
    `, [newExpiry.toISOString(), userId]);

    const io = req.app.get('io');
    if (io && user.socket_id) {
      io.to(user.socket_id).emit('profileUpdate', {
        premium: true,
        premiumExpiry: newExpiry.getTime(),
        vip: true,
      });
    }

    res.json({ success: true, premium: true, premiumExpiry: newExpiry.getTime(), package: pkg });
  } catch (err) {
    console.error('[store] VIP purchase error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/store/history — satın alma geçmişi
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT package_id, uc_amount, price_tl, status, created_at
      FROM store_purchases
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.user.id]).then(r => r.rows).catch(() => []);
    res.json({ success: true, history: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
