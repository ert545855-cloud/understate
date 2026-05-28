const {
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_MAX,
  REGISTER_RATE_LIMIT_MAX,
} = require('../config/constants');

const store = new Map();

function createRateLimiter(windowMs, max, message) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!store.has(key)) {
      store.set(key, { count: 1, windowStart: now });
      return next();
    }

    const entry = store.get(key);
    if (now - entry.windowStart > windowMs) {
      entry.count = 1;
      entry.windowStart = now;
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      return res.status(429).json({
        success: false,
        message: message || 'Çok fazla istek. Lütfen bekleyin.',
        retryAfter,
      });
    }

    next();
  };
}

// Genel endpoint limiti
const generalLimiter = createRateLimiter(
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  'İstek limiti aşıldı. Lütfen biraz bekleyin.'
);

// Login, şifre sıfırlama, token yenileme
const authLimiter = createRateLimiter(
  RATE_LIMIT_WINDOW,
  AUTH_RATE_LIMIT_MAX,
  'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.'
);

// Kayıt — daha kısıtlı ama login'den bağımsız
const registerLimiter = createRateLimiter(
  RATE_LIMIT_WINDOW,
  REGISTER_RATE_LIMIT_MAX,
  'Bu IP\'den çok fazla kayıt denemesi yapıldı. Lütfen 15 dakika bekleyin.'
);

// Periyodik temizlik
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) store.delete(key);
  }
}, RATE_LIMIT_WINDOW);

module.exports = { generalLimiter, authLimiter, registerLimiter };
