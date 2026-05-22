const roomManager = require('../rooms/roomManager');
const { validatePacket, sanitizeString } = require('../middleware/sanitize');
const logger = require('../utils/logger');

function registerRoomHandlers(io, socket) {
  socket.on('createRoom', (data, callback) => {
    if (!validatePacket(data, ['name'])) {
      return callback && callback({ success: false, message: 'Oda adı gerekli' });
    }

    const name = sanitizeString(data.name).slice(0, 50);
    const maxPlayers = Math.min(data.maxPlayers || 20, 50);
    const room = roomManager.createRoom(name, socket.username || socket.id, maxPlayers);

    const result = roomManager.joinRoom(room.roomId, {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username || 'Misafir',
    });

    socket.join(`room_${room.roomId}`);
    io.emit('roomList', roomManager.getAllRooms());
    callback && callback({ success: true, room: result.room });
  });

  socket.on('joinRoom', (data, callback) => {
    if (!validatePacket(data, ['roomId'])) {
      return callback && callback({ success: false, message: 'Room ID gerekli' });
    }

    const existingRoom = roomManager.getPlayerRoom(socket.id);
    if (existingRoom) {
      roomManager.leaveRoom(existingRoom.roomId, socket.id);
      socket.leave(`room_${existingRoom.roomId}`);
    }

    const result = roomManager.joinRoom(data.roomId, {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username || 'Misafir',
    });

    if (!result.success) {
      return callback && callback(result);
    }

    socket.join(`room_${data.roomId}`);
    io.to(`room_${data.roomId}`).emit('playerJoined', {
      socketId: socket.id,
      username: socket.username,
      room: result.room,
    });
    io.emit('roomList', roomManager.getAllRooms());
    callback && callback(result);
  });

  socket.on('leaveRoom', (data, callback) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (room) {
      roomManager.leaveRoom(room.roomId, socket.id);
      socket.leave(`room_${room.roomId}`);
      io.to(`room_${room.roomId}`).emit('playerLeft', {
        socketId: socket.id,
        username: socket.username,
      });
      io.emit('roomList', roomManager.getAllRooms());
    }
    callback && callback({ success: true });
  });

  socket.on('getRooms', (callback) => {
    callback && callback({ success: true, rooms: roomManager.getAllRooms() });
  });

  socket.on('reconnectToRoom', (data, callback) => {
    if (!data || !data.oldSocketId) return callback && callback({ success: false });
    const playerData = roomManager.handleReconnect(data.oldSocketId, socket.id);
    if (playerData && playerData.roomId) {
      socket.join(`room_${playerData.roomId}`);
      io.to(`room_${playerData.roomId}`).emit('playerReconnected', {
        socketId: socket.id,
        username: playerData.username,
      });
      callback && callback({ success: true, playerData });
    } else {
      callback && callback({ success: false, message: 'Reconnect verisi bulunamadı' });
    }
  });
}

module.exports = { registerRoomHandlers };
