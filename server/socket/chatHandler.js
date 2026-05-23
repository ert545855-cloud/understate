const { filterMessage } = require('../utils/profanityFilter');
const { checkPacketRate } = require('../utils/antiCheat');
const { validatePacket, sanitizeString } = require('../middleware/sanitize');
const { checkSocketRate } = require('../middleware/socketRateLimiter');
const monitoring = require('../services/monitoringService');
const logger = require('../utils/logger');
const { MAX_CHAT_LENGTH, MAX_CHAT_RATE, CHAT_RATE_WINDOW } = require('../config/constants');
const { getConnectionStatus } = require('../database/connection');

let ChatMessage;
function _getModel() {
  if (!ChatMessage) ChatMessage = require('../models/ChatMessage');
  return ChatMessage;
}

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

// Kanal geçmiş mesajlarını çek (son 50)
async function getChannelHistory(channel, limit = 50) {
  if (!getConnectionStatus()) return [];
  try {
    const Model = _getModel();
    const msgs = await Model.find({ channel })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return msgs.reverse().map(m => ({
      id: m.msgId || m._id.toString(),
      channel: m.channel,
      message: m.message,
      sender: m.sender,
      userId: m.userId,
      timestamp: m.createdAt.getTime(),
    }));
  } catch (err) {
    logger.warn('[Chat] Geçmiş yüklenemedi:', err.message);
    return [];
  }
}

function registerChatHandlers(io, socket) {
  // Kanal geçmişi isteği
  socket.on('chatHistory', async (data) => {
    if (!checkSocketRate(socket.id, 'chatHistory')) return;
    const channel = sanitizeString(data?.channel || 'global').slice(0, 50);
    const history = await getChannelHistory(channel);
    socket.emit('chatHistory', { channel, messages: history });
  });

  // Yeni mesaj
  socket.on('chat', async (data) => {
    if (!validatePacket(data, ['channel', 'message'])) return;
    if (!checkPacketRate(socket.id)) {
      socket.emit('error', { code: 'RATE_LIMIT', message: 'Çok hızlı mesaj gönderiyorsunuz' });
      return;
    }
    if (!checkSocketRate(socket.id, 'chat')) {
      socket.emit('error', { code: 'RATE_LIMIT', message: 'Mesaj limitini aştınız' });
      return;
    }
    if (isSpamming(socket.id)) {
      socket.emit('error', { code: 'SPAM', message: 'Spam koruması aktif' });
      return;
    }

    const rawMessage = sanitizeString(data.message).slice(0, MAX_CHAT_LENGTH);
    if (!rawMessage) return;

    const filtered = filterMessage(rawMessage);
    const channel  = sanitizeString(data.channel).slice(0, 50);
    const msgId    = data.id || `${Date.now()}_${socket.id.slice(0, 4)}`;

    const outgoing = {
      id: msgId,
      channel,
      message: filtered,
      sender:    socket.username || 'Bilinmeyen',
      userId:    socket.userId   || null,
      timestamp: Date.now(),
    };

    // DB'ye kaydet (async — mesaj iletimini bloklamaz)
    if (getConnectionStatus()) {
      _getModel().create({
        channel,
        message:  filtered,
        sender:   outgoing.sender,
        userId:   outgoing.userId,
        filtered: filtered !== rawMessage,
        msgId,
      }).catch(err => logger.warn('[Chat] DB kayıt hatası:', err.message));
    }

    // Emit
    if (channel.startsWith('room_')) {
      io.to(channel).emit('chat', outgoing);
    } else {
      io.emit('chat', outgoing);
    }

    monitoring.increment('chatMessages');
    logger.debug(`Chat [${channel}] ${outgoing.sender}: ${filtered.slice(0, 60)}`);
  });
}

function cleanupChatRates(socketId) {
  chatRates.delete(socketId);
}

module.exports = { registerChatHandlers, cleanupChatRates, getChannelHistory };
