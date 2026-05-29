// #29 #30 #31 #32 Parliament + Election + Campaign + Presidency
const db    = require('./dbService');
const logger = require('../utils/logger');
const notif  = require('./notificationService');

const BILL_DURATION_HOURS = 48;
const CAMPAIGN_VOTE_COST  = 10000; // 10k₺ per 1% vote boost, max 10%

// ── Bills ────────────────────────────────────────────────────────────────────
async function proposeBill(userId, { title, description, billType = 'law', metadata = {} }) {
  if (!db.isReady()) return { ok: false, message: 'DB bağlı değil' };
  const { rows: u } = await db.query(
    `SELECT username, game_data FROM users WHERE id=$1`, [userId]
  ).catch(() => ({ rows: [] }));
  if (!u[0]) return { ok: false, message: 'Kullanıcı bulunamadı' };

  const partyName = u[0].game_data?.party || null;
  if (!partyName) return { ok: false, message: 'Yasa önerisi için bir partide olmalısınız' };

  const ends = new Date(Date.now() + BILL_DURATION_HOURS * 3600000);
  const { rows } = await db.query(
    `INSERT INTO parliament_bills (title, description, proposed_by, party_name, bill_type, voting_ends_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [title.slice(0, 100), (description || '').slice(0, 500), userId, partyName, billType, ends, JSON.stringify(metadata)]
  ).catch(() => ({ rows: [] }));
  if (!rows[0]) return { ok: false, message: 'Teklif oluşturulamadı' };
  logger.info(`[Parliament] Yeni teklif: "${title}" by ${u[0].username}`);
  return { ok: true, billId: rows[0].id, votingEndsAt: ends };
}

async function voteOnBill(userId, billId, vote) {
  if (!db.isReady()) return { ok: false };
  if (!['for','against','abstain'].includes(vote))
    return { ok: false, message: 'Geçersiz oy (for/against/abstain)' };

  const { rows: b } = await db.query(
    `SELECT * FROM parliament_bills WHERE id=$1 AND status='voting'`, [billId]
  ).catch(() => ({ rows: [] }));
  if (!b[0]) return { ok: false, message: 'Aktif oylama bulunamadı' };
  if (new Date(b[0].voting_ends_at) < new Date())
    return { ok: false, message: 'Oylama süresi doldu' };

  try {
    await db.query(
      `INSERT INTO parliament_votes (bill_id, voter_id, vote) VALUES ($1,$2,$3)`,
      [billId, userId, vote]
    );
    if (vote !== 'abstain') {
      const col = vote === 'for' ? 'votes_for' : 'votes_against';
      await db.query(`UPDATE parliament_bills SET ${col}=${col}+1 WHERE id=$1`, [billId]);
    }
    // Notify bill proposer of the vote
    if (b[0].proposed_by && b[0].proposed_by !== userId) {
      const { rows: vr } = await db.query(`SELECT username FROM users WHERE id=$1`, [userId]).catch(() => ({ rows: [] }));
      if (vr[0]) notif.notifyParliamentVote(b[0].proposed_by, vr[0].username, b[0].title, vote).catch(() => {});
    }
    return { ok: true };
  } catch(e) {
    if (e.code === '23505') return { ok: false, message: 'Zaten oy kullandınız' };
    return { ok: false, message: e.message };
  }
}

async function settleBills() {
  if (!db.isReady()) return;
  const { rows } = await db.query(
    `SELECT * FROM parliament_bills WHERE status='voting' AND voting_ends_at < NOW()`
  ).catch(() => ({ rows: [] }));
  for (const bill of rows) {
    const passed = bill.votes_for > bill.votes_against;
    await db.query(
      `UPDATE parliament_bills SET status=$2 WHERE id=$1`,
      [bill.id, passed ? 'passed' : 'rejected']
    ).catch(() => {});
    logger.info(`[Parliament] Yasa ${bill.id} "${bill.title}": ${passed ? 'KABUL' : 'RED'}`);
    // Notify proposer of result
    if (bill.proposed_by) {
      notif.notifyParliamentResult(bill.proposed_by, bill.title, passed).catch(() => {});
    }
  }
}

async function getBills({ status, page = 1, limit = 20 } = {}) {
  if (!db.isReady()) return { bills: [], total: 0 };
  const params = [];
  let where = '';
  if (status) { params.push(status); where = `WHERE pb.status=$1`; }
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT pb.*, u.username AS proposed_by_username
     FROM parliament_bills pb LEFT JOIN users u ON u.id=pb.proposed_by
     ${where} ORDER BY pb.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).catch(() => ({ rows: [] }));
  return { bills: rows };
}

// ── Campaign Spending ────────────────────────────────────────────────────────
async function spendCampaign(userId, { electionId, campaignType, amount }) {
  if (!db.isReady()) return { ok: false };
  amount = parseInt(amount);
  if (amount < 1000) return { ok: false, message: 'Minimum kampanya harcaması 1.000₺' };

  const { rows: u } = await db.query(
    `SELECT money, game_data FROM users WHERE id=$1`, [userId]
  ).catch(() => ({ rows: [] }));
  if (!u[0] || BigInt(u[0].money) < BigInt(amount))
    return { ok: false, message: 'Yetersiz bakiye' };

  const boost = Math.min(10, amount / CAMPAIGN_VOTE_COST); // max %10
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET money=money-$2 WHERE id=$1`, [userId, amount]);
    await client.query(
      `INSERT INTO campaign_spending (user_id,party_name,election_id,amount_spent,campaign_type,vote_boost)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, u[0].game_data?.party || '', electionId || null, amount, campaignType || 'ads', boost]
    );
    await client.query('COMMIT');
    return { ok: true, boost: boost.toFixed(2), spent: amount };
  } catch(e) {
    await client.query('ROLLBACK');
    return { ok: false, message: 'Kampanya harcaması başarısız' };
  } finally { client.release(); }
}

// ── Presidency ────────────────────────────────────────────────────────────────
async function grantPresidency(userId, durationDays = 30) {
  if (!db.isReady()) return;
  const until = new Date(Date.now() + durationDays * 86400000);
  await db.query(
    `UPDATE users SET presidency_until=$2 WHERE id=$1`, [userId, until]
  ).catch(() => {});
  logger.info(`[Parliament] Cumhurbaşkanlığı: user=${userId} until=${until.toISOString()}`);
}

async function isPresident(userId) {
  if (!db.isReady()) return false;
  const { rows } = await db.query(
    `SELECT 1 FROM users WHERE id=$1 AND presidency_until > NOW()`, [userId]
  ).catch(() => ({ rows: [] }));
  return rows.length > 0;
}

module.exports = { proposeBill, voteOnBill, settleBills, getBills, spendCampaign, grantPresidency, isPresident };
