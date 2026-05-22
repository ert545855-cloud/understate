const { filterMessage } = require('../utils/profanityFilter');
const { checkPacketRate } = require('../utils/antiCheat');
const { validatePacket, sanitizeString } = require('../middleware/sanitize');
const monitoring = require('../services/monitoringService');
const logger = require('../utils/logger');
const { MAX_CHAT_LENGTH, MAX_CHAT_RATE, CHAT_RATE_WINDOW } = require('../config/constants');

const chatRates = new Map();

function isSpamming(socketId) {
  const now = Date.now();
  if (!chatRates.has(socketId)) {
    chatRates.set(socketId, { count: 1, windowStart: now });
    return false;
  }
  const rate = chatRates.get(socketId);
  if (now - rate.windowStart > CHAT_RATE_WINDOW) {
    rate.count = 1;
    rate.windowStart = now;
    return false;
  }
  rate.count++;
  return rate.count > MAX_CHAT_RATE;
}

function registerChatHandlers(io, socket) {
  socket.on('chat', (data) => {
    if (!validatePacket(data, ['channel', 'message'])) return;
    if (!checkPacketRate(socket.id)) {
      socket.emit('error', { code: 'RATE_LIMIT', message: 'Çok hızlı mesaj gönderiyorsunuz' });
      return;
    }
    if (isSpamming(socket.id)) {
      socket.emit('error', { code: 'SPAM', message: 'Spam koruması aktif' });
      return;
    }

    const message = sanitizeString(data.message).slice(0, MAX_CHAT_LENGTH);
    if (!message) return;

    const filtered = filterMessage(message);
    const outgoing = {
      id: data.id || `${Date.now()}_${socket.id.slice(0, 4)}`,
      channel: sanitizeString(data.channel),
      message: filtered,
      sender: socket.username || 'Bilinmeyen',
      userId: socket.userId || null,
      timestamp: Date.now(),
    };

    const channel = outgoing.channel;

    if (channel.startsWith('room_')) {
      io.to(channel).emit('chat', outgoing);
    } else {
      io.emit('chat', outgoing);
    }

    monitoring.increment('chatMessages');
    logger.debug(`Chat [${channel}] ${outgoing.sender}: ${filtered.slice(0, 60)}`);
  });
}

module.exports = { registerChatHandlers };
