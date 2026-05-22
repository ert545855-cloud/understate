const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../middleware/adminMiddleware');
const User = require('../models/User');
const { getConnectionStatus } = require('../database/connection');
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
