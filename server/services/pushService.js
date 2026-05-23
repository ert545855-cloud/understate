const webpush = require('web-push');
const logger = require('../utils/logger');

let _initialized = false;

function init() {
  if (_initialized) return;
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    logger.warn('[Push] VAPID anahtarları eksik — push bildirimleri devre dışı');
    return;
  }
  webpush.setVapidDetails('mailto:admin@understate.game', pub, priv);
  _initialized = true;
  logger.info('[Push] Web Push başlatıldı ✓');
}

async function sendPush(subscription, payload) {
  if (!_initialized) return { ok: false, reason: 'Push devre dışı' };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { ok: false, expired: true };
    }
    logger.warn('[Push] Gönderim hatası:', err.message);
    return { ok: false, reason: err.message };
  }
}

async function sendPushToMany(subscriptions, payload) {
  if (!_initialized || !subscriptions?.length) return;
  const results = await Promise.allSettled(
    subscriptions.map(sub => sendPush(sub, payload))
  );
  const expired = results.filter(r => r.value?.expired).length;
  const ok      = results.filter(r => r.value?.ok).length;
  logger.info(`[Push] Toplu gönderim: ${ok}/${subscriptions.length} başarılı, ${expired} süresi dolmuş`);
  return { ok, expired, total: subscriptions.length };
}

module.exports = { init, sendPush, sendPushToMany };
