/**
 * Socket.IO event-level rate limiter
 * Global fallback limit + per-event limits (chat, stateUpdate, syncGameData …)
 */
const {
  SOCKET_EVENT_RATE_LIMIT,
  SOCKET_EVENT_RATE_WINDOW,
  SOCKET_PER_EVENT_LIMITS,
} = require('../config/constants');
const logger = require('../utils/logger');

// key → { count, windowStart, warned }
const socketEventCounts = new Map();

/**
 * Check whether a socket is within rate limits for a given event.
 * Returns true (allow) or false (reject).
 * Uses per-event config if available, falls back to global constants.
 */
function checkSocketRate(socketId, eventName) {
  const cfg = (SOCKET_PER_EVENT_LIMITS && SOCKET_PER_EVENT_LIMITS[eventName])
    || { max: SOCKET_EVENT_RATE_LIMIT, windowMs: SOCKET_EVENT_RATE_WINDOW };

  const key = `${socketId}:${eventName}`;
  const now = Date.now();

  let entry = socketEventCounts.get(key);
  if (!entry) {
    socketEventCounts.set(key, { count: 1, windowStart: now, warned: false });
    return true;
  }

  if (now - entry.windowStart > cfg.windowMs) {
    entry.count      = 1;
    entry.windowStart = now;
    entry.warned      = false;
    return true;
  }

  entry.count++;
  if (entry.count > cfg.max) {
    if (!entry.warned) {
      logger.warn(
        `[SocketRL] Rate limit aşıldı: socket=${socketId} event=${eventName} ` +
        `count=${entry.count} limit=${cfg.max}/${cfg.windowMs}ms`
      );
      entry.warned = true;
    }
    return false;
  }
  return true;
}

/** Clean up all rate-limit entries for a disconnected socket. */
function cleanupSocket(socketId) {
  for (const key of socketEventCounts.keys()) {
    if (key.startsWith(socketId + ':')) socketEventCounts.delete(key);
  }
}

/**
 * Socket.IO middleware — wraps onevent to enforce rate limits on every
 * incoming event before the handler runs.
 *
 * @param {string[]} exemptEvents  Events that bypass the check entirely.
 */
function createSocketRateLimitMiddleware(
  exemptEvents = ['ping', 'disconnect', 'connect', 'chatHistory']
) {
  return function socketRateLimitMiddleware(socket, next) {
    const originalOnevent = socket.onevent.bind(socket);

    socket.onevent = function rateLimitedOnevent(packet) {
      const eventName = packet.data?.[0];
      if (eventName && !exemptEvents.includes(eventName)) {
        if (!checkSocketRate(socket.id, eventName)) {
          socket.emit('rateLimited', {
            code:    'SOCKET_RATE_LIMIT',
            event:   eventName,
            message: 'Çok hızlı istek gönderiyorsunuz, lütfen bekleyin.',
          });
          return; // drop the event
        }
      }
      originalOnevent(packet);
    };

    next();
  };
}

module.exports = { checkSocketRate, cleanupSocket, createSocketRateLimitMiddleware };
