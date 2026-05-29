const { v4: uuidv4 } = require('uuid');
const { MAX_PLAYERS_PER_ROOM, ROOM_CLEANUP_INTERVAL, MAX_RECONNECT_WAIT } = require('../config/constants');
const logger = require('../utils/logger');

const rooms = new Map();
const disconnectedPlayers = new Map();

function createRoom(name, host, maxPlayers = MAX_PLAYERS_PER_ROOM) {
  const roomId = uuidv4().slice(0, 8).toUpperCase();
  const room = {
    roomId,
    name,
    host,
    maxPlayers,
    players: new Map(),
    gameState: {},
    createdAt: Date.now(),
    isActive: true,
  };
  rooms.set(roomId, room);
  logger.info(`Oda oluşturuldu: ${roomId} (${name})`);
  return room;
}

function joinRoom(roomId, playerInfo) {
  const room = rooms.get(roomId);
  if (!room) return { success: false, message: 'Oda bulunamadı' };
  if (!room.isActive) return { success: false, message: 'Oda aktif değil' };
  if (room.players.size >= room.maxPlayers) return { success: false, message: 'Oda dolu' };

  room.players.set(playerInfo.socketId, {
    ...playerInfo,
    joinedAt: Date.now(),
    position: { x: 0, y: 0 },
    health: 100,
  });

  logger.info(`Oyuncu katıldı: ${playerInfo.username} -> ${roomId}`);
  return { success: true, room: getRoomPublic(roomId) };
}

function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const player = room.players.get(socketId);
  if (player) {
    room.players.delete(socketId);
    logger.info(`Oyuncu ayrıldı: ${player.username} <- ${roomId}`);
    if (room.players.size === 0 && room.name !== 'Ana Dünya') {
      room.isActive = false;
      logger.info(`Oda boşaldı: ${roomId}`);
    }
  }
}

function handleDisconnect(socketId, playerInfo) {
  if (!playerInfo) return;
  disconnectedPlayers.set(socketId, {
    ...playerInfo,
    disconnectedAt: Date.now(),
  });

  setTimeout(() => {
    disconnectedPlayers.delete(socketId);
  }, MAX_RECONNECT_WAIT);
}

function handleReconnect(oldSocketId, newSocketId) {
  const data = disconnectedPlayers.get(oldSocketId);
  if (!data) return null;
  disconnectedPlayers.delete(oldSocketId);

  const room = rooms.get(data.roomId);
  if (room && room.players.has(oldSocketId)) {
    const player = room.players.get(oldSocketId);
    room.players.delete(oldSocketId);
    room.players.set(newSocketId, { ...player, socketId: newSocketId });
  }

  logger.info(`Oyuncu reconnect: ${data.username}`);
  return data;
}

function getRoomPublic(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    roomId: room.roomId,
    name: room.name,
    host: room.host,
    maxPlayers: room.maxPlayers,
    playerCount: room.players.size,
    players: Array.from(room.players.values()).map((p) => ({
      socketId: p.socketId,
      username: p.username,
      userId: p.userId,
    })),
    isActive: room.isActive,
    createdAt: room.createdAt,
  };
}

function getAllRooms() {
  return Array.from(rooms.values())
    .filter((r) => r.isActive)
    .map((r) => getRoomPublic(r.roomId));
}

function getPlayerRoom(socketId) {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) return room;
  }
  return null;
}

function updatePlayerState(socketId, updates) {
  const room = getPlayerRoom(socketId);
  if (!room) return false;
  const player = room.players.get(socketId);
  if (!player) return false;
  Object.assign(player, updates);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (!room.isActive && now - room.createdAt > ROOM_CLEANUP_INTERVAL) {
      rooms.delete(roomId);
      logger.debug(`Oda temizlendi: ${roomId}`);
    }
  }
}, ROOM_CLEANUP_INTERVAL);

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  handleDisconnect,
  handleReconnect,
  getRoomPublic,
  getAllRooms,
  getPlayerRoom,
  updatePlayerState,
  rooms,
};
