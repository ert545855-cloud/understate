/**
 * Job Service — Standart İş Cooldown Sistemi
 * Sunucu taraflı cooldown doğrulama ve ödül hesaplama.
 */
const db = require('./dbService');
const logger = require('../utils/logger');

// Tüm standart işler (frontend ile senkron tutulmalı)
const STANDARD_JOBS = [
  { id:'cop',        name:'Çöpçü',            icon:'🗑️',  earn:1200,   cd:120000,  minLevel:1  },
  { id:'kurye',      name:'Kurye',             icon:'🚲',  earn:2800,   cd:180000,  minLevel:2  },
  { id:'kasap',      name:'Kasap Yardımcısı',  icon:'🥩',  earn:4500,   cd:300000,  minLevel:3  },
  { id:'guvenlik',   name:'Güvenlik Görevlisi',icon:'🛡️',  earn:7000,   cd:480000,  minLevel:5  },
  { id:'sekreter',   name:'Sekreter',          icon:'📋',  earn:10000,  cd:600000,  minLevel:7  },
  { id:'muhasebeci', name:'Muhasebeci',        icon:'📊',  earn:18000,  cd:900000,  minLevel:10 },
  { id:'muhendis',   name:'Mühendis',          icon:'⚙️',  earn:35000,  cd:1800000, minLevel:15 },
  { id:'doktor',     name:'Doktor',            icon:'🏥',  earn:75000,  cd:3600000, minLevel:20 },
  { id:'avukat',     name:'Avukat',            icon:'⚖️',  earn:120000, cd:7200000, minLevel:25 },
  { id:'yatirimci',  name:'Yatırımcı',         icon:'💹',  earn:250000, cd:14400000,minLevel:30 },
];

const JOB_MAP = Object.fromEntries(STANDARD_JOBS.map(j => [j.id, j]));

async function getCooldowns(userId) {
  try {
    const { rows } = await db.query(
      'SELECT job_id, last_done_at FROM job_cooldowns WHERE user_id = $1',
      [userId]
    );
    const result = {};
    for (const r of rows) result[r.job_id] = Number(r.last_done_at);
    return result;
  } catch (err) {
    logger.warn('[Job] getCooldowns:', err.message);
    return {};
  }
}

async function doJob({ userId, jobId, playerLevel, tradePoints, packages, ucMultiplier }) {
  try {
    const job = JOB_MAP[jobId];
    if (!job) return { ok: false, msg: 'Geçersiz iş' };
    if ((playerLevel || 1) < job.minLevel) return { ok: false, msg: `Bu iş için Seviye ${job.minLevel} gerekli!` };

    const now = Date.now();

    // Cooldown DB'den kontrol et
    const { rows } = await db.query(
      'SELECT last_done_at FROM job_cooldowns WHERE user_id = $1 AND job_id = $2',
      [userId, jobId]
    );
    if (rows.length > 0) {
      const lastDone = Number(rows[0].last_done_at);
      const remaining = job.cd - (now - lastDone);
      if (remaining > 0) {
        const m = Math.ceil(remaining / 60000);
        const s = Math.ceil((remaining % 60000) / 1000);
        return { ok: false, msg: `⏳ ${m > 0 ? m+'dk ' : ''}${s}s bekle!`, remaining };
      }
    }

    // Cooldown güncelle
    await db.query(
      `INSERT INTO job_cooldowns (user_id, job_id, last_done_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, job_id) DO UPDATE SET last_done_at = $3`,
      [userId, jobId, now]
    );

    // Ödül hesapla
    const hasUCBoost = !!(packages?.ucBoost || ucMultiplier);
    const ucMulti = hasUCBoost ? 2 : 1;
    const tpBonus = 1 + (tradePoints || 0) * 0.0001;
    const earned = Math.round(job.earn * tpBonus);
    const xpGain = Math.max(5, Math.floor(job.earn / 200));

    let ucEarned = 0;
    if (job.earn >= 5000) {
      ucEarned = Math.floor(Math.random() * 3 + 1) * ucMulti;
    } else if (job.earn >= 1000) {
      ucEarned = Math.random() < 0.3 ? 1 * ucMulti : 0;
    }

    return { ok: true, earned, xpGain, ucEarned, job };
  } catch (err) {
    logger.warn('[Job] doJob:', err.message);
    return { ok: false, msg: 'Sunucu hatası' };
  }
}

module.exports = { STANDARD_JOBS, JOB_MAP, getCooldowns, doJob };
