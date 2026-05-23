/**
 * Socket.IO event-level rate limiter
 * Her socket'e kaç event/saniye gönderebileceğini sınırlar.
 */
const { SOCKET_EVENT_RATE_LIMIT, SOCKET_EVENT_RATE_WINDOW } = require('../config/constants');
const logger = require('../utils/logger');

const socketEventCounts = new Map();

// Her event için çağrılır — false dönerse event reddedilir
function checkSocketRate(socketId, eventName) {
  const key = `${socketId}:${eventName}`;
  const now = Date.now();

  if (!socketEventCounts.has(key)) {
    socketEventCounts.set(key, { count: 1, windowStart: now, warned: false });
    return true;
  }

  const entry = socketEventCounts.get(key);
  if (now - entry.windowStart > SOCKET_EVENT_RATE_WINDOW) {
    entry.count = 1;
    entry.windowStart = now;
    entry.warned = false;
    return true;
  }

  entry.count++;
  if (entry.count > SOCKET_EVENT_RATE_LIMIT) {
    if (!entry.warned) {
      logger.warn(`[SocketRL] Rate limit: socket=${socketId} event=${eventName} count=${entry.count}`);
      entry.warned = true;
    }
    return false;
  }
  return true;
}

// Disconnect sonrası temizlik
function cleanupSocket(socketId) {
  for (const key of socketEventCounts.keys()) {
    if (key.startsWith(socketId + ':')) socketEventCounts.delete(key);
  }
}

// Socket.IO middleware olarak kullan:
// io.use(socketRateLimitMiddleware)  → her event öncesi çalışır
function createSocketRateLimitMiddleware(exemptEvents = ['ping', 'disconnect', 'connect']) {
  return function(socket, next) {
    const originalOnevent = socket.onevent.bind(socket);
    socket.onevent = function(packet) {
      const eventName = packet.data?.[0];
      if (eventName && !exemptEvents.includes(eventName)) {
        if (!checkSocketRate(socket.id, eventName)) {
          socket.emit('error', { code: 'SOCKET_RATE_LIMIT', message: 'Çok hızlı istek gönderiyorsunuz, bekleyin.' });
          return;
        }
      }
      originalOnevent(packet);
    };
    next();
  };
}

module.exports = { checkSocketRate, cleanupSocket, createSocketRateLimitMiddleware };
