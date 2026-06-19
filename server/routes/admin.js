const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../middleware/adminMiddleware');
const db = require('../services/dbService');
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
    if (db.isReady()) {
      const [r1, r2] = await Promise.all([
        db.query('SELECT COUNT(*) AS count FROM users'),
        db.query('SELECT COUNT(*) AS count FROM users WHERE banned = true'),
      ]);
      totalUsers = Number(r1.rows[0]?.count || 0);
      bannedUsers = Number(r2.rows[0]?.count || 0);
    }
    res.json({ success: true, stats: { ...stats, totalUsers, bannedUsers, onlinePlayers: onlinePlayers.length, onlineList: onlinePlayers, rooms: roomManager.getAllRooms(), dbDetails: getConnectionDetails() } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/users', adminMiddleware, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const page = parseInt(req.query.page) || 1, limit = parseInt(req.query.limit) || 50;
    const search = req.query.search ? `%${req.query.search}%` : null;
    const offset = (page - 1) * limit;

    const countQ = search
      ? await db.query('SELECT COUNT(*) AS count FROM users WHERE username ILIKE $1 OR email ILIKE $1', [search])
      : await db.query('SELECT COUNT(*) AS count FROM users');
    const total = Number(countQ.rows[0]?.count || 0);

    const dataQ = search
      ? await db.query(
          'SELECT id,username,email,role,banned,ban_reason,level,xp,money,created_at,is_online FROM users WHERE username ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
          [search, limit, offset]
        )
      : await db.query(
          'SELECT id,username,email,role,banned,ban_reason,level,xp,money,created_at,is_online FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
          [limit, offset]
        );

    res.json({ success: true, users: dataQ.rows, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/ban/:userId', adminMiddleware, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { reason = 'Kural ihlali' } = req.body;
    const user = await db.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    await db.query('UPDATE users SET banned = true, ban_reason = $1, updated_at = NOW() WHERE id = $2', [reason, user.id]);
    if (_io && user.socket_id) { _io.to(user.socket_id).emit('banned', { reason }); _io.sockets.sockets.get(user.socket_id)?.disconnect(true); }
    logger.warn(`BAN: ${user.username} — ${reason} (by ${req.user.username})`);
    res.json({ success: true, message: `${user.username} banlandı` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/unban/:userId', adminMiddleware, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const user = await db.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    await db.query('UPDATE users SET banned = false, ban_reason = $1, updated_at = NOW() WHERE id = $2', ['', user.id]);
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
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { amount, operation = 'add', reason = 'Admin işlemi' } = req.body;
    const amt = parseInt(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Geçerli miktar girin' });
    const user = await db.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    const oldMoney = user.money || 0;
    const newMoney = operation === 'set' ? amt : operation === 'remove' ? Math.max(0, oldMoney - amt) : oldMoney + amt;
    await db.updateUser(user.id, { money: newMoney });
    if (_io && user.socket_id) _io.to(user.socket_id).emit('moneyUpdate', { money: newMoney, delta: newMoney - oldMoney, reason, from: 'admin', timestamp: Date.now() });
    res.json({ success: true, username: user.username, oldMoney, newMoney, delta: newMoney - oldMoney });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/users/:userId/coins', adminMiddleware, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { amount, operation = 'add' } = req.body;
    const amt = parseInt(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Geçerli miktar girin' });
    const user = await db.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    const oldCoins = user.under_coin || 0;
    const newCoins = operation === 'remove' ? Math.max(0, oldCoins - amt) : oldCoins + amt;
    await db.updateUser(user.id, { under_coin: newCoins });
    if (_io && user.socket_id) _io.to(user.socket_id).emit('coinsUpdate', { underCoin: newCoins, delta: newCoins - oldCoins, from: 'admin', timestamp: Date.now() });
    res.json({ success: true, username: user.username, oldCoins, newCoins });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/users/bulk/money', adminMiddleware, async (req, res) => {
  try {
    if (!db.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const { amount, operation = 'add', excludeAdmins = true } = req.body;
    const amt = parseInt(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Geçerli miktar girin' });
    let sql, params;
    if (operation === 'add') {
      sql = excludeAdmins ? 'UPDATE users SET money = money + $1, updated_at = NOW() WHERE role != $2' : 'UPDATE users SET money = money + $1, updated_at = NOW()';
      params = excludeAdmins ? [amt, 'admin'] : [amt];
    } else {
      sql = excludeAdmins ? 'UPDATE users SET money = GREATEST(0, money - $1), updated_at = NOW() WHERE role != $2' : 'UPDATE users SET money = GREATEST(0, money - $1), updated_at = NOW()';
      params = excludeAdmins ? [amt, 'admin'] : [amt];
    }
    const result = await db.query(sql, params);
    const affected = result.rowCount || 0;
    if (_io) _io.emit('moneyUpdate', { delta: operation === 'add' ? amt : -amt, reason: 'Admin toplu', bulk: true, from: 'admin', timestamp: Date.now() });
    res.json({ success: true, affected });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/users/:userId/role', adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'user', 'vip'];
    if (!validRoles.includes(role)) return res.status(400).json({ success: false, message: 'Geçersiz rol' });
    if (!sb.isReady()) return res.json({ success: false, message: 'DB bağlı değil' });
    const user = await sb.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    await sb.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, user.id]);
    if (_io && user.socket_id) _io.to(user.socket_id).emit('roleUpdate', { role, from: 'admin', timestamp: Date.now() });
    res.json({ success: true, username: user.username, role });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/assign-position', adminMiddleware, async (req, res) => {
  try {
    const { userId, position, username } = req.body;
    if (!userId || !position) return res.status(400).json({ success: false, message: 'userId ve position zorunlu' });
    if (sb.isReady()) {
      const user = await sb.findUserById(userId);
      if (user) {
        await sb.updateUser(userId, { position });
        if (_io && user.socket_id) _io.to(user.socket_id).emit('positionUpdate', { position, from: 'admin', timestamp: Date.now() });
        if (_io) _io.emit('cabinetUpdate', { username: username || user.username, position, timestamp: Date.now() });
      }
    }
    res.json({ success: true, message: `${username || userId} → ${position} atandı` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/health', (req, res) => {
  const stats = monitoring.getStats(roomManager.getAllRooms().length);
  const online = getOnlineGamePlayers();
  res.json({ status: 'OK', db: getConnectionStatus() ? 'connected' : 'disconnected', online: online.length, uptime: stats.uptimeFormatted, peak: stats.peakOnline });
});

module.exports = { router, setIO };
