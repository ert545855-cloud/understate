const { filterMessage } = require('../utils/profanityFilter');
const { checkPacketRate } = require('../utils/antiCheat');
const { validatePacket, sanitizeString } = require('../middleware/sanitize');
const { checkSocketRate } = require('../middleware/socketRateLimiter');
const monitoring = require('../services/monitoringService');
const logger = require('../utils/logger');
const { MAX_CHAT_LENGTH, MAX_CHAT_RATE, CHAT_RATE_WINDOW } = require('../config/constants');
const sb = require('../services/supabaseService');

const chatRates = new Map();

function isSpamming(socketId) {
  const now = Date.now();
  if (!chatRates.has(socketId)) { chatRates.set(socketId, { count: 1, windowStart: now }); return false; }
  const rate = chatRates.get(socketId);
  if (now - rate.windowStart > CHAT_RATE_WINDOW) { rate.count = 1; rate.windowStart = now; return false; }
  rate.count++;
  return rate.count > MAX_CHAT_RATE;
}

async function getChannelHistory(channel, limit = 50) {
  if (!sb.isReady()) return [];
  try { return await sb.getChannelHistory(channel, limit); }
  catch (err) { logger.warn('[Chat] Geçmiş yüklenemedi:', err.message); return []; }
}

function registerChatHandlers(io, socket) {
  socket.on('chatHistory', async (data) => {
    if (!checkSocketRate(socket.id, 'chatHistory')) return;
    const channel = sanitizeString(data?.channel || 'global').slice(0, 50);
    const history = await getChannelHistory(channel);
    socket.emit('chatHistory', { channel, messages: history });
  });

  socket.on('chat', async (data) => {
    if (!validatePacket(data, ['channel', 'message'])) return;
    if (!checkPacketRate(socket.id)) { socket.emit('error', { code: 'RATE_LIMIT', message: 'Çok hızlı mesaj gönderiyorsunuz' }); return; }
    if (!checkSocketRate(socket.id, 'chat')) { socket.emit('error', { code: 'RATE_LIMIT', message: 'Mesaj limitini aştınız' }); return; }
    if (isSpamming(socket.id)) { socket.emit('error', { code: 'SPAM', message: 'Spam koruması aktif' }); return; }

    const rawMessage = sanitizeString(data.message).slice(0, MAX_CHAT_LENGTH);
    if (!rawMessage) return;

    const filtered = filterMessage(rawMessage);
    const channel  = sanitizeString(data.channel).slice(0, 50);
    const msgId    = data.id || `${Date.now()}_${socket.id.slice(0, 4)}`;

    const outgoing = { id: msgId, channel, message: filtered, sender: socket.username || 'Bilinmeyen', userId: socket.userId || null, timestamp: Date.now() };

    if (sb.isReady()) {
      sb.saveChatMessage({ channel, message: filtered, sender: outgoing.sender, userId: outgoing.userId || null, filtered: filtered !== rawMessage, msgId })
        .catch(err => logger.warn('[Chat] DB kayıt hatası:', err.message));
    }

    if (channel.startsWith('klan_')) {
      // Klan kanalı: sadece aynı klan üyelerine broadcast
      // Klan ID'si channel'dan alınır: klan_KLANID
      const klanId = channel.replace('klan_', '');
      // Şimdilik global broadcast — ileride klan room join ile kısıtlanabilir
      io.emit('chat', outgoing);
    } else if (channel.startsWith('room_') || channel.startsWith('city_')) {
      io.emit('chat', outgoing);
    } else {
      io.emit('chat', outgoing);
    }

    monitoring.increment('chatMessages');
    logger.debug(`Chat [${channel}] ${outgoing.sender}: ${filtered.slice(0, 60)}`);
  });
}

function registerSupportHandler(io, socket) {
  socket.on('support:message', async ({ msg } = {}) => {
    if (!msg || !socket.userId) return;
    if (!checkSocketRate(socket.id, 'support')) return;
    // Admin soketlerine ilet
    const sanitized = {
      id: msg.id,
      from: sanitizeString(msg.from || 'Anonim').slice(0, 60),
      userId: socket.userId,
      text: sanitizeString(msg.text || '').slice(0, 1000),
      ts: Date.now(),
      status: 'pending',
      replies: [],
    };
    // Supabase'e kaydet
    if (sb.isReady()) {
      try {
        await sb.query('INSERT INTO support_messages (id, user_id, username, message, status, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
          [sanitized.id, sanitized.userId, sanitized.from, sanitized.text, 'pending']);
      } catch(e) { logger.warn('[Support] DB kayıt hatası:', e.message); }
    }
    // Admin odasına ilet (admin kullanıcılar 'admin_room'a join olmalı)
    io.to('admin_room').emit('support:new', sanitized);
    socket.emit('support:ack', { id: sanitized.id });
    logger.debug(`[Support] ${sanitized.from}: ${sanitized.text.slice(0,60)}`);
  });
}

function cleanupChatRates(socketId) { chatRates.delete(socketId); }
module.exports = { registerChatHandlers, registerSupportHandler, cleanupChatRates, getChannelHistory };
