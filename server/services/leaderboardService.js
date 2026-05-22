const User = require('../models/User');
const logger = require('../utils/logger');
const { getConnectionStatus } = require('../database/connection');
const { LEADERBOARD_SIZE } = require('../config/constants');

let cachedLeaderboard = { level: [], money: [], updatedAt: 0 };
const CACHE_TTL = 60 * 1000;

async function getLeaderboard(type = 'level') {
  if (!getConnectionStatus()) {
    return { success: false, message: 'Veritabanı bağlı değil', data: [] };
  }

  const now = Date.now();
  if (now - cachedLeaderboard.updatedAt < CACHE_TTL) {
    return { success: true, data: cachedLeaderboard[type] || [] };
  }

  try {
    const [levelRanking, moneyRanking] = await Promise.all([
      User.find()
        .sort({ level: -1, xp: -1 })
        .limit(LEADERBOARD_SIZE)
        .select('username level xp isOnline'),
      User.find()
        .sort({ money: -1 })
        .limit(LEADERBOARD_SIZE)
        .select('username money level isOnline'),
    ]);

    cachedLeaderboard = {
      level: levelRanking.map((u, i) => ({
        rank: i + 1,
        username: u.username,
        level: u.level,
        xp: u.xp,
        isOnline: u.isOnline,
      })),
      money: moneyRanking.map((u, i) => ({
        rank: i + 1,
        username: u.username,
        money: u.money,
        level: u.level,
        isOnline: u.isOnline,
      })),
      updatedAt: now,
    };

    return { success: true, data: cachedLeaderboard[type] || [] };
  } catch (err) {
    logger.error('Leaderboard hatası:', err.message);
    return { success: false, message: 'Hata', data: [] };
  }
}

function invalidateCache() {
  cachedLeaderboard.updatedAt = 0;
}

module.exports = { getLeaderboard, invalidateCache };
