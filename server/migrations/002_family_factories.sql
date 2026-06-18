-- UNDERSTATE — Migration 002: Aile Fabrikaları + DB Rate Limiter
-- Çalıştır: psql $DATABASE_URL -f server/migrations/002_family_factories.sql
-- Güvenli: IF NOT EXISTS kullanır, tekrar çalıştırılabilir.

-- ── Aile Fabrikaları ─────────────────────────────────────────────────────────
-- EconomicEmpireScreen'deki aile işletme sistemi için sunucu tarafı kayıt.
-- Gelir toplama zamanlaması (last_collected_at) burada tutulur;
-- bu sayede istemciden gelen miktar/zaman bilgisi asla doğrudan güvenilmez.
CREATE TABLE IF NOT EXISTS family_factories (
  id                TEXT PRIMARY KEY,
  family_id         TEXT NOT NULL,
  factory_type      TEXT NOT NULL,        -- sarap | tekstil | rafine | insaat | mucevher
  name              TEXT NOT NULL,
  monthly_income    BIGINT NOT NULL DEFAULT 0,
  last_collected_at BIGINT NOT NULL DEFAULT 0,  -- Unix ms; 0 = hiç toplanmadı
  created_by        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_factories_family ON family_factories(family_id);

-- ── HTTP Rate Limiter (DB-backed) ─────────────────────────────────────────────
-- server/middleware/dbRateLimiter.js tarafından kullanılır.
-- In-memory Map'e göre avantajı: sunucu yeniden başlasa veya birden fazla
-- instance çalışsa da pencere durumu korunur.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT    NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  window_start BIGINT  NOT NULL,
  PRIMARY KEY (key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
