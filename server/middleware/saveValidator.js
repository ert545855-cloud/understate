const logger = require('../utils/logger');

const LIMITS = {
  money:              { min: 0,    max: 1_000_000_000 },
  bank_money:         { min: 0,    max: 1_000_000_000 },
  under_coin:         { min: 0,    max: 10_000_000    },
  hp:                 { min: 0,    max: 100            },
  level:              { min: 1,    max: 999            },
  xp:                 { min: 0,    max: Number.MAX_SAFE_INTEGER },
  score:              { min: 0,    max: Number.MAX_SAFE_INTEGER },
  credit_score:       { min: 0,    max: 1000           },
  merit_points:       { min: 0,    max: Number.MAX_SAFE_INTEGER },
  loyalty_points:     { min: 0,    max: Number.MAX_SAFE_INTEGER },
  education_progress: { min: 0,    max: 100            },
};

const MAX_MONEY_DELTA_PER_SAVE = 50_000_000;
const MAX_LEVEL_JUMP           = 1;

function clampNumeric(key, value) {
  const limit = LIMITS[key];
  if (!limit) return value;
  if (typeof value !== 'number' || isNaN(value)) return null;
  return Math.max(limit.min, Math.min(limit.max, Math.floor(value)));
}

function validateSaveData(incoming, current, userId) {
  const result  = {};
  const warnings = [];

  for (const [key, rawVal] of Object.entries(incoming)) {
    if (rawVal === undefined || rawVal === null) continue;

    if (key in LIMITS) {
      const clamped = clampNumeric(key, rawVal);
      if (clamped === null) { warnings.push(`${key} geçersiz tip`); continue; }

      if (current) {
        const cur = Number(current[key] || 0);

        if (key === 'level') {
          if (clamped < cur) { warnings.push(`level azaltma reddedildi ${cur}→${clamped}`); result[key] = cur; continue; }
          if (clamped - cur > MAX_LEVEL_JUMP) { warnings.push(`level sıçraması reddedildi ${cur}→${clamped}`); result[key] = cur + MAX_LEVEL_JUMP; continue; }
        }

        if (key === 'xp' && clamped < cur) {
          warnings.push(`xp azaltma reddedildi`); result[key] = cur; continue;
        }

        if ((key === 'money' || key === 'bank_money') && (clamped - cur) > MAX_MONEY_DELTA_PER_SAVE) {
          warnings.push(`${key} anormal artış reddedildi: +${clamped - cur}`);
          result[key] = cur + MAX_MONEY_DELTA_PER_SAVE;
          continue;
        }
      }

      result[key] = clamped;
    } else {
      result[key] = rawVal;
    }
  }

  if (warnings.length > 0) {
    logger.warn(`[SaveValidator] userId=${userId} uyarılar: ${warnings.join(', ')}`);
  }

  return result;
}

module.exports = { validateSaveData };
