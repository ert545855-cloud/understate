const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../middleware/adminMiddleware');
const sb = require('../services/supabaseService');
const { getConnectionStatus, getConnectionDetails } = require('../database/connection');
const monitoring = require('../services/monitoringService');
const roomManager = require('../rooms/roomManager');
const { getOnlineGamePlayers } = require('../socket/gameHandler');
const logger = require('../utils/logger');

let _io = null;
function setIO(io) { _io = io; }

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const stats = monitoring.getStats(roomManager.getAllRooms().length);
    const onlinePlayers = getOnlineGamePlayers();
    let totalUsers = 0, bannedUsers = 0;
    if (sb.isReady()) {
      const admin = sb.getAdmin();
      const [r1, r2] = await Promise.all([
        admin.from('users').select('*', { count: 'exact', head: true }),
        admin.from('users').select('*', { count: 'exact', head: true }).eq('banned', true),
      ]);
      totalUsers = r1.count || 0; bannedUsers = r2.count || 0;
    }
    res.json({ success: true, stats: { ...stats, totalUsers, bannedUsers, onlinePlayers: onlinePlayers.length, onlineList: onlinePlayers, rooms: roomManager.getAllRooms(), dbDetails: getConnectionDetails() } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/users', adminMiddleware, async (req, res) => {
  try {
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const page = parseInt(req.query.page) || 1, limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const admin = sb.getAdmin();
    let q = admin.from('users').select('id,username,email,role,banned,ban_reason,level,xp,money,created_at,is_online', { count: 'exact' });
    if (search) q = q.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, count, error } = await q.order('created_at', { ascending: false }).range((page-1)*limit, page*limit-1);
    if (error) throw error;
    res.json({ success: true, users: data, total: count, page, pages: Math.ceil((count||0)/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/ban/:userId', adminMiddleware, async (req, res) => {
  try {
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { reason = 'Kural ihlali' } = req.body;
    const user = await sb.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    await sb.updateUser(user.id, { banned: true, ban_reason: reason });
    if (_io && user.socket_id) { _io.to(user.socket_id).emit('banned', { reason }); _io.sockets.sockets.get(user.socket_id)?.disconnect(true); }
    logger.warn(`BAN: ${user.username} — ${reason} (by ${req.user.username})`);
    res.json({ success: true, message: `${user.username} banlandı` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/unban/:userId', adminMiddleware, async (req, res) => {
  try {
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const user = await sb.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    await sb.updateUser(user.id, { banned: false, ban_reason: '' });
    logger.info(`UNBAN: ${user.username} (by ${req.user.username})`);
    res.json({ success: true, message: `${user.username} banı kaldırıldı` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/kick/:socketId', adminMiddleware, (req, res) => {
  if (!_io) return res.json({ success: false, message: 'IO hazır değil' });
  const { reason = 'Admin tarafından çıkarıldı' } = req.body;
  const sock = _io.sockets.sockets.get(req.params.socketId);
  if (!sock) return res.status(404).json({ success: false, message: 'Oyuncu bulunamadı' });
  sock.emit('kicked', { reason }); sock.disconnect(true);
  logger.warn(`KICK: ${req.params.socketId} — ${reason} (by ${req.user.username})`);
  res.json({ success: true, message: 'Oyuncu çıkarıldı' });
});

router.post('/broadcast', adminMiddleware, (req, res) => {
  if (!_io) return res.json({ success: false, message: 'IO hazır değil' });
  const { message, type = 'announcement' } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'Mesaj gerekli' });
  _io.emit('gameEvent', { id: Date.now(), type, title: '📢 Duyuru', message, from: req.user.username, timestamp: Date.now() });
  _io.emit('serverAction', { key: 'announcement', value: { text: message, from: req.user.username, ts: Date.now() } });
  logger.info(`BROADCAST by ${req.user.username}: ${message}`);
  res.json({ success: true, message: 'Duyuru gönderildi' });
});

router.post('/economy', adminMiddleware, (req, res) => {
  if (!_io) return res.json({ success: false, message: 'IO hazır değil' });
  const { inflation, treasury, taxRate, interestRate } = req.body;
  const update = { lastUpdate: Date.now() };
  if (inflation    !== undefined) update.inflation    = parseFloat(inflation);
  if (treasury     !== undefined) update.treasury     = parseInt(treasury);
  if (taxRate      !== undefined) update.taxRate      = parseFloat(taxRate);
  if (interestRate !== undefined) update.interestRate = parseFloat(interestRate);
  _io.emit('economyUpdate', update);
  res.json({ success: true, update });
});

router.post('/users/:userId/money', adminMiddleware, async (req, res) => {
  try {
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { amount, operation = 'add', reason = 'Admin işlemi' } = req.body;
    const amt = parseInt(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Geçerli miktar girin' });
    const user = await sb.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    const oldMoney = user.money || 0;
    const newMoney = operation === 'set' ? amt : operation === 'remove' ? Math.max(0, oldMoney - amt) : oldMoney + amt;
    await sb.updateUser(user.id, { money: newMoney });
    if (_io && user.socket_id) _io.to(user.socket_id).emit('moneyUpdate', { money: newMoney, delta: newMoney - oldMoney, reason, from: 'admin', timestamp: Date.now() });
    res.json({ success: true, username: user.username, oldMoney, newMoney, delta: newMoney - oldMoney });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/users/:userId/coins', adminMiddleware, async (req, res) => {
  try {
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { amount, operation = 'add' } = req.body;
    const amt = parseInt(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Geçerli miktar girin' });
    const user = await sb.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    const oldCoins = user.under_coin || 0;
    const newCoins = operation === 'remove' ? Math.max(0, oldCoins - amt) : oldCoins + amt;
    await sb.updateUser(user.id, { under_coin: newCoins });
    if (_io && user.socket_id) _io.to(user.socket_id).emit('coinsUpdate', { underCoin: newCoins, delta: newCoins - oldCoins, from: 'admin', timestamp: Date.now() });
    res.json({ success: true, username: user.username, oldCoins, newCoins });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/users/bulk/money', adminMiddleware, async (req, res) => {
  try {
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { amount, operation = 'add', excludeAdmins = true } = req.body;
    const amt = parseInt(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Geçerli miktar girin' });
    const admin = sb.getAdmin();
    let q = admin.from('users').select('id,money');
    if (excludeAdmins) q = q.neq('role', 'admin');
    const { data: users } = await q;
    if (!users?.length) return res.json({ success: true, affected: 0 });
    const updates = users.map(u => ({ id: u.id, money: operation === 'remove' ? Math.max(0, (u.money||0) - amt) : (u.money||0) + amt }));
    const { error } = await admin.from('users').upsert(updates, { onConflict: 'id' });
    if (error) throw error;
    if (_io) _io.emit('moneyUpdate', { delta: operation === 'add' ? amt : -amt, reason: `Admin toplu`, bulk: true, from: 'admin', timestamp: Date.now() });
    res.json({ success: true, affected: updates.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/health', (req, res) => {
  const stats = monitoring.getStats(roomManager.getAllRooms().length);
  const online = getOnlineGamePlayers();
  res.json({ status: 'OK', db: getConnectionStatus() ? 'connected' : 'disconnected', online: online.length, uptime: stats.uptimeFormatted, peak: stats.peakOnline });
});

module.exports = { router, setIO };
