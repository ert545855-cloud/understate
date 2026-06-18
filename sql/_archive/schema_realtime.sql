-- ============================================================
-- UNDERSTATE — Real-Time Multiplayer Ek Tablolar
-- PostgreSQL (Replit Database veya Supabase)
-- Çalıştırma: psql $DATABASE_URL -f sql/schema_realtime.sql
-- ============================================================

-- Bildirimler tablosu
CREATE TABLE IF NOT EXISTS notifications (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,           -- NULL = tüm oyunculara
  type         TEXT DEFAULT 'info',
  title        TEXT DEFAULT '',
  body         TEXT DEFAULT '',
  data         JSONB DEFAULT '{}',
  read         BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notif_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notif_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notif_read_idx ON notifications(read);

-- Aileler tablosu (gangs.type='family' ile ayrı saklanabilir,
-- ancak game_state KV store yeterli; bu tablo gelecek için hazır)
CREATE TABLE IF NOT EXISTS families (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  leader_id    TEXT,
  leader       TEXT,
  members      JSONB DEFAULT '[]',
  treasury     BIGINT DEFAULT 0,
  power        INTEGER DEFAULT 0,
  territory    TEXT DEFAULT '',
  logo         TEXT,
  description  TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS families_leader_id_idx ON families(leader_id);

-- İttifaklar tablosu
CREATE TABLE IF NOT EXISTS alliances (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  tag          TEXT DEFAULT '',
  leader_id    TEXT,
  leader       TEXT,
  members      JSONB DEFAULT '[]',
  type         TEXT DEFAULT 'open',
  description  TEXT DEFAULT '',
  treasury     BIGINT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Holdingler / Şirketler tablosu
CREATE TABLE IF NOT EXISTS holdings (
  id           TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL,
  owner_name   TEXT,
  name         TEXT NOT NULL,
  type         TEXT DEFAULT 'sirket',
  sector       TEXT DEFAULT '',
  value        BIGINT DEFAULT 0,
  revenue      BIGINT DEFAULT 0,
  employees    INTEGER DEFAULT 0,
  level        INTEGER DEFAULT 1,
  data         JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS holdings_owner_id_idx ON holdings(owner_id);

-- Seçimler tablosu (tam yapılı, oylanabilir)
CREATE TABLE IF NOT EXISTS elections_v2 (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  city         TEXT DEFAULT 'ulusal',
  candidates   JSONB DEFAULT '[]',
  votes        JSONB DEFAULT '{}',
  status       TEXT DEFAULT 'active',
  started_by   TEXT,
  ends_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS elections_v2_status_idx ON elections_v2(status);

-- Savaş kayıtları
CREATE TABLE IF NOT EXISTS war_logs (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  attacker_id  TEXT,
  attacker     TEXT,
  defender_id  TEXT,
  defender     TEXT,
  type         TEXT DEFAULT 'gang_war',
  result       TEXT,
  data         JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS war_logs_created_at_idx ON war_logs(created_at DESC);

-- game_state tablosu (zaten var, bu idempotent)
CREATE TABLE IF NOT EXISTS game_state (
  key          TEXT PRIMARY KEY,
  value        JSONB,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- chat_messages tablosu (zaten var, bu idempotent)
CREATE TABLE IF NOT EXISTS chat_messages (
  id           BIGSERIAL PRIMARY KEY,
  channel      TEXT DEFAULT 'global',
  message      TEXT,
  sender       TEXT,
  user_id      TEXT,
  filtered     BOOLEAN DEFAULT false,
  msg_id       TEXT UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS chat_messages_channel_idx ON chat_messages(channel);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);

-- users tablosu (zaten var, gerekli sütunlar ekleniyor)
ALTER TABLE users ADD COLUMN IF NOT EXISTS score         BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_money    BIGINT DEFAULT 5000;
ALTER TABLE users ADD COLUMN IF NOT EXISTS under_coin    INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hp            INTEGER DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_score  INTEGER DEFAULT 500;
ALTER TABLE users ADD COLUMN IF NOT EXISTS merit_points  INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position_tag  TEXT DEFAULT 'Vatandaş';
ALTER TABLE users ADD COLUMN IF NOT EXISTS education_level TEXT DEFAULT 'İlkokul';
ALTER TABLE users ADD COLUMN IF NOT EXISTS education_progress INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS holdings      JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS game_data     JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online     BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS socket_id     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login    TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned        BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role          TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS achievements  JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS inventory     JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_items JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stats         JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();
