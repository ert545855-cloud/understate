/**
 * Leaderboard Service — Supabase versiyonu
 * MongoDB aggregation kaldırıldı, Supabase PostgreSQL kullanılıyor.
 */
const sb = require('./supabaseService');
const logger = require('../utils/logger');

const CACHE_TTL = 60 * 1000;
let _cache = { updatedAt: 0 };

async function getLeaderboard(type = 'level') {
  if (!sb.isReady()) return { success: false, message: 'Veritabanı bağlı değil', data: [] };

  const now = Date.now();
  if (now - _cache.updatedAt < CACHE_TTL && _cache[type]) {
    return { success: true, data: _cache[type] };
  }

  try {
    const data = await sb.getLeaderboardData(100);
    if (!data) return { success: false, message: 'Veri alınamadı', data: [] };
    _cache = { ...data, updatedAt: now };
    return { success: true, data: _cache[type] || [] };
  } catch (err) {
    logger.error('Leaderboard hatası:', err.message);
    return { success: false, message: 'Hata', data: [] };
  }
}

async function getAllLeaderboards() {
  if (!sb.isReady()) return { success: false, message: 'Veritabanı bağlı değil', data: {} };

  const now = Date.now();
  if (now - _cache.updatedAt < CACHE_TTL && _cache.level) {
    const { updatedAt, ...data } = _cache;
    return { success: true, data };
  }

  try {
    const data = await sb.getLeaderboardData(100);
    if (!data) return { success: false, message: 'Veri alınamadı', data: {} };
    _cache = { ...data, updatedAt: now };
    const { updatedAt, ...ret } = _cache;
    return { success: true, data: ret };
  } catch (err) {
    logger.error('Leaderboard hatası:', err.message);
    return { success: false, message: 'Hata', data: {} };
  }
}

function invalidateCache() { _cache.updatedAt = 0; }

module.exports = { getLeaderboard, getAllLeaderboards, invalidateCache };
