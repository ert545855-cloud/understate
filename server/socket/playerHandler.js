const antiCheat = require('../utils/antiCheat');
const { validatePacket } = require('../middleware/sanitize');
const monitoring = require('../services/monitoringService');
const { scheduleSave } = require('../services/saveService');
const logger = require('../utils/logger');
const { onlinePlayers } = require('./onlineStore');

function registerPlayerHandlers(io, socket) {
  socket.on('playerUpdate', (data) => {
    if (!validatePacket(data, ['action'])) return;
    if (!antiCheat.checkPacketRate(socket.id)) return;
    if (data.packetId && antiCheat.checkDuplicatePacket(socket.id, data.packetId)) return;

    if (data.action === 'move' && data.position) {
      const oldPos = antiCheat.getPlayerPosition(socket.id);
      const newPos = { ...data.position, timestamp: Date.now() };

      if (!antiCheat.validateMovement(socket.id, newPos, oldPos)) {
        socket.emit('error', { code: 'CHEAT', message: 'Geçersiz hareket' });
        return;
      }

      antiCheat.setPlayerPosition(socket.id, newPos);
    }

    if (socket.userId && data.gameData) {
      scheduleSave(socket.userId, data.gameData);
    }

    const playerState = onlinePlayers.get(socket.id) || {};
    Object.assign(playerState, {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
      lastUpdate: Date.now(),
      ...data,
    });
    onlinePlayers.set(socket.id, playerState);

    // Aynı şehirdeki oyunculara ilet
    const myCity = (onlinePlayers.get(socket.id) || {}).city || '';
    const payload = {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
      action: data.action,
      data: data.data,
      position: data.position,
      animation: data.animation,
      health: data.health,
      timestamp: Date.now(),
    };
    if (myCity) {
      for (const [sid, p] of onlinePlayers.entries()) {
        if (sid !== socket.id && p.city === myCity) {
          const tgt = io.sockets.sockets.get(sid);
          if (tgt) tgt.emit('playerUpdate', payload);
        }
      }
    } else {
      socket.broadcast.emit('playerUpdate', payload);
    }

    monitoring.increment('playerUpdates');
  });

  socket.on('requestPlayers', () => {
    const players = Array.from(onlinePlayers.values()).map((p) => ({
      socketId: p.socketId,
      userId: p.userId,
      username: p.username,
      position: p.position,
      health: p.health,
    }));
    socket.emit('currentPlayers', players);
  });
}

function removePlayer(socketId) {
  onlinePlayers.delete(socketId);
}

function getOnlinePlayers() {
  const result = {};
  for (const [sid, p] of onlinePlayers.entries()) {
    if (p.userId) result[p.userId] = p;
  }
  return result;
}

module.exports = { registerPlayerHandlers, removePlayer, getOnlinePlayers };
