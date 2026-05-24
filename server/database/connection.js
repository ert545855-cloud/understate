/**
 * Database connection — Supabase versiyonu
 * MongoDB/Mongoose tamamen kaldırıldı.
 */
const sb = require('../services/supabaseService');
const logger = require('../utils/logger');

let _io = null;
let _ready = false;

async function connectDB(io) {
  if (io) _io = io;

  if (!sb.isReady()) {
    logger.warn('SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY tanımlanmamış — DB bağlantısı kurulamadı');
    return;
  }

  try {
    const admin = sb.getAdmin();
    const { error } = await admin.from('users').select('id').limit(1);
    // "table not found" means DB is reachable but schema not run yet — still OK
    if (error && !error.message.includes('schema cache') && !error.message.includes('does not exist')) {
      throw error;
    }
    _ready = true;
    logger.success('Supabase bağlantısı başarılı ✓');
    if (_io) _io.emit('dbStatus', { status: 'connected', timestamp: Date.now() });
  } catch (err) {
    logger.error('Supabase bağlantı testi başarısız:', err.message);
    logger.warn('Supabase bağlı değil — veriler kalıcı olmayacak');
    if (_io) _io.emit('dbStatus', { status: 'error', timestamp: Date.now() });
  }
}

function getConnectionStatus() {
  return sb.isReady();
}

function getConnectionDetails() {
  return {
    status:    sb.isReady() ? 'connected' : 'disconnected',
    isConnected: sb.isReady(),
    provider:  'supabase',
    retryCount: 0,
    maxRetries: 0,
    host: process.env.SUPABASE_URL || null,
    dbName: 'postgres',
  };
}

module.exports = { connectDB, getConnectionStatus, getConnectionDetails };
