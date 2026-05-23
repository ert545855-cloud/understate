const { socketAuthMiddleware } = require('../middleware/authMiddleware');
const { registerChatHandlers, cleanupChatRates } = require('./chatHandler');
const { registerPlayerHandlers, removePlayer, getOnlinePlayers } = require('./playerHandler');
const { registerRoomHandlers } = require('./roomHandler');
const { registerGameHandlers, removeGamePlayer } = require('./gameHandler');
const { createSocketRateLimitMiddleware, cleanupSocket: cleanupSocketRL } = require('../middleware/socketRateLimiter');
const roomManager = require('../rooms/roomManager');
const { saveUser, saveUserFull, startAutosave } = require('../services/saveService');
const { startMonitoringLog } = require('../services/monitoringService');
const monitoring = require('../services/monitoringService');
const antiCheat = require('../utils/antiCheat');
const logger = require('../utils/logger');
const { getConnectionStatus } = require('../database/connection');

let _User;
function _getUser() {
  if (!_User) _User = require('../models/User');
  return _User;
}

function initSocket(io) {
  // Auth middleware
  io.use(socketAuthMiddleware);

  // Socket-level rate limiter (her event öncesi çalışır)
  io.use(createSocketRateLimitMiddleware(['ping', 'disconnect', 'connect', 'chatHistory']));

  io.on('connection', (socket) => {
    monitoring.increment('connectedSockets');
    monitoring.increment('totalConnections');
    logger.socket('connected', socket.id, `user=${socket.username || 'guest'}`);
    io.emit('onlineCount', monitoring.getStats().connectedSockets);

    // Kullanıcı bağlandığında isOnline=true, socketId güncelle
    if (socket.userId && getConnectionStatus()) {
      _getUser().findByIdAndUpdate(socket.userId, {
        isOnline: true,
        socketId: socket.id,
      }).catch(() => {});
    }

    registerChatHandlers(io, socket);
    registerPlayerHandlers(io, socket);
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);

    // State senkronizasyonu (oyun verisi güncelleme)
    socket.on('syncGameData', (data) => {
      if (!socket.userId || !data) return;
      const { scheduleSave } = require('../services/saveService');
      scheduleSave(socket.userId, data);
    });

    // State update (anlık profil alanları)
    socket.on('stateUpdate', (data) => {
      if (!socket.userId || !data) return;
      if (getConnectionStatus()) {
        const allowed = ['level','xp','money','bankMoney','hp','score','city','position',
                         'educationLevel','educationProgress','inventory','equippedItems',
                         'holdings','gameData','underCoin','creditScore','meritPoints','loyaltyPoints'];
        const update = {};
        for (const k of allowed) {
          if (data[k] !== undefined) update[k] = data[k];
        }
        if (Object.keys(update).length) {
          _getUser().findByIdAndUpdate(socket.userId, update).catch(() => {});
        }
      }
    });

    // Logout senkronizasyonu — isOnline=false + socketId temizle
    socket.on('userLogout', async () => {
      if (socket.userId && getConnectionStatus()) {
        await _getUser().findByIdAndUpdate(socket.userId, {
          isOnline: false,
          socketId: null,
          refreshToken: null,
        }).catch(() => {});
        logger.info(`[Socket] Logout sync: ${socket.username}`);
      }
    });

    // Token yenileme durumu bildirimi
    socket.on('tokenRefreshed', (data) => {
      if (socket.userId && data?.userId) {
        socket.userId   = data.userId   || socket.userId;
        socket.username = data.username || socket.username;
      }
    });

    socket.on('ping', (cb) => {
      if (typeof cb === 'function') cb({ time: Date.now() });
    });

    socket.on('disconnect', async (reason) => {
      monitoring.decrement('connectedSockets');
      monitoring.increment('totalDisconnections');
      logger.socket('disconnected', socket.id, `reason=${reason}`);

      // isOnline=false + socketId temizle
      if (socket.userId && getConnectionStatus()) {
        await _getUser().findByIdAndUpdate(socket.userId, {
          isOnline: false,
          socketId: null,
        }).catch(() => {});
      }

      // Oda yönetimi
      const room = roomManager.getPlayerRoom(socket.id);
      if (room) {
        roomManager.leaveRoom(room.roomId, socket.id);
        io.to(`room_${room.roomId}`).emit('playerLeft', {
          socketId: socket.id,
          username: socket.username,
        });
      }
      roomManager.handleDisconnect(socket.id, {
        userId: socket.userId,
        username: socket.username,
        roomId: room?.roomId,
      });

      removePlayer(socket.id);
      removeGamePlayer(socket.id, io);
      antiCheat.cleanupPlayer(socket.id);
      cleanupChatRates(socket.id);
      cleanupSocketRL(socket.id);

      // Son kayıt
      if (socket.userId) {
        await saveUser(socket.userId, { lastSeen: Date.now() }).catch(() => {});
      }

      socket.broadcast.emit('playerDisconnected', { socketId: socket.id });
      io.emit('onlineCount', monitoring.getStats().connectedSockets);
    });
  });

  startAutosave(io, getOnlinePlayers);
  startMonitoringLog(io, () => roomManager.getAllRooms().length);
  logger.success('Socket.IO başlatıldı');
  return io;
}

module.exports = { initSocket };
