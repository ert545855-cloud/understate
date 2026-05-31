// #15 Tax System
const db = require('./dbService');
const logger = require('../utils/logger');

const DEFAULT_RATES = { income: 10.0, trade: 5.0, property: 3.0 };

async function getRates(city) {
  if (!db.isReady()) return DEFAULT_RATES;
  const { rows } = await db.query(
    `SELECT income_tax_rate AS income, trade_tax_rate AS trade, property_tax_rate AS property
     FROM city_taxes WHERE city=$1`, [city]
  ).catch(() => ({ rows: [] }));
  return rows[0] || DEFAULT_RATES;
}

async function setRates(city, { income, trade, property }, updatedBy) {
  if (!db.isReady()) return { ok: false };
  await db.query(
    `INSERT INTO city_taxes (city, income_tax_rate, trade_tax_rate, property_tax_rate, last_updated, updated_by)
     VALUES ($1,$2,$3,$4,NOW(),$5)
     ON CONFLICT (city) DO UPDATE
     SET income_tax_rate=$2, trade_tax_rate=$3, property_tax_rate=$4, last_updated=NOW(), updated_by=$5`,
    [city, income || DEFAULT_RATES.income, trade || DEFAULT_RATES.trade, property || DEFAULT_RATES.property, updatedBy]
  ).catch(() => {});
  logger.info(`[Tax] ${city} vergi oranları güncellendi: gelir=${income}% ticaret=${trade}% mülk=${property}%`);
  return { ok: true };
}

// Called on income events (jobs, business, etc.)
async function applyIncomeTax(userId, grossAmount) {
  if (!db.isReady()) return { netAmount: grossAmount, tax: 0 };
  const { rows } = await db.query(`SELECT city FROM users WHERE id=$1`, [userId])
    .catch(() => ({ rows: [] }));
  const city  = rows[0]?.city || 'İstanbul';
  const rates = await getRates(city);
  const tax   = Math.ceil(grossAmount * rates.income / 100);
  const net   = grossAmount - tax;

  // Add tax to city treasury (game_state)
  await db.query(
    `UPDATE game_state SET value = jsonb_set(
       value,
       '{treasury}',
       (COALESCE((value->>'treasury')::bigint, 0) + $1)::text::jsonb
     ) WHERE key='economy'`,
    [tax]
  ).catch(() => {});

  return { netAmount: net, tax, rate: rates.income, city };
}

// Scheduled: collect property tax daily from top earners
async function collectPropertyTax() {
  if (!db.isReady()) return;
  const { rows: users } = await db.query(
    `SELECT id, city, bank_money FROM users WHERE bank_money > 100000`
  ).catch(() => ({ rows: [] }));

  let totalCollected = 0;
  for (const u of users) {
    const rates = await getRates(u.city);
    const tax = Math.ceil(Number(u.bank_money) * rates.property / 100);
    if (tax > 0) {
      await db.query(`UPDATE users SET bank_money=GREATEST(0,bank_money-$2) WHERE id=$1`, [u.id, tax])
        .catch(() => {});
      totalCollected += Number(tax);
    }
  }
  if (totalCollected) logger.info(`[Tax] Mülk vergisi toplandı: ${totalCollected}₺ (${users.length} kullanıcı)`);
}

async function getAllRates() {
  if (!db.isReady()) return [];
  const { rows } = await db.query(`SELECT * FROM city_taxes ORDER BY city`).catch(() => ({ rows: [] }));
  return rows;
}

module.exports = { getRates, setRates, applyIncomeTax, collectPropertyTax, getAllRates };
