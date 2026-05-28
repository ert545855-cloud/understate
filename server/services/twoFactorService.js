// #35 Two-Factor Authentication (TOTP)
const db = require('./dbService');
const crypto = require('crypto');
const logger = require('../utils/logger');

// RFC 6238 TOTP — no external dep needed (simple implementation)
function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  str = str.toUpperCase().replace(/=+$/, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of str) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { bits -= 8; out.push((value >> bits) & 0xff); }
  }
  return Buffer.from(out);
}

function generateSecret() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const buf = crypto.randomBytes(20);
  for (let i = 0; i < 32; i++) secret += alphabet[buf[i % 20] % 32];
  return secret;
}

function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
}

function getTotp(secret, window = 0) {
  const time  = Math.floor(Date.now() / 30000) + window;
  const buf   = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(time));
  const key   = base32Decode(secret);
  const hmac  = crypto.createHmac('sha1', key).update(buf).digest();
  const off   = hmac[19] & 0xf;
  const code  = ((hmac[off] & 0x7f) << 24 | hmac[off+1] << 16 | hmac[off+2] << 8 | hmac[off+3]) % 1000000;
  return String(code).padStart(6, '0');
}

function verifyTotp(secret, token) {
  const t = String(token).replace(/\s/g, '');
  for (let w = -1; w <= 1; w++) {
    if (getTotp(secret, w) === t) return true;
  }
  return false;
}

async function setup2FA(userId) {
  if (!db.isReady()) return { ok: false };
  const secret      = generateSecret();
  const backupCodes = generateBackupCodes();
  await db.query(
    `INSERT INTO two_factor_auth (user_id, secret, backup_codes)
     VALUES ($1,$2,$3)
     ON CONFLICT (user_id) DO UPDATE SET secret=$2, backup_codes=$3, is_enabled=FALSE`,
    [userId, secret, backupCodes]
  ).catch(() => {});
  const { rows: u } = await db.query(`SELECT username FROM users WHERE id=$1`, [userId])
    .catch(() => ({ rows: [] }));
  const otpauth = `otpauth://totp/UNDERSTATE:${u[0]?.username || userId}?secret=${secret}&issuer=UNDERSTATE`;
  return { ok: true, secret, backupCodes, otpauth };
}

async function enable2FA(userId, token) {
  if (!db.isReady()) return { ok: false };
  const { rows } = await db.query(`SELECT secret FROM two_factor_auth WHERE user_id=$1`, [userId])
    .catch(() => ({ rows: [] }));
  if (!rows[0]) return { ok: false, message: '2FA kurulum bulunamadı' };
  if (!verifyTotp(rows[0].secret, token)) return { ok: false, message: 'Geçersiz kod' };
  await db.query(`UPDATE two_factor_auth SET is_enabled=TRUE WHERE user_id=$1`, [userId]).catch(() => {});
  await db.query(`UPDATE users SET two_factor_enabled=TRUE WHERE id=$1`, [userId]).catch(() => {});
  logger.info(`[2FA] Enabled for user ${userId}`);
  return { ok: true };
}

async function disable2FA(userId, token) {
  if (!db.isReady()) return { ok: false };
  const { rows } = await db.query(`SELECT secret FROM two_factor_auth WHERE user_id=$1 AND is_enabled=TRUE`, [userId])
    .catch(() => ({ rows: [] }));
  if (!rows[0]) return { ok: false, message: '2FA aktif değil' };
  if (!verifyTotp(rows[0].secret, token)) return { ok: false, message: 'Geçersiz kod' };
  await db.query(`UPDATE two_factor_auth SET is_enabled=FALSE WHERE user_id=$1`, [userId]).catch(() => {});
  await db.query(`UPDATE users SET two_factor_enabled=FALSE WHERE id=$1`, [userId]).catch(() => {});
  return { ok: true };
}

async function verify2FA(userId, token) {
  if (!db.isReady()) return false;
  const { rows } = await db.query(
    `SELECT secret, backup_codes FROM two_factor_auth WHERE user_id=$1 AND is_enabled=TRUE`, [userId]
  ).catch(() => ({ rows: [] }));
  if (!rows[0]) return false;

  if (verifyTotp(rows[0].secret, token)) return true;

  // Check backup codes
  const codes = rows[0].backup_codes || [];
  const t = token.toUpperCase();
  const idx = codes.indexOf(t);
  if (idx !== -1) {
    const newCodes = codes.filter((_, i) => i !== idx);
    await db.query(`UPDATE two_factor_auth SET backup_codes=$2 WHERE user_id=$1`, [userId, newCodes]).catch(() => {});
    return true;
  }
  return false;
}

async function is2FAEnabled(userId) {
  if (!db.isReady()) return false;
  const { rows } = await db.query(
    `SELECT is_enabled FROM two_factor_auth WHERE user_id=$1`, [userId]
  ).catch(() => ({ rows: [] }));
  return rows[0]?.is_enabled === true;
}

module.exports = { setup2FA, enable2FA, disable2FA, verify2FA, is2FAEnabled, verifyTotp };
