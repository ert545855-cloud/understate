const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;
let retryCount = 0;
let retryTimer = null;
let _io = null;

const MAX_RETRIES = 10;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 60000;

function _getDelay(attempt) {
  const jitter = Math.random() * 1000;
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS) + jitter;
}

function _emitDbStatus(status) {
  if (_io) _io.emit('dbStatus', { status, timestamp: Date.now() });
}

async function connectDB(io) {
  if (io) _io = io;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.warn('MONGODB_URI tanımlanmamış — MongoDB olmadan çalışılıyor (veriler kalıcı olmayacak)');
    return;
  }

  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 10000,
    });

    isConnected = true;
    retryCount = 0;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    logger.info('MongoDB bağlantısı başarılı');
    _emitDbStatus('connected');

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB bağlantısı kesildi — yeniden deneniyor...');
      _emitDbStatus('disconnected');
      _scheduleRetry();
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      retryCount = 0;
      logger.info('MongoDB yeniden bağlandı ✓');
      _emitDbStatus('connected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB bağlantı hatası:', err.message);
      _emitDbStatus('error');
    });

  } catch (err) {
    isConnected = false;
    logger.error(`MongoDB bağlantı hatası (deneme ${retryCount + 1}/${MAX_RETRIES}): ${err.message}`);
    _emitDbStatus('error');
    _scheduleRetry();
  }
}

function _scheduleRetry() {
  if (retryTimer) return;
  if (retryCount >= MAX_RETRIES) {
    logger.error(`MongoDB: ${MAX_RETRIES} deneme sonrası vazgeçildi. Lütfen URI ve IP whitelist kontrol edin.`);
    _emitDbStatus('failed');
    return;
  }

  retryCount++;
  const delay = _getDelay(retryCount);
  logger.warn(`MongoDB yeniden bağlantı denemesi ${retryCount}/${MAX_RETRIES} — ${Math.round(delay / 1000)}s içinde...`);

  retryTimer = setTimeout(async () => {
    retryTimer = null;
    await connectDB();
  }, delay);
}

function getConnectionStatus() {
  return isConnected && mongoose.connection.readyState === 1;
}

function getConnectionDetails() {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return {
    status: states[mongoose.connection.readyState] || 'unknown',
    isConnected,
    retryCount,
    maxRetries: MAX_RETRIES,
    host: mongoose.connection.host || null,
    dbName: mongoose.connection.name || null,
  };
}

module.exports = { connectDB, getConnectionStatus, getConnectionDetails };
