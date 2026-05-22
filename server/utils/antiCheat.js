const { MAX_MOVEMENT_SPEED, MAX_TELEPORT_DISTANCE, PACKET_RATE_LIMIT, PACKET_RATE_WINDOW } = require('../config/constants');
const logger = require('./logger');

const playerLastPositions = new Map();
const packetRates = new Map();
const usedPacketIds = new Map();

function validateMovement(socketId, newPos, oldPos) {
  if (!oldPos) return true;

  const dx = newPos.x - oldPos.x;
  const dy = newPos.y - oldPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const elapsed = (newPos.timestamp - oldPos.timestamp) / 1000;

  if (elapsed <= 0) return false;

  const speed = distance / elapsed;
  if (speed > MAX_MOVEMENT_SPEED) {
    logger.warn(`[AntiCheat] Speed hack detected: ${socketId} speed=${speed.toFixed(0)}`);
    return false;
  }

  if (distance > MAX_TELEPORT_DISTANCE) {
    logger.warn(`[AntiCheat] Teleport detected: ${socketId} distance=${distance.toFixed(0)}`);
    return false;
  }

  return true;
}

function checkPacketRate(socketId) {
  const now = Date.now();
  if (!packetRates.has(socketId)) {
    packetRates.set(socketId, { count: 1, windowStart: now });
    return true;
  }

  const rate = packetRates.get(socketId);
  if (now - rate.windowStart > PACKET_RATE_WINDOW) {
    rate.count = 1;
    rate.windowStart = now;
    return true;
  }

  rate.count++;
  if (rate.count > PACKET_RATE_LIMIT) {
    logger.warn(`[AntiCheat] Packet spam: ${socketId} count=${rate.count}`);
    return false;
  }

  return true;
}

function checkDuplicatePacket(socketId, packetId) {
  if (!packetId) return false;
  if (!usedPacketIds.has(socketId)) {
    usedPacketIds.set(socketId, new Set());
  }
  const ids = usedPacketIds.get(socketId);
  if (ids.has(packetId)) return true;
  ids.add(packetId);
  if (ids.size > 200) {
    const first = ids.values().next().value;
    ids.delete(first);
  }
  return false;
}

function setPlayerPosition(socketId, pos) {
  playerLastPositions.set(socketId, pos);
}

function getPlayerPosition(socketId) {
  return playerLastPositions.get(socketId) || null;
}

function cleanupPlayer(socketId) {
  playerLastPositions.delete(socketId);
  packetRates.delete(socketId);
  usedPacketIds.delete(socketId);
}

module.exports = {
  validateMovement,
  checkPacketRate,
  checkDuplicatePacket,
  setPlayerPosition,
  getPlayerPosition,
  cleanupPlayer,
};
