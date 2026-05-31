/**
 * Database connection — Replit PostgreSQL versiyonu
 */
const db = require('../services/dbService');
const { markConnected } = db;
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
    // 5 saniyelik timeout: Render deploy sirasinda DB yanitlamazsa
    // sunucunun health-check'e cevap veremez hale gelmesini onler.
    const timeoutPromise = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('DB baglanti testi zaman asimina ugradi (5s)')), 5000)
    );
    await Promise.race([db.query('SELECT 1'), timeoutPromise]);

    if (typeof markConnected === 'function') markConnected();
    _ready = true;
    logger.success('PostgreSQL baglantisi basarili');
    if (_io) _io.emit('dbStatus', { status: 'connected', timestamp: Date.now() });

    const REQUIRED_TABLES = ['users', 'chat_messages', 'game_state', 'rooms', 'economy'];
    for (const table of REQUIRED_TABLES) {
      try {
        const { rows } = await db.query(
          "SELECT to_regclass($1) AS exists", [table]
        );
        if (!rows[0].exists) logger.error(`[DB] TABLO EKSIK: ${table} — lutfen semay uygulayin`);
      } catch (_) {}
    }
  } catch (err) {
    logger.error('PostgreSQL baglanti testi basarisiz:', err.message);
    logger.warn('DB bagli degil — veriler kalici olmayacak. Sunucu yine de calismaya devam ediyor.');
    if (_io) _io.emit('dbStatus', { status: 'error', timestamp: Date.now() });
    // Hata firlatmiyoruz: sunucu DB olmadan da ayaga kalkmali
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
