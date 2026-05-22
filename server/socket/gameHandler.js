const logger = require('../utils/logger');
const monitoring = require('../services/monitoringService');

const onlinePlayers = new Map();

function registerGameHandlers(io, socket) {

  // ── Yeni bağlanan oyuncuya anlık market + economy gönder ────────
  try {
    const { getMarketSnapshot, getEconomyState } = require('../services/gameEngine');
    setTimeout(() => {
      socket.emit('marketSnapshot', getMarketSnapshot());
      socket.emit('economyUpdate', getEconomyState());
    }, 500);
  } catch(e) {}

  // ── Oyuncu katılma ──────────────────────────────────────────────
  socket.on('playerJoin', (data) => {
    if (!data || !data.userId) return;
    const player = {
      socketId: socket.id,
      userId: data.userId,
      username: data.username || 'Oyuncu',
      level: data.level || 1,
      city: data.city || '',
      gender: data.gender || 'erkek',
      money: data.money || 0,
      party: data.party || null,
      gang: data.gang || null,
      avatar: data.avatar || null,
      joinedAt: Date.now(),
    };
    onlinePlayers.set(socket.id, player);
    socket.userId = data.userId;
    socket.username = data.username || 'Oyuncu';

    const list = Array.from(onlinePlayers.values());
    io.emit('onlinePlayers', list);
    io.emit('onlineCount', list.length);
    logger.socket('playerJoin', socket.id, `user=${player.username} city=${player.city}`);
  });

  // ── Online oyuncu listesi isteği ────────────────────────────────
  socket.on('requestOnlinePlayers', () => {
    const list = Array.from(onlinePlayers.values());
    socket.emit('onlinePlayers', list);
    socket.emit('onlineCount', list.length);
  });

  // ── Oyuncu profili güncelle (level, para vs.) ───────────────────
  socket.on('updatePresence', (data) => {
    if (!data) return;
    const player = onlinePlayers.get(socket.id);
    if (player) {
      Object.assign(player, {
        level: data.level || player.level,
        money: data.money || player.money,
        city: data.city || player.city,
        party: data.party !== undefined ? data.party : player.party,
        gang: data.gang !== undefined ? data.gang : player.gang,
      });
      io.emit('onlinePlayers', Array.from(onlinePlayers.values()));
    }
  });

  // ── Oyun state relay (Firebase yerine socket üzerinden) ─────────
  socket.on('stateUpdate', (data) => {
    if (!data || !data.key) return;
    socket.broadcast.emit('stateUpdate', data);
  });

  socket.on('gameEvent', (data) => {
    if (!data) return;
    io.emit('gameEvent', { ...data, fromSocket: socket.id });
    monitoring.increment('playerUpdates');
  });

  socket.on('economyUpdate', (data) => {
    if (!data) return;
    socket.broadcast.emit('economyUpdate', data);
  });

  socket.on('marketUpdate', (data) => {
    if (!data) return;
    io.emit('marketUpdate', data);
  });

  socket.on('marketSnapshot', (data) => {
    if (!data) return;
    socket.broadcast.emit('marketSnapshot', data);
  });

  socket.on('partyUpdate', (data) => {
    if (!data) return;
    io.emit('partyUpdate', data);
  });

  socket.on('gangUpdate', (data) => {
    if (!data) return;
    io.emit('gangUpdate', data);
  });

  socket.on('electionUpdate', (data) => {
    if (!data) return;
    io.emit('electionUpdate', data);
  });

  socket.on('electionResult', (data) => {
    if (!data) return;
    io.emit('electionResult', data);
  });

  socket.on('combatResult', (data) => {
    if (!data) return;
    io.emit('combatResult', data);
  });

  socket.on('cityOwnershipUpdate', (data) => {
    if (!data) return;
    io.emit('cityOwnershipUpdate', data);
  });

  socket.on('inventoryUpdate', (data) => {
    if (!data) return;
    if (data.targetUserId) {
      const target = Array.from(onlinePlayers.values()).find(p => p.userId === data.targetUserId);
      if (target) io.to(target.socketId).emit('inventoryUpdate', data);
    } else {
      socket.broadcast.emit('inventoryUpdate', data);
    }
  });

  socket.on('mafiaWarUpdate', (data) => {
    if (!data) return;
    io.emit('mafiaWarUpdate', data);
  });

  socket.on('serverAction', (data) => {
    if (!data) return;
    io.emit('serverAction', data);
  });

  socket.on('tradeOffer', (data) => {
    if (!data || !data.targetUserId) return;
    const target = Array.from(onlinePlayers.values()).find(p => p.userId === data.targetUserId);
    if (target) io.to(target.socketId).emit('tradeOffer', { ...data, fromSocketId: socket.id });
  });

  socket.on('tradeResponse', (data) => {
    if (!data || !data.targetSocketId) return;
    io.to(data.targetSocketId).emit('tradeResponse', data);
  });

  socket.on('dm', (data) => {
    if (!data || !data.targetUserId) return;
    const target = Array.from(onlinePlayers.values()).find(p => p.userId === data.targetUserId);
    if (target) {
      io.to(target.socketId).emit('dm', {
        ...data,
        fromSocketId: socket.id,
        fromUsername: socket.username || data.fromUsername,
      });
    }
  });

  // ── Broadcast (genel) ───────────────────────────────────────────
  socket.on('broadcast', (data) => {
    if (!data) return;
    socket.broadcast.emit('broadcast', data);
  });
}

function removeGamePlayer(socketId, io) {
  onlinePlayers.delete(socketId);
  const list = Array.from(onlinePlayers.values());
  io.emit('onlinePlayers', list);
  io.emit('onlineCount', list.length);
}

function getOnlineGamePlayers() {
  return Array.from(onlinePlayers.values());
}

module.exports = { registerGameHandlers, removeGamePlayer, getOnlineGamePlayers };
