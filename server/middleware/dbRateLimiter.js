/**
 * DB-Backed Rate Limiter
 *
 * In-memory Map yerine PostgreSQL kullanır.
 * Avantaj: Sunucu yeniden başladığında veya birden fazla instance çalıştığında
 * rate limit durumu korunur.
 *
 * Kullanım (server/routes/auth.js gibi kritik endpoint'lerde):
 *   const { createDbRateLimiter } = require('../middleware/dbRateLimiter');
 *   const loginLimiter = createDbRateLimiter(15 * 60 * 1000, 10, 'Çok fazla giriş');
 *   router.post('/login', loginLimiter, handler);
 */
const db     = require('../services/dbService');
const logger = require('../utils/logger');

/**
 * @param {number} windowMs  - Pencere süresi (ms)
 * @param {number} max       - Pencerede izin verilen max istek
 * @param {string} message   - 429 yanıtındaki mesaj
 */
function createDbRateLimiter(windowMs, max, message) {
  return async function dbRateLimitMiddleware(req, res, next) {
    const key = `http:${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();

    try {
      // Pencere dışındaki kayıtları sil + upsert
      await db.query(
        `INSERT INTO rate_limits (key, count, window_start)
         VALUES ($1, 1, $2)
         ON CONFLICT (key) DO UPDATE SET
           count        = CASE WHEN rate_limits.window_start + $3 < $2
                               THEN 1
                               ELSE rate_limits.count + 1 END,
           window_start = CASE WHEN rate_limits.window_start + $3 < $2
                               THEN $2
                               ELSE rate_limits.window_start END`,
        [key, now, windowMs]
      );

      const { rows } = await db.query(
        'SELECT count, window_start FROM rate_limits WHERE key = $1',
        [key]
      );
      const entry = rows[0];
      if (entry && Number(entry.count) > max) {
        const retryAfter = Math.ceil((Number(entry.window_start) + windowMs - now) / 1000);
        return res.status(429).json({
          success: false,
          message: message || 'Çok fazla istek. Lütfen bekleyin.',
          retryAfter,
        });
      }
    } catch (err) {
      // DB hatasında geçirgen davran — rate limiting hata fırlatmamalı
      logger.warn('[DbRateLimit] DB sorgusu başarısız, geçirgen devam ediliyor:', err.message);
    }
    next();
  };
}

// Periyodik temizlik — eski pencere kayıtlarını temizle (saatte bir)
setInterval(async () => {
  try {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1 saat önce
    await db.query('DELETE FROM rate_limits WHERE window_start < $1', [cutoff]);
  } catch (_) {}
}, 60 * 60 * 1000);

module.exports = { createDbRateLimiter };
