// #24 Player Marketplace
const db    = require('./dbService');
const logger = require('../utils/logger');
const notif  = require('./notificationService');

const MAX_LISTINGS_PER_USER = 10;
const LISTING_FEE_RATE = 0.02; // %2 listeleme ücreti
const LISTING_DURATION_DAYS = 7;

async function createListing(sellerId, { itemType, itemName, quantity, price, description }) {
  if (!db.isReady()) return { ok: false, message: 'DB bağlı değil' };
  price = parseInt(price);
  quantity = parseInt(quantity) || 1;
  if (price < 1)    return { ok: false, message: 'Fiyat en az 1₺ olmalı' };
  if (quantity < 1) return { ok: false, message: 'Miktar en az 1 olmalı' };

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS c FROM marketplace_listings WHERE seller_id=$1 AND is_active=TRUE`,
    [sellerId]
  ).catch(() => ({ rows: [{ c: 0 }] }));
  if (parseInt(countRows[0]?.c) >= MAX_LISTINGS_PER_USER)
    return { ok: false, message: `En fazla ${MAX_LISTINGS_PER_USER} aktif ilan açabilirsiniz` };

  const fee = Math.ceil(price * LISTING_FEE_RATE);
  const { rows: u } = await db.query(`SELECT money FROM users WHERE id=$1`, [sellerId])
    .catch(() => ({ rows: [] }));
  if (!u[0] || BigInt(u[0].money) < BigInt(fee))
    return { ok: false, message: `Listeleme ücreti: ${fee}₺ (yetersiz bakiye)` };

  await db.query(`UPDATE users SET money=money-$2 WHERE id=$1`, [sellerId, fee]).catch(() => {});

  const expires = new Date(Date.now() + LISTING_DURATION_DAYS * 86400000);
  const { rows } = await db.query(
    `INSERT INTO marketplace_listings (seller_id,item_type,item_name,quantity,price,description,expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [sellerId, itemType, itemName, quantity, price, description || '', expires]
  ).catch(() => ({ rows: [] }));
  if (!rows[0]) return { ok: false, message: 'İlan açılamadı' };
  logger.info(`[Market] Yeni ilan: ${itemName} x${quantity} @${price}₺ by ${sellerId}`);
  return { ok: true, listingId: rows[0].id, fee };
}

async function buyListing(buyerId, listingId) {
  if (!db.isReady()) return { ok: false, message: 'DB bağlı değil' };
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: ls } = await client.query(
      `SELECT * FROM marketplace_listings WHERE id=$1 AND is_active=TRUE FOR UPDATE`,
      [listingId]
    );
    const listing = ls[0];
    if (!listing) { await client.query('ROLLBACK'); return { ok: false, message: 'İlan bulunamadı' }; }
    if (listing.seller_id === buyerId) { await client.query('ROLLBACK'); return { ok: false, message: 'Kendi ilanınızı satın alamazsınız' }; }

    const { rows: bu } = await client.query(`SELECT money FROM users WHERE id=$1 FOR UPDATE`, [buyerId]);
    if (!bu[0] || BigInt(bu[0].money) < BigInt(listing.price))
      { await client.query('ROLLBACK'); return { ok: false, message: 'Yetersiz bakiye' }; }

    await client.query(`UPDATE users SET money=money-$2 WHERE id=$1`, [buyerId, listing.price]);
    await client.query(`UPDATE users SET money=money+$2 WHERE id=$1`, [listing.seller_id, listing.price]);
    await client.query(`UPDATE marketplace_listings SET is_active=FALSE WHERE id=$1`, [listingId]);
    await client.query(
      `INSERT INTO marketplace_transactions (listing_id,buyer_id,seller_id,item_name,quantity,price)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [listingId, buyerId, listing.seller_id, listing.item_name, listing.quantity, listing.price]
    );
    await client.query('COMMIT');
    logger.info(`[Market] Satın alma: listing=${listingId} buyer=${buyerId} price=${listing.price}₺`);
    // Notify seller
    const { rows: br } = await db.query(`SELECT username FROM users WHERE id=$1`, [buyerId]).catch(() => ({ rows: [] }));
    if (br[0]) notif.notifyMarketplaceSold(listing.seller_id, br[0].username, listing.item_name, listing.price).catch(() => {});
    return { ok: true, item: listing.item_name, quantity: listing.quantity, price: listing.price };
  } catch(e) {
    await client.query('ROLLBACK');
    return { ok: false, message: 'Satın alma başarısız' };
  } finally { client.release(); }
}

async function getListings({ page = 1, limit = 20, itemType, search, sortBy = 'created_at' } = {}) {
  if (!db.isReady()) return { listings: [], total: 0 };
  const offset = (page - 1) * limit;
  const conditions = ['ml.is_active=TRUE', 'ml.expires_at > NOW()'];
  const params = [];
  if (itemType) { params.push(itemType); conditions.push(`ml.item_type=$${params.length}`); }
  if (search)   { params.push(`%${search}%`); conditions.push(`ml.item_name ILIKE $${params.length}`); }
  const where = conditions.join(' AND ');
  const orderMap = { price: 'ml.price', created_at: 'ml.created_at', quantity: 'ml.quantity' };
  const order = orderMap[sortBy] || 'ml.created_at';

  const countQ = await db.query(`SELECT COUNT(*) AS c FROM marketplace_listings ml WHERE ${where}`, params)
    .catch(() => ({ rows: [{ c: 0 }] }));
  const total = parseInt(countQ.rows[0]?.c || 0);

  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT ml.*, u.username AS seller_username
     FROM marketplace_listings ml JOIN users u ON u.id=ml.seller_id
     WHERE ${where} ORDER BY ${order} DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  ).catch(() => ({ rows: [] }));
  return { listings: rows, total, pages: Math.ceil(total / limit) };
}

async function cancelListing(sellerId, listingId) {
  if (!db.isReady()) return { ok: false };
  const { rows } = await db.query(
    `UPDATE marketplace_listings SET is_active=FALSE WHERE id=$1 AND seller_id=$2 AND is_active=TRUE RETURNING id`,
    [listingId, sellerId]
  ).catch(() => ({ rows: [] }));
  return { ok: rows.length > 0 };
}

module.exports = { createListing, buyListing, getListings, cancelListing };
