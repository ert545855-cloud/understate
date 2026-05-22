const { socketAuthMiddleware } = require('../middleware/authMiddleware');
const { registerChatHandlers } = require('./chatHandler');
const { registerPlayerHandlers, removePlayer, getOnlinePlayers } = require('./playerHandler');
const { registerRoomHandlers } = require('./roomHandler');
const { registerGameHandlers, removeGamePlayer } = require('./gameHandler');
const roomManager = require('../rooms/roomManager');
const { saveUser, startAutosave } = require('../services/saveService');
const { startMonitoringLog } = require('../services/monitoringService');
const monitoring = require('../services/monitoringService');
const antiCheat = require('../utils/antiCheat');
const logger = require('../utils/logger');

function initSocket(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    monitoring.increment('connectedSockets');
    monitoring.increment('totalConnections');

    logger.socket('connected', socket.id, `user=${socket.username || 'guest'}`);

    io.emit('onlineCount', monitoring.getStats().connectedSockets);

    registerChatHandlers(io, socket);
    registerPlayerHandlers(io, socket);
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);

    socket.on('syncGameData', (data) => {
      if (socket.userId && data) {
        const { scheduleSave } = require('../services/saveService');
        scheduleSave(socket.userId, data);
      }
    });

    socket.on('ping', (cb) => {
      if (typeof cb === 'function') cb({ time: Date.now() });
    });

    socket.on('disconnect', async (reason) => {
      monitoring.decrement('connectedSockets');
      monitoring.increment('totalDisconnections');

      logger.socket('disconnected', socket.id, `reason=${reason}`);

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

      if (socket.userId) {
        await saveUser(socket.userId, { lastSeen: Date.now() });
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
