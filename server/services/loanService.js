// #25 Loan / Credit System
const db    = require('./dbService');
const logger = require('../utils/logger');
const notif  = require('./notificationService');

const MAX_LOAN_BY_CREDIT = { 300: 5000, 400: 15000, 500: 50000, 600: 150000, 700: 500000, 800: 1500000, 900: 5000000, 1000: 10000000 };
const BASE_RATE = 8.0;     // %8
const TERM_DAYS = 30;

function maxLoanAmount(creditScore) {
  let max = 5000;
  for (const [score, limit] of Object.entries(MAX_LOAN_BY_CREDIT)) {
    if (creditScore >= parseInt(score)) max = limit;
  }
  return max;
}

async function requestLoan(userId, amount) {
  if (!db.isReady()) return { ok: false, message: 'DB bağlı değil' };
  amount = parseInt(amount);
  if (amount < 1000) return { ok: false, message: 'Minimum kredi 1.000₺' };

  const { rows: u } = await db.query(
    `SELECT credit_score, is_frozen FROM users WHERE id=$1`, [userId]
  ).catch(() => ({ rows: [] }));
  if (!u[0]) return { ok: false, message: 'Kullanıcı bulunamadı' };
  if (u[0].is_frozen) return { ok: false, message: 'Hesabınız dondurulmuş' };

  const limit = maxLoanAmount(u[0].credit_score);
  if (amount > limit) return { ok: false, message: `Kredi skorunuza göre maksimum kredi: ${limit}₺` };

  // Check existing active loans
  const { rows: active } = await db.query(
    `SELECT COALESCE(SUM(amount_due - amount_paid),0) AS total FROM loans WHERE user_id=$1 AND status='active'`,
    [userId]
  ).catch(() => ({ rows: [{ total: 0 }] }));
  if (parseInt(active[0]?.total) + amount > limit)
    return { ok: false, message: 'Toplam borcunuz kredi limitinizi aşıyor' };

  const rate = BASE_RATE - Math.max(0, (u[0].credit_score - 500) / 100);
  const amountDue = Math.ceil(amount * (1 + rate / 100));
  const dueDate = new Date(Date.now() + TERM_DAYS * 86400000);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET money=money+$2 WHERE id=$1`, [userId, amount]);
    const { rows } = await client.query(
      `INSERT INTO loans (user_id,principal,interest_rate,amount_due,due_date)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [userId, amount, rate.toFixed(2), amountDue, dueDate]
    );
    await client.query('COMMIT');
    logger.info(`[Loan] User ${userId} aldı: ${amount}₺ @${rate.toFixed(1)}% → geri=${amountDue}₺`);
    return { ok: true, loanId: rows[0].id, amount, amountDue, interestRate: rate.toFixed(1), dueDate };
  } catch(e) {
    await client.query('ROLLBACK');
    return { ok: false, message: 'Kredi alınamadı' };
  } finally { client.release(); }
}

async function repayLoan(userId, loanId, amount) {
  if (!db.isReady()) return { ok: false };
  amount = parseInt(amount);
  const { rows: ls } = await db.query(
    `SELECT * FROM loans WHERE id=$1 AND user_id=$2 AND status='active'`, [loanId, userId]
  ).catch(() => ({ rows: [] }));
  const loan = ls[0];
  if (!loan) return { ok: false, message: 'Aktif borç bulunamadı' };

  const remaining = loan.amount_due - loan.amount_paid;
  const pay = Math.min(amount, remaining);
  const { rows: u } = await db.query(`SELECT money FROM users WHERE id=$1`, [userId])
    .catch(() => ({ rows: [] }));
  if (!u[0] || BigInt(u[0].money) < BigInt(pay))
    return { ok: false, message: 'Yetersiz bakiye' };

  const newPaid = loan.amount_paid + pay;
  const done    = newPaid >= loan.amount_due;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET money=money-$2 WHERE id=$1`, [userId, pay]);
    await client.query(
      `UPDATE loans SET amount_paid=$2, status=$3 WHERE id=$1`,
      [loanId, newPaid, done ? 'paid' : 'active']
    );
    if (done) {
      // Improve credit score on full repayment
      await client.query(`UPDATE users SET credit_score=LEAST(1000,credit_score+10) WHERE id=$1`, [userId]);
    }
    await client.query('COMMIT');
    return { ok: true, paid: pay, remaining: loan.amount_due - newPaid, closed: done };
  } catch(e) {
    await client.query('ROLLBACK');
    return { ok: false, message: 'Ödeme başarısız' };
  } finally { client.release(); }
}

async function getLoans(userId) {
  if (!db.isReady()) return [];
  const { rows } = await db.query(
    `SELECT * FROM loans WHERE user_id=$1 ORDER BY created_at DESC`, [userId]
  ).catch(() => ({ rows: [] }));
  return rows;
}

async function processOverdueLoans() {
  if (!db.isReady()) return 0;
  const { rows } = await db.query(
    `SELECT * FROM loans WHERE status='active' AND due_date < NOW()`
  ).catch(() => ({ rows: [] }));
  let count = 0;
  for (const loan of rows) {
    await db.query(`UPDATE loans SET status='defaulted' WHERE id=$1`, [loan.id]).catch(() => {});
    await db.query(`UPDATE users SET credit_score=GREATEST(300,credit_score-50) WHERE id=$1`, [loan.user_id]).catch(() => {});
    // Notify borrower
    notif.notifyLoanOverdue(loan.user_id, loan.amount_due - loan.amount_paid).catch(() => {});
    count++;
  }
  if (count) logger.warn(`[Loan] ${count} adet kredi vadesi doldu (defaulted)`);
  return count;
}

module.exports = { requestLoan, repayLoan, getLoans, processOverdueLoans, maxLoanAmount };
