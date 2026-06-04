"use strict";
const express = require('express');
const router  = express.Router();
const db      = require('../services/dbService');
const { authMiddleware } = require('../middleware/authMiddleware');

const INTEREST_RATE_NORMAL  = 0.005; // %0.5 günlük
const INTEREST_RATE_PREMIUM = 0.02;  // %2 günlük VIP
const TRANSFER_FEE          = 0.01;  // %1 komisyon
const INTEREST_COOLDOWN_MS  = 24 * 3600 * 1000; // 24 saat

// GET /api/bank/status — bakiye, faiz durumu
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false });
    const now = Date.now();
    const last = user.last_bank_interest ? new Date(user.last_bank_interest).getTime() : 0;
    const nextCollect = last + INTEREST_COOLDOWN_MS;
    const canCollect  = now >= nextCollect;
    const msUntil     = canCollect ? 0 : nextCollect - now;
    const rate        = user.premium ? INTEREST_RATE_PREMIUM : INTEREST_RATE_NORMAL;
    const projected   = Math.floor((user.bank || 0) * rate);
    res.json({
      success: true,
      money:   user.money   || 0,
      bank:    user.bank    || 0,
      canCollect,
      msUntil,
      rate,
      projectedInterest: projected,
      premium: !!user.premium,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bank/deposit — nakit → banka
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const amount = parseInt(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Geçersiz tutar' });
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false });
    if ((user.money || 0) < amount) return res.status(400).json({ success: false, message: 'Yetersiz nakit' });
    const newMoney = (user.money || 0) - amount;
    const newBank  = (user.bank  || 0) + amount;
    await db.query('UPDATE users SET money=$1, bank=$2, updated_at=NOW() WHERE id=$3', [newMoney, newBank, req.user.id]);
    const io = req.app.get('io');
    if (io && user.socket_id) io.to(user.socket_id).emit('profileUpdate', { money: newMoney, bank: newBank });
    res.json({ success: true, money: newMoney, bank: newBank, deposited: amount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bank/withdraw — banka → nakit
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const amount = parseInt(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Geçersiz tutar' });
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false });
    if ((user.bank || 0) < amount) return res.status(400).json({ success: false, message: 'Yetersiz banka bakiyesi' });
    const newMoney = (user.money || 0) + amount;
    const newBank  = (user.bank  || 0) - amount;
    await db.query('UPDATE users SET money=$1, bank=$2, updated_at=NOW() WHERE id=$3', [newMoney, newBank, req.user.id]);
    const io = req.app.get('io');
    if (io && user.socket_id) io.to(user.socket_id).emit('profileUpdate', { money: newMoney, bank: newBank });
    res.json({ success: true, money: newMoney, bank: newBank, withdrawn: amount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bank/interest — faiz topla
router.post('/interest', authMiddleware, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false });
    if ((user.bank || 0) <= 0) return res.status(400).json({ success: false, message: 'Bankada para yok' });
    const now  = Date.now();
    const last = user.last_bank_interest ? new Date(user.last_bank_interest).getTime() : 0;
    if (now < last + INTEREST_COOLDOWN_MS) {
      const msLeft = (last + INTEREST_COOLDOWN_MS) - now;
      const hLeft  = Math.ceil(msLeft / 3600000);
      return res.status(400).json({ success: false, message: `${hLeft} saat sonra tekrar toplayabilirsin`, msLeft });
    }
    const rate     = user.premium ? INTEREST_RATE_PREMIUM : INTEREST_RATE_NORMAL;
    const interest = Math.floor((user.bank || 0) * rate);
    const newMoney = (user.money || 0) + interest;
    await db.query(
      'UPDATE users SET money=$1, last_bank_interest=NOW(), updated_at=NOW() WHERE id=$2',
      [newMoney, req.user.id]
    );
    const io = req.app.get('io');
    if (io && user.socket_id) io.to(user.socket_id).emit('profileUpdate', { money: newMoney, lastBankInterest: now });
    res.json({ success: true, money: newMoney, interest, rate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bank/transfer — para gönder
router.post('/transfer', authMiddleware, async (req, res) => {
  try {
    const { toUsername, amount: rawAmt } = req.body;
    const amount = parseInt(rawAmt);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Geçersiz tutar' });
    if (!toUsername?.trim()) return res.status(400).json({ success: false, message: 'Alıcı belirtin' });
    const sender = await db.findUserById(req.user.id);
    if (!sender) return res.status(404).json({ success: false });
    if (sender.username?.toLowerCase() === toUsername.trim().toLowerCase())
      return res.status(400).json({ success: false, message: 'Kendinize para gönderemezsiniz' });
    const { rows: [receiver] } = await db.query(
      'SELECT id, username, socket_id FROM users WHERE LOWER(username)=LOWER($1)', [toUsername.trim()]
    );
    if (!receiver) return res.status(404).json({ success: false, message: 'Oyuncu bulunamadı: ' + toUsername });
    const fee      = Math.max(100, Math.floor(amount * TRANSFER_FEE));
    const totalOut = amount + fee;
    if ((sender.money || 0) < totalOut)
      return res.status(400).json({ success: false, message: `Yetersiz nakit (gerekli: ${totalOut.toLocaleString('tr-TR')} ₺ + komisyon)` });
    await db.query('UPDATE users SET money=money-$1, updated_at=NOW() WHERE id=$2', [totalOut, req.user.id]);
    await db.query('UPDATE users SET money=money+$1, updated_at=NOW() WHERE id=$2', [amount, receiver.id]);
    // Transfer kaydı varsa kaydet
    await db.query(
      `INSERT INTO money_transfers (sender_id, receiver_id, amount, fee, created_at)
       VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING`,
      [req.user.id, receiver.id, amount, fee]
    ).catch(() => {});
    const io = req.app.get('io');
    if (io) {
      if (sender.socket_id) io.to(sender.socket_id).emit('profileUpdate', { money: (sender.money || 0) - totalOut });
      if (receiver.socket_id) io.to(receiver.socket_id).emit('moneyReceived', {
        from: sender.username, amount, fee,
        message: `💸 ${sender.username}'den ${amount.toLocaleString('tr-TR')} ₺ aldınız`,
      });
    }
    res.json({ success: true, sent: amount, fee, toUsername: receiver.username });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
