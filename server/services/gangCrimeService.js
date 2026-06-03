"use strict";
const db = require('./dbService');

// ── Gang Suç Olayları Sistemi ──────────────────────────────────────────────
// Çete üyelerine organizeli suç operasyonları: soygun, şantaj, kaçakçılık vs.

const CRIME_OPERATIONS = [
  {
    id: 'street_robbery',
    name: 'Sokak Soygunu',
    icon: '🔫',
    description: 'Küçük çaplı sokak soygunu. Düşük risk, düşük ödül.',
    minMembers: 1,
    cooldownMs: 30 * 60 * 1000, // 30 dk
    successBase: 0.80,
    rewards: { money: [5000, 15000], xp: [20, 40], merit: [2, 5], hpCost: [5, 15] },
    gangShare: 0.20, // gelirin %20'si çete kasasına
    riskLevel: 'low',
    minLevel: 1,
  },
  {
    id: 'store_heist',
    name: 'Mağaza Soygunu',
    icon: '🏪',
    description: 'Küçük bir mağazayı soy. Orta risk.',
    minMembers: 2,
    cooldownMs: 60 * 60 * 1000, // 1 saat
    successBase: 0.65,
    rewards: { money: [25000, 75000], xp: [50, 100], merit: [5, 15], hpCost: [10, 25] },
    gangShare: 0.25,
    riskLevel: 'medium',
    minLevel: 5,
  },
  {
    id: 'blackmail',
    name: 'Şantaj',
    icon: '🖤',
    description: 'Bir hedefi şantajla. Yüksek para, orta risk.',
    minMembers: 1,
    cooldownMs: 2 * 60 * 60 * 1000, // 2 saat
    successBase: 0.70,
    rewards: { money: [50000, 150000], xp: [60, 120], merit: [8, 20], hpCost: [0, 5] },
    gangShare: 0.15,
    riskLevel: 'medium',
    minLevel: 8,
  },
  {
    id: 'smuggling',
    name: 'Kaçakçılık',
    icon: '🚢',
    description: 'Yasadışı mal taşı. Büyük kazanç ama yüksek risk.',
    minMembers: 3,
    cooldownMs: 4 * 60 * 60 * 1000, // 4 saat
    successBase: 0.55,
    rewards: { money: [100000, 400000], xp: [100, 200], merit: [15, 40], hpCost: [15, 35] },
    gangShare: 0.30,
    riskLevel: 'high',
    minLevel: 12,
  },
  {
    id: 'bank_robbery',
    name: 'Banka Soygunu',
    icon: '🏦',
    description: 'Büyük banka soygunu. Maksimum risk, maksimum ödül.',
    minMembers: 5,
    cooldownMs: 12 * 60 * 60 * 1000, // 12 saat
    successBase: 0.40,
    rewards: { money: [500000, 2000000], xp: [300, 600], merit: [50, 100], hpCost: [30, 60] },
    gangShare: 0.35,
    riskLevel: 'extreme',
    minLevel: 20,
  },
  {
    id: 'protection_racket',
    name: 'Haraç Toplama',
    icon: '💰',
    description: 'Bölgedeki işletmelerden haraç topla. Sürekli gelir.',
    minMembers: 2,
    cooldownMs: 6 * 60 * 60 * 1000, // 6 saat
    successBase: 0.75,
    rewards: { money: [80000, 200000], xp: [80, 160], merit: [10, 30], hpCost: [5, 20] },
    gangShare: 0.40,
    riskLevel: 'medium',
    minLevel: 10,
  },
];

// Cooldown tablosu başlat
async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS gang_crime_log (
      id            SERIAL PRIMARY KEY,
      gang_id       TEXT NOT NULL,
      user_id       INTEGER NOT NULL,
      operation_id  TEXT NOT NULL,
      success       BOOLEAN NOT NULL,
      reward_money  BIGINT DEFAULT 0,
      reward_xp     INTEGER DEFAULT 0,
      reward_merit  INTEGER DEFAULT 0,
      hp_cost       INTEGER DEFAULT 0,
      gang_cut      BIGINT DEFAULT 0,
      executed_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});

  await db.query(`
    CREATE TABLE IF NOT EXISTS gang_crime_cooldowns (
      user_id      INTEGER NOT NULL,
      operation_id TEXT NOT NULL,
      last_done_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, operation_id)
    )
  `).catch(() => {});
}
ensureTable();

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Kullanıcının cooldown durumlarını getir
async function getCooldowns(userId) {
  const rows = await db.query(`
    SELECT operation_id, last_done_at FROM gang_crime_cooldowns WHERE user_id = $1
  `, [userId]).then(r => r.rows).catch(() => []);

  const map = {};
  for (const row of rows) {
    map[row.operation_id] = new Date(row.last_done_at).getTime();
  }
  return map;
}

// Suç operasyonu gerçekleştir
async function executeCrime(userId, gangId, operationId, gangLevel = 1, userLevel = 1) {
  const op = CRIME_OPERATIONS.find(o => o.id === operationId);
  if (!op) return { success: false, error: 'Geçersiz operasyon' };

  if (userLevel < op.minLevel) {
    return { success: false, error: `Bu operasyon için en az Seviye ${op.minLevel} gerekli` };
  }

  // Cooldown kontrol
  const cooldowns = await getCooldowns(userId);
  const lastDone = cooldowns[operationId] || 0;
  const remaining = (lastDone + op.cooldownMs) - Date.now();
  if (remaining > 0) {
    return {
      success: false,
      error: `Beklemeniz gerekiyor`,
      remainingMs: remaining,
      cooldown: true,
    };
  }

  // Başarı oranı hesapla (gang level + user level bonusu)
  const levelBonus = Math.min(0.25, (gangLevel - 1) * 0.02 + (userLevel - 1) * 0.005);
  const successRate = Math.min(0.95, op.successBase + levelBonus);
  const isSuccess = Math.random() < successRate;

  const rewards = { money: 0, xp: 0, merit: 0, hpCost: 0, gangCut: 0 };
  if (isSuccess) {
    rewards.money  = randBetween(...op.rewards.money);
    rewards.xp     = randBetween(...op.rewards.xp);
    rewards.merit  = randBetween(...op.rewards.merit);
    rewards.hpCost = randBetween(...op.rewards.hpCost);
    rewards.gangCut = Math.floor(rewards.money * op.gangShare);
    const playerMoney = rewards.money - rewards.gangCut;
    rewards.playerMoney = playerMoney;

    // Kullanıcıya para/xp/merit ver
    await db.query(`
      UPDATE users
      SET money = money + $1,
          xp    = xp    + $2,
          hp    = GREATEST(1, COALESCE(hp, 100) - $3),
          updated_at = NOW()
      WHERE id = $4
    `, [playerMoney, rewards.xp, rewards.hpCost, userId]).catch(() => {});

    // Çete kasasına ekle
    if (rewards.gangCut > 0 && gangId) {
      await db.query(`
        UPDATE gangs SET treasury = COALESCE(treasury, 0) + $1, updated_at = NOW() WHERE id = $2
      `, [rewards.gangCut, gangId]).catch(() => {});
    }
  } else {
    // Başarısız — düşük HP cezası
    rewards.hpCost = randBetween(5, 20);
    await db.query(`
      UPDATE users SET hp = GREATEST(1, COALESCE(hp, 100) - $1), updated_at = NOW() WHERE id = $2
    `, [rewards.hpCost, userId]).catch(() => {});
  }

  // Cooldown güncelle
  await db.query(`
    INSERT INTO gang_crime_cooldowns (user_id, operation_id, last_done_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id, operation_id) DO UPDATE SET last_done_at = NOW()
  `, [userId, operationId]).catch(() => {});

  // Kayıt
  await db.query(`
    INSERT INTO gang_crime_log (gang_id, user_id, operation_id, success, reward_money, reward_xp, reward_merit, hp_cost, gang_cut, executed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
  `, [gangId, userId, operationId, isSuccess, rewards.money || 0, rewards.xp, rewards.merit, rewards.hpCost, rewards.gangCut]).catch(() => {});

  return {
    success: true,
    operationSuccess: isSuccess,
    operation: op,
    rewards: isSuccess ? rewards : { hpCost: rewards.hpCost },
    message: isSuccess
      ? `✅ ${op.name} başarılı! +₺${(rewards.playerMoney||0).toLocaleString('tr-TR')} +${rewards.xp}XP`
      : `❌ ${op.name} başarısız! -${rewards.hpCost}HP`,
  };
}

// Çete log geçmişi
async function getGangCrimeLog(gangId, limit = 20) {
  const rows = await db.query(`
    SELECT gcl.*, u.username
    FROM gang_crime_log gcl
    LEFT JOIN users u ON u.id = gcl.user_id
    WHERE gcl.gang_id = $1
    ORDER BY gcl.executed_at DESC
    LIMIT $2
  `, [gangId, limit]).then(r => r.rows).catch(() => []);
  return rows;
}

module.exports = { CRIME_OPERATIONS, executeCrime, getCooldowns, getGangCrimeLog };
