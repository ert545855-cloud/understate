/**
 * Database connection — Replit PostgreSQL versiyonu
 */
const db = require('../services/dbService');
const logger = require('../utils/logger');

let _io = null;
let _ready = false;

async function connectDB(io) {
  if (io) _io = io;

  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL tanımlanmamış — DB bağlantısı kurulamadı');
    return;
  }

  try {
    await db.query('SELECT 1');
    _ready = true;
    logger.success('PostgreSQL bağlantısı başarılı ✓');
    if (_io) _io.emit('dbStatus', { status: 'connected', timestamp: Date.now() });

    const REQUIRED_TABLES = ['users', 'chat_messages', 'game_state', 'rooms', 'economy'];
    for (const table of REQUIRED_TABLES) {
      try {
        const { rows } = await db.query(
          "SELECT to_regclass($1) AS exists", [table]
        );
        if (!rows[0].exists) logger.error(`[DB] TABLO EKSİK: ${table} — lütfen şemayı uygulayın`);
      } catch (_) {}
    }
  } catch (err) {
    logger.error('PostgreSQL bağlantı testi başarısız:', err.message);
    logger.warn('DB bağlı değil — veriler kalıcı olmayacak');
    if (_io) _io.emit('dbStatus', { status: 'error', timestamp: Date.now() });
  }
}

function getConnectionStatus() {
  return db.isReady() && _ready;
}

function getConnectionDetails() {
  return {
    status:    (_ready && db.isReady()) ? 'connected' : 'disconnected',
    isConnected: _ready && db.isReady(),
    provider:  'replit_postgresql',
    retryCount: 0,
    maxRetries: 0,
    host: process.env.PGHOST || null,
    dbName: process.env.PGDATABASE || 'postgres',
  };
}

module.exports = { connectDB, getConnectionStatus, getConnectionDetails };
