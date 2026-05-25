const { socketAuthMiddleware } = require('../middleware/authMiddleware');
const { registerChatHandlers, cleanupChatRates } = require('./chatHandler');
const { registerPlayerHandlers, removePlayer, getOnlinePlayers } = require('./playerHandler');
const { registerRoomHandlers } = require('./roomHandler');
const { registerGameHandlers, removeGamePlayer } = require('./gameHandler');
const { createSocketRateLimitMiddleware, cleanupSocket: cleanupSocketRL } = require('../middleware/socketRateLimiter');
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
      if (socket.userId && data?.userId) {
        socket.userId   = data.userId   || socket.userId;
        socket.username = data.username || socket.username;
      }
    });

    socket.on('ping', (cb) => {
      if (typeof cb === 'function') cb({ time: Date.now() });
    });

    // ── Çete varlık saldırısı (manuel, lider/yönetici başlatır) ────────────
    socket.on('gang:attackAsset', (data) => {
      if (!socket.userId || !data) return;
      try {
        const payloadSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
        if (payloadSize > 4096) return;
      } catch { return; }
      if (typeof data.assetId !== 'string' || typeof data.assetName !== 'string') return;
      const payload = {
        attackId:   `atk_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        assetId:    String(data.assetId).slice(0, 64),
        assetName:  String(data.assetName).slice(0, 80),
        assetType:  String(data.assetType || 'asset').slice(0, 20),
        familyId:   String(data.familyId  || '').slice(0, 64),
        familyName: String(data.familyName|| '').slice(0, 80),
        gangId:     String(data.gangId    || '').slice(0, 64),
        gangName:   String(data.gangName  || '').slice(0, 80),
        attacker:   socket.username || 'Bilinmeyen',
        timestamp:  Date.now(),
      };
      io.emit('gang:assetAttacked', payload);
      logger.info(`[Attack] ${socket.username} → "${payload.assetName}" (${payload.familyName})`);
    });

    socket.on('disconnect', async (reason) => {
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
