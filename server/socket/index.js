const { socketAuthMiddleware } = require('../middleware/authMiddleware');
const { registerChatHandlers, cleanupChatRates } = require('./chatHandler');
const { registerPlayerHandlers, removePlayer, getOnlinePlayers } = require('./playerHandler');
const { registerRoomHandlers } = require('./roomHandler');
const { registerGameHandlers, removeGamePlayer } = require('./gameHandler');
const { createSocketRateLimitMiddleware, cleanupSocket: cleanupSocketRL, checkSocketRate } = require('../middleware/socketRateLimiter');
const roomManager = require('../rooms/roomManager');
const { saveUser, startAutosave } = require('../services/saveService');
const { startMonitoringLog } = require('../services/monitoringService');
const monitoring = require('../services/monitoringService');
const antiCheat = require('../utils/antiCheat');
const logger = require('../utils/logger');
const sb = require('../services/supabaseService');

function getConnectionStatus() { return sb.isReady(); }

function initSocket(io) {
  io.use(socketAuthMiddleware);
  io.use(createSocketRateLimitMiddleware(['ping', 'disconnect', 'connect', 'chatHistory']));

  io.on('connection', (socket) => {
    monitoring.increment('connectedSockets');
    monitoring.increment('totalConnections');
    logger.socket('connected', socket.id, `user=${socket.username || 'guest'}`);
    io.emit('onlineCount', monitoring.getStats().connectedSockets);

    if (socket.userId && sb.isReady()) {
      sb.updateUser(socket.userId, { is_online: true, socket_id: socket.id }).catch(() => {});
    }

    // JWT'den kimlik doğrulanmış kullanıcıları anında onlinePlayers'a ekle
    // (playerJoin gelmeden önce de diğer oyuncular görebilsin)
    if (socket.userId) {
      const { getOnlineGamePlayers, removeGamePlayer } = require('./gameHandler');
      // gameHandler'ın onlinePlayers map'ine erişmek için playerJoin benzeri kayıt
      // playerJoin gelince üzerine yazılır (daha fazla detayla)
      socket.emit('requestOnlinePlayers');
    }

    registerChatHandlers(io, socket);
    registerPlayerHandlers(io, socket);
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);

    // State senkronizasyonu (oyun verisi güncelleme)
    socket.on('syncGameData', (data) => {
      if (!socket.userId || !data) return;
      if (!checkSocketRate(socket.id, 'syncGameData')) {
        socket.emit('rateLimited', { code: 'SOCKET_RATE_LIMIT', event: 'syncGameData', message: 'Çok hızlı kayıt isteği.' });
        return;
      }
      const { scheduleSave } = require('../services/saveService');
      scheduleSave(socket.userId, data);
    });

    // State update (anlık profil alanları)
    socket.on('stateUpdate', (data) => {
      if (!socket.userId || !data) return;
      if (!checkSocketRate(socket.id, 'stateUpdate')) {
        socket.emit('rateLimited', { code: 'SOCKET_RATE_LIMIT', event: 'stateUpdate', message: 'Çok hızlı güncelleme.' });
        return;
      }
      if (getConnectionStatus()) {
        const { scheduleSave } = require('../services/saveService');
        scheduleSave(socket.userId, data);
      }
    });

    // Logout senkronizasyonu — isOnline=false + socketId temizle
    socket.on('userLogout', async () => {
      if (socket.userId && getConnectionStatus()) {
        await sb.updateUser(socket.userId, {
          is_online: false,
          socket_id: null,
          refresh_token: null,
        }).catch(() => {});
        logger.info(`[Socket] Logout sync: ${socket.username}`);
      }
    });

    // Token yenileme durumu bildirimi
    socket.on('tokenRefreshed', (data) => {
      if (data?.userId) {
        socket.userId   = data.userId   || socket.userId;
        socket.username = data.username || socket.username;
        if (getConnectionStatus()) {
          sb.updateUser(socket.userId, { is_online: true, socket_id: socket.id }).catch(() => {});
        }
      }
    });

    socket.on('ping', (cb) => {
      if (typeof cb === 'function') cb({ time: Date.now() });
    });

    // #18 Direct Message via socket (real-time delivery)
    socket.on('dm:send', async (data) => {
      if (!socket.userId || !data?.to || !data?.message) return;
      const dmSvc = require('../services/dmService');
      const result = await dmSvc.sendDM(socket.userId, data.to, data.message);
      if (result.ok) {
        // Deliver to receiver if online
        const { getOnlineGamePlayers } = require('./gameHandler');
        const online = getOnlineGamePlayers();
        const receiver = online.find(p => p.id === result.receiverId || p.userId === result.receiverId);
        if (receiver?.socketId) {
          const targetSocket = io.sockets.sockets.get(receiver.socketId);
          if (targetSocket) {
            targetSocket.emit('dm:received', {
              from: socket.username,
              fromId: socket.userId,
              message: data.message,
              timestamp: result.timestamp,
              id: result.id,
            });
          }
        }
        socket.emit('dm:sent', { ok: true, id: result.id });
      } else {
        socket.emit('dm:sent', { ok: false, message: result.message });
      }
    });

    // #5 — Heartbeat timeout: force-disconnect sockets silent for >90s
    const heartbeatTimer = setTimeout(() => {
      if (!socket.connected) return;
      logger.warn(`[Socket] Heartbeat timeout: ${socket.id} (${socket.username || 'guest'}) — bağlantı kesiliyor`);
      socket.disconnect(true);
    }, 2 * 60 * 1000); // 2 dakika (gameHandler'daki 45s stale cleaner ile uyumlu)
    socket.on('heartbeat', () => heartbeatTimer.refresh());
    socket.on('ping',      () => heartbeatTimer.refresh());

    socket.on('disconnect', async (reason) => {
      clearTimeout(heartbeatTimer);
      monitoring.decrement('connectedSockets');
      monitoring.increment('totalDisconnections');
      logger.socket('disconnected', socket.id, `reason=${reason}`);

      // isOnline=false + socketId temizle
      if (socket.userId && getConnectionStatus()) {
        await sb.updateUser(socket.userId, {
          is_online: false,
          socket_id: null,
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
