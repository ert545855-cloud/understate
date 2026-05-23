const User = require('../models/User');
const logger = require('../utils/logger');
const { getConnectionStatus } = require('../database/connection');
const { LEADERBOARD_SIZE } = require('../config/constants');

const CACHE_TTL = 60 * 1000; // 1 dakika
let _cache = { updatedAt: 0 };

async function getLeaderboard(type = 'level') {
  if (!getConnectionStatus()) {
    return { success: false, message: 'Veritabanı bağlı değil', data: [] };
  }

  const now = Date.now();
  if (now - _cache.updatedAt < CACHE_TTL && _cache[type]) {
    return { success: true, data: _cache[type] };
  }

  try {
    const [levelRank, moneyRank, bankRank, scoreRank, gangRank] = await Promise.all([
      // Seviye sıralaması
      User.find()
        .sort({ level: -1, xp: -1 })
        .limit(LEADERBOARD_SIZE)
        .select('username level xp city isOnline'),

      // Para sıralaması
      User.find()
        .sort({ money: -1 })
        .limit(LEADERBOARD_SIZE)
        .select('username money level city isOnline'),

      // Banka (toplam servet) sıralaması
      User.find()
        .sort({ bankMoney: -1 })
        .limit(LEADERBOARD_SIZE)
        .select('username bankMoney money level city isOnline'),

      // Puan sıralaması
      User.find()
        .sort({ score: -1 })
        .limit(LEADERBOARD_SIZE)
        .select('username score level city isOnline'),

      // En güçlü çete — gameData.gang içinden çekiyoruz (Firebase'den senkronize edilmiş)
      // Gang gücü: gang.power veya üye sayısı üzerinden hesaplanır
      User.aggregate([
        { $match: { 'gameData.gang': { $exists: true, $ne: null } } },
        { $group: {
            _id: '$gameData.gang',
            memberCount: { $sum: 1 },
            totalScore:  { $sum: '$score' },
            totalLevel:  { $sum: '$level' },
            totalMoney:  { $sum: '$money' },
            leader:      { $first: '$username' },
          }
        },
        { $addFields: {
            gangPower: {
              $add: [
                { $multiply: ['$memberCount', 100] },
                { $divide: ['$totalScore', 10] },
                { $divide: ['$totalLevel', 5] },
              ]
            }
          }
        },
        { $sort: { gangPower: -1 } },
        { $limit: 50 },
      ]),
    ]);

    _cache = {
      updatedAt: now,

      level: levelRank.map((u, i) => ({
        rank: i + 1,
        username: u.username,
        level: u.level,
        xp: u.xp,
        city: u.city || '',
        isOnline: u.isOnline,
      })),

      money: moneyRank.map((u, i) => ({
        rank: i + 1,
        username: u.username,
        money: u.money,
        level: u.level,
        city: u.city || '',
        isOnline: u.isOnline,
      })),

      bank: bankRank.map((u, i) => ({
        rank: i + 1,
        username: u.username,
        bankMoney: u.bankMoney,
        totalWealth: (u.bankMoney || 0) + (u.money || 0),
        level: u.level,
        city: u.city || '',
        isOnline: u.isOnline,
      })),

      score: scoreRank.map((u, i) => ({
        rank: i + 1,
        username: u.username,
        score: u.score,
        level: u.level,
        city: u.city || '',
        isOnline: u.isOnline,
      })),

      gang: gangRank.map((g, i) => ({
        rank: i + 1,
        gangName: g._id || 'Bilinmeyen',
        memberCount: g.memberCount,
        gangPower: Math.round(g.gangPower),
        totalScore: g.totalScore,
        totalMoney: g.totalMoney,
        avgLevel: g.memberCount ? Math.round(g.totalLevel / g.memberCount) : 0,
        leader: g.leader || '?',
      })),
    };

    return { success: true, data: _cache[type] || [] };
  } catch (err) {
    logger.error('Leaderboard hatası:', err.message);
    return { success: false, message: 'Hata', data: [] };
  }
}

function invalidateCache() {
  _cache.updatedAt = 0;
}

module.exports = { getLeaderboard, invalidateCache };
