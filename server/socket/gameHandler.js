const logger = require('../utils/logger');
const monitoring = require('../services/monitoringService');
const { SOCKET_EVENT_RATE_LIMIT, SOCKET_EVENT_RATE_WINDOW, MAX_SOCKET_PAYLOAD_BYTES } = require('../config/constants');

const onlinePlayers = new Map();

// Per-socket event rate limiter
const socketEventRates = new Map();
function checkEventRate(socketId) {
  const now = Date.now();
  const r   = socketEventRates.get(socketId) || { count: 0, windowStart: now };
  if (now - r.windowStart > SOCKET_EVENT_RATE_WINDOW) { r.count = 1; r.windowStart = now; }
  else { r.count++; }
  socketEventRates.set(socketId, r);
  return r.count <= SOCKET_EVENT_RATE_LIMIT;
}

// Payload size guard
function isPayloadSafe(data) {
  try { return Buffer.byteLength(JSON.stringify(data), 'utf8') <= MAX_SOCKET_PAYLOAD_BYTES; }
  catch { return false; }
}

// Whitelist-only stateUpdate keys
const ALLOWED_STATE_KEYS = new Set(['key','value','userId','timestamp','type','city','position','level','xp','hp','party','gang','job','action']);
function sanitizeStateUpdate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (!data.key || typeof data.key !== 'string' || data.key.length > 64) return null;
  const safe = {};
  for (const k of ALLOWED_STATE_KEYS) { if (data[k] !== undefined) safe[k] = data[k]; }
  return safe;
}

function registerGameHandlers(io, socket) {
  // Push market + economy on connect
  try {
    const { getMarketSnapshot, getEconomyState } = require('../services/gameEngine');
    setTimeout(() => { socket.emit('marketSnapshot', getMarketSnapshot()); socket.emit('economyUpdate', getEconomyState()); }, 500);
  } catch(e) {}

  socket.on('playerJoin', (data) => {
    if (!data || !data.userId) return;
    const player = {
      socketId: socket.id, userId: data.userId,
      username: typeof data.username === 'string' ? data.username.slice(0,20) : 'Oyuncu',
      level: Number(data.level) || 1,
      city: typeof data.city === 'string' ? data.city.slice(0,30) : '',
      gender: data.gender || 'erkek', party: data.party || null, gang: data.gang || null,
      avatar: data.avatar || null, joinedAt: Date.now(),
    };
    onlinePlayers.set(socket.id, player);
    socket.userId = data.userId; socket.username = player.username;
    const list = Array.from(onlinePlayers.values());
    io.emit('onlinePlayers', list); io.emit('onlineCount', list.length);
    logger.socket('playerJoin', socket.id, `user=${player.username} city=${player.city}`);
  });

  socket.on('requestOnlinePlayers', () => {
    const list = Array.from(onlinePlayers.values());
    socket.emit('onlinePlayers', list); socket.emit('onlineCount', list.length);
  });

  socket.on('updatePresence', (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    const player = onlinePlayers.get(socket.id);
    if (player) {
      if (data.level !== undefined) player.level = Number(data.level) || player.level;
      if (data.city  !== undefined) player.city  = String(data.city).slice(0,30);
      if (data.party !== undefined) player.party = data.party;
      if (data.gang  !== undefined) player.gang  = data.gang;
      io.emit('onlinePlayers', Array.from(onlinePlayers.values()));
    }
  });

  // Validated + rate-limited state relay
  socket.on('stateUpdate', (data) => {
    if (!checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    const safe = sanitizeStateUpdate(data);
    if (!safe) return;
    socket.broadcast.emit('stateUpdate', safe);
  });

  socket.on('gameEvent', (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    io.emit('gameEvent', { type: typeof data.type==='string'?data.type.slice(0,40):'generic', payload: data.payload, fromSocket: socket.id, timestamp: Date.now() });
    monitoring.increment('playerUpdates');
  });

  socket.on('economyUpdate', (data) => { if (!data || !checkEventRate(socket.id)) return; socket.broadcast.emit('economyUpdate', data); });
  socket.on('marketUpdate',  (data) => { if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return; io.emit('marketUpdate', data); });
  socket.on('marketSnapshot',(data) => { if (!data || !checkEventRate(socket.id)) return; socket.broadcast.emit('marketSnapshot', data); });
  socket.on('partyUpdate',   (data) => { if (!data || !checkEventRate(socket.id)) return; io.emit('partyUpdate', data); });
  socket.on('gangUpdate',    (data) => { if (!data || !checkEventRate(socket.id)) return; io.emit('gangUpdate', data); });
  socket.on('electionUpdate',(data) => { if (!data || !checkEventRate(socket.id)) return; io.emit('electionUpdate', data); });
  socket.on('electionResult',(data) => { if (!data || !checkEventRate(socket.id)) return; io.emit('electionResult', data); });
  socket.on('combatResult',  (data) => { if (!data || !checkEventRate(socket.id)) return; io.emit('combatResult', data); });
  socket.on('cityOwnershipUpdate', (data) => { if (!data || !checkEventRate(socket.id)) return; io.emit('cityOwnershipUpdate', data); });
  socket.on('mafiaWarUpdate',(data) => { if (!data || !checkEventRate(socket.id)) return; io.emit('mafiaWarUpdate', data); });
  socket.on('serverAction',  (data) => { if (!data || !checkEventRate(socket.id)) return; io.emit('serverAction', data); });

  socket.on('inventoryUpdate', (data) => {
    if (!data || !checkEventRate(socket.id)) return;
    if (data.targetUserId) {
      const t = Array.from(onlinePlayers.values()).find(p => p.userId === data.targetUserId);
      if (t) io.to(t.socketId).emit('inventoryUpdate', data);
    } else { socket.broadcast.emit('inventoryUpdate', data); }
  });

  socket.on('tradeOffer', (data) => {
    if (!data || !data.targetUserId || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    const t = Array.from(onlinePlayers.values()).find(p => p.userId === data.targetUserId);
    if (t) io.to(t.socketId).emit('tradeOffer', { ...data, fromSocketId: socket.id });
  });

  socket.on('tradeResponse', (data) => {
    if (!data || !data.targetSocketId) return;
    io.to(data.targetSocketId).emit('tradeResponse', data);
  });

  socket.on('dm', (data) => {
    if (!data || !data.targetUserId || !checkEventRate(socket.id)) return;
    if (!data.message || typeof data.message !== 'string') return;
    const t = Array.from(onlinePlayers.values()).find(p => p.userId === data.targetUserId);
    if (t) io.to(t.socketId).emit('dm', { message: data.message.slice(0,500), fromSocketId: socket.id, fromUsername: socket.username || data.fromUsername, timestamp: Date.now() });
  });

  socket.on('broadcast', (data) => {
    if (!data || !checkEventRate(socket.id) || !isPayloadSafe(data)) return;
    socket.broadcast.emit('broadcast', data);
  });
}

function removeGamePlayer(socketId, io) {
  onlinePlayers.delete(socketId);
  socketEventRates.delete(socketId);
  const list = Array.from(onlinePlayers.values());
  io.emit('onlinePlayers', list);
  io.emit('onlineCount', list.length);
}

function getOnlineGamePlayers() { return Array.from(onlinePlayers.values()); }

module.exports = { registerGameHandlers, removeGamePlayer, getOnlineGamePlayers };
