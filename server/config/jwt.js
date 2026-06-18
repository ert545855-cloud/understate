const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } = require('./constants');

// ── Fail-fast: JWT_SECRET zorunlu ─────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('\n[FATAL] JWT_SECRET ortam değişkeni tanımlı değil!');
  console.error('[FATAL] Lütfen .env dosyasına veya sunucu env\'sine JWT_SECRET ekleyin.');
  console.error('[FATAL] Örnek: JWT_SECRET=en_az_32_karakter_uzun_rastgele_string\n');
  process.exit(1);
}

const SECRET         = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_SECRET + '_refresh';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { signToken, verifyToken, signRefreshToken, verifyRefreshToken, SECRET };
