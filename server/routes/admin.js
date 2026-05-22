const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../middleware/adminMiddleware');
const User = require('../models/User');
const { getConnectionStatus, getConnectionDetails } = require('../database/connection');
const monitoring = require('../services/monitoringService');
const roomManager = require('../rooms/roomManager');
const { getOnlineGamePlayers } = require('../socket/gameHandler');
const logger = require('../utils/logger');

let _io = null;
function setIO(io) { _io = io; }

// Tüm istatistikler
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const stats = monitoring.getStats(roomManager.getAllRooms().length);
    const onlinePlayers = getOnlineGamePlayers();
    let totalUsers = 0;
    let bannedUsers = 0;
    if (getConnectionStatus()) {
      totalUsers = await User.countDocuments();
      bannedUsers = await User.countDocuments({ banned: true });
    }
    res.json({
      success: true,
      stats: {
        ...stats,
        totalUsers,
        bannedUsers,
        onlinePlayers: onlinePlayers.length,
        onlineList: onlinePlayers,
        rooms: roomManager.getAllRooms(),
        dbDetails: getConnectionDetails(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Tüm kullanıcılar
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    if (!getConnectionStatus()) return res.json({ success: false, message: 'DB bağlı değil' });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const query = search ? { $or: [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};
    const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await User.countDocuments(query);
    res.json({ success: true, users: users.map(u => u.toPublicJSON()), total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Kullanıcı banla
router.post('/ban/:userId', adminMiddleware, async (req, res) => {
  try {
    if (!getConnectionStatus()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { reason = 'Kural ihlali' } = req.body;
    const user = await User.findByIdAndUpdate(req.params.userId, { banned: true, banReason: reason }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    if (_io && user.socketId) {
      _io.to(user.socketId).emit('banned', { reason });
      _io.sockets.sockets.get(user.socketId)?.disconnect(true);
    }
    logger.warn(`BAN: ${user.username} — ${reason} (by ${req.user.username})`);
    res.json({ success: true, message: `${user.username} banlandı` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Ban kaldır
router.post('/unban/:userId', adminMiddleware, async (req, res) => {
  try {
    if (!getConnectionStatus()) return res.json({ success: false, message: 'DB bağlı değil' });
    const user = await User.findByIdAndUpdate(req.params.userId, { banned: false, banReason: null }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    logger.info(`UNBAN: ${user.username} (by ${req.user.username})`);
    res.json({ success: true, message: `${user.username} banı kaldırıldı` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Kick (bağlantıyı kes)
router.post('/kick/:socketId', adminMiddleware, (req, res) => {
  if (!_io) return res.json({ success: false, message: 'IO hazır değil' });
  const { reason = 'Admin tarafından çıkarıldı' } = req.body;
  const sock = _io.sockets.sockets.get(req.params.socketId);
  if (!sock) return res.status(404).json({ success: false, message: 'Oyuncu bulunamadı' });
  sock.emit('kicked', { reason });
  sock.disconnect(true);
  logger.warn(`KICK: ${req.params.socketId} — ${reason} (by ${req.user.username})`);
  res.json({ success: true, message: 'Oyuncu çıkarıldı' });
});

// Herkese duyuru gönder
router.post('/broadcast', adminMiddleware, (req, res) => {
  if (!_io) return res.json({ success: false, message: 'IO hazır değil' });
  const { message, type = 'announcement' } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'Mesaj gerekli' });
  _io.emit('gameEvent', {
    id: Date.now(),
    type,
    title: '📢 Duyuru',
    message,
    from: req.user.username,
    timestamp: Date.now(),
  });
  _io.emit('serverAction', { key: 'announcement', value: { text: message, from: req.user.username, ts: Date.now() } });
  logger.info(`BROADCAST by ${req.user.username}: ${message}`);
  res.json({ success: true, message: 'Duyuru gönderildi' });
});

// Ekonomiyi güncelle (socket ile tüm oyunculara yansıt)
router.post('/economy', adminMiddleware, (req, res) => {
  if (!_io) return res.json({ success: false, message: 'IO hazır değil' });
  const { inflation, treasury, taxRate, interestRate } = req.body;
  const update = {};
  if (inflation !== undefined) update.inflation = parseFloat(inflation);
  if (treasury !== undefined) update.treasury = parseInt(treasury);
  if (taxRate !== undefined) update.taxRate = parseFloat(taxRate);
  if (interestRate !== undefined) update.interestRate = parseFloat(interestRate);
  update.lastUpdate = Date.now();
  _io.emit('economyUpdate', update);
  logger.info(`Economy update by ${req.user.username}:`, update);
  res.json({ success: true, update });
});

// Kullanıcıya para ver / kes
router.post('/users/:userId/money', adminMiddleware, async (req, res) => {
  try {
    if (!getConnectionStatus()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { amount, operation = 'add', reason = 'Admin işlemi' } = req.body;
    const amt = parseInt(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Geçerli miktar girin' });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    const oldMoney = user.money || 0;
    const newMoney = operation === 'set' ? amt
      : operation === 'remove' ? Math.max(0, oldMoney - amt)
      : oldMoney + amt;

    await User.findByIdAndUpdate(req.params.userId, { money: newMoney });

    // Notify target player via socket if online
    if (_io && user.socketId) {
      _io.to(user.socketId).emit('moneyUpdate', {
        money: newMoney,
        delta: newMoney - oldMoney,
        reason,
        from: 'admin',
        timestamp: Date.now(),
      });
    }

    logger.info(`MONEY ${operation.toUpperCase()} ${amt} → ${user.username} (by ${req.user.username}): ${oldMoney} → ${newMoney}`);
    res.json({ success: true, username: user.username, oldMoney, newMoney, delta: newMoney - oldMoney });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Kullanıcıya UC ver
router.post('/users/:userId/coins', adminMiddleware, async (req, res) => {
  try {
    if (!getConnectionStatus()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { amount, operation = 'add' } = req.body;
    const amt = parseInt(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Geçerli miktar girin' });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    const oldCoins = user.underCoin || 0;
    const newCoins = operation === 'remove' ? Math.max(0, oldCoins - amt) : oldCoins + amt;
    await User.findByIdAndUpdate(req.params.userId, { underCoin: newCoins });

    if (_io && user.socketId) {
      _io.to(user.socketId).emit('coinsUpdate', { underCoin: newCoins, delta: newCoins - oldCoins, from: 'admin', timestamp: Date.now() });
    }

    logger.info(`COINS ${operation} ${amt} → ${user.username} (by ${req.user.username})`);
    res.json({ success: true, username: user.username, oldCoins, newCoins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Herkese para dağıt
router.post('/users/bulk/money', adminMiddleware, async (req, res) => {
  try {
    if (!getConnectionStatus()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { amount, operation = 'add', excludeAdmins = true } = req.body;
    const amt = parseInt(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Geçerli miktar girin' });

    const query = excludeAdmins ? { role: { $ne: 'admin' } } : {};
    let updateOp;
    if (operation === 'add') updateOp = { $inc: { money: amt } };
    else if (operation === 'remove') updateOp = { $inc: { money: -amt } };
    else return res.status(400).json({ success: false, message: 'Geçersiz işlem' });

    const result = await User.updateMany(query, updateOp);

    // Notify all online players
    if (_io) {
      _io.emit('moneyUpdate', {
        delta: operation === 'add' ? amt : -amt,
        reason: `Admin toplu işlemi (${operation === 'add' ? '+' : '-'}${amt})`,
        bulk: true,
        from: 'admin',
        timestamp: Date.now(),
      });
    }

    logger.info(`BULK MONEY ${operation} ${amt} → ${result.modifiedCount} users (by ${req.user.username})`);
    res.json({ success: true, affected: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Server health (public)
router.get('/health', (req, res) => {
  const stats = monitoring.getStats(roomManager.getAllRooms().length);
  const online = getOnlineGamePlayers();
  res.json({
    status: 'OK',
    db: getConnectionStatus() ? 'connected' : 'disconnected',
    online: online.length,
    uptime: stats.uptimeFormatted,
    peak: stats.peakOnline,
  });
});

module.exports = { router, setIO };
