// #12 Daily Streak
const db = require('./dbService');
const logger = require('../utils/logger');

const STREAK_REWARDS = [
  { day: 1,  money: 500,   xp: 50  },
  { day: 2,  money: 1000,  xp: 100 },
  { day: 3,  money: 2000,  xp: 150 },
  { day: 4,  money: 3000,  xp: 200 },
  { day: 5,  money: 5000,  xp: 300 },
  { day: 6,  money: 8000,  xp: 400 },
  { day: 7,  money: 15000, xp: 750, bonus: 'under_coin', bonusAmt: 5 },
];

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function getStreak(userId) {
  if (!db.isReady()) return null;
  const { rows } = await db.query(
    `SELECT * FROM daily_streaks WHERE user_id = $1`, [userId]
  ).catch(() => ({ rows: [] }));
  return rows[0] || null;
}

async function claimDaily(userId) {
  if (!db.isReady()) return { ok: false, message: 'DB bağlı değil' };

  const today = todayUTC();
  let streak = await getStreak(userId);

  if (!streak) {
    await db.query(
      `INSERT INTO daily_streaks (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]
    ).catch(() => {});
    streak = { current_streak: 0, longest_streak: 0, last_claim_date: null, total_claims: 0 };
  }

  if (streak.last_claim_date === today) {
    return { ok: false, message: 'Bugün zaten ödül aldınız', alreadyClaimed: true };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const continued  = streak.last_claim_date === yesterday;
  const newStreak  = continued ? streak.current_streak + 1 : 1;
  const rewardIdx  = Math.min(newStreak - 1, STREAK_REWARDS.length - 1);
  const reward     = STREAK_REWARDS[rewardIdx];

  // Apply reward
  const updates = { money: reward.money, xp: reward.xp };
  let sql = `UPDATE users SET money = money + $2, xp = xp + $3`;
  const params = [userId, reward.money, reward.xp];
  if (reward.bonus === 'under_coin') {
    sql += `, under_coin = under_coin + $${params.length + 1}`;
    params.push(reward.bonusAmt);
  }
  sql += ` WHERE id = $1`;
  await db.query(sql, params).catch(() => {});

  // Update streak record
  const longest = Math.max(newStreak, streak.longest_streak);
  await db.query(
    `INSERT INTO daily_streaks (user_id, current_streak, longest_streak, last_claim_date, total_claims)
     VALUES ($1,$2,$3,$4,1)
     ON CONFLICT (user_id) DO UPDATE
     SET current_streak=$2, longest_streak=$3, last_claim_date=$4, total_claims=daily_streaks.total_claims+1`,
    [userId, newStreak, longest, today]
  ).catch(() => {});

  logger.info(`[Streak] User ${userId} streak=${newStreak} reward=+${reward.money}₺`);
  return {
    ok: true,
    streak: newStreak,
    longest,
    reward: { ...reward, bonusAmt: reward.bonusAmt },
    nextReward: STREAK_REWARDS[Math.min(newStreak, STREAK_REWARDS.length - 1)],
  };
}

module.exports = { getStreak, claimDaily, STREAK_REWARDS };
