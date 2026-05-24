-- ═══════════════════════════════════════════════════════
-- UNDERSTATE — Supabase PostgreSQL Schema
-- Çalıştır: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

-- ── 1. USERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username            TEXT NOT NULL UNIQUE,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin','moderator')),
  banned              BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason          TEXT DEFAULT '',

  -- Stats
  level               INTEGER NOT NULL DEFAULT 1,
  xp                  BIGINT NOT NULL DEFAULT 0,
  money               BIGINT NOT NULL DEFAULT 1000,
  bank_money          BIGINT NOT NULL DEFAULT 0,
  under_coin          BIGINT NOT NULL DEFAULT 0,
  hp                  INTEGER NOT NULL DEFAULT 100,
  score               BIGINT NOT NULL DEFAULT 0,
  credit_score        INTEGER NOT NULL DEFAULT 500,
  merit_points        INTEGER NOT NULL DEFAULT 0,
  loyalty_points      INTEGER NOT NULL DEFAULT 0,

  -- Progression
  city                TEXT NOT NULL DEFAULT 'İstanbul',
  position_tag        TEXT DEFAULT '',
  education_level     TEXT DEFAULT 'İlkokul',
  education_progress  INTEGER DEFAULT 0,

  -- Collections (JSONB)
  inventory           JSONB NOT NULL DEFAULT '[]',
  equipped_items      JSONB NOT NULL DEFAULT '{}',
  holdings            JSONB NOT NULL DEFAULT '[]',
  game_data           JSONB NOT NULL DEFAULT '{}',
  push_subscriptions  JSONB NOT NULL DEFAULT '[]',

  -- Auth
  email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token  TEXT DEFAULT NULL,
  email_verify_expiry TIMESTAMPTZ DEFAULT NULL,
  refresh_token       TEXT DEFAULT NULL,
  reset_token         TEXT DEFAULT NULL,
  reset_token_expiry  TIMESTAMPTZ DEFAULT NULL,

  -- Meta
  is_online           BOOLEAN NOT NULL DEFAULT FALSE,
  socket_id           TEXT DEFAULT NULL,
  last_login          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_username_idx ON public.users (username);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS users_level_idx ON public.users (level DESC, xp DESC);
CREATE INDEX IF NOT EXISTS users_money_idx ON public.users (money DESC);
CREATE INDEX IF NOT EXISTS users_score_idx ON public.users (score DESC);
CREATE INDEX IF NOT EXISTS users_bank_idx ON public.users (bank_money DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. CHAT MESSAGES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     TEXT NOT NULL,
  message     TEXT NOT NULL,
  sender      TEXT NOT NULL,
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  filtered    BOOLEAN NOT NULL DEFAULT FALSE,
  msg_id      TEXT DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_channel_time_idx ON public.chat_messages (channel, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_user_idx ON public.chat_messages (user_id);

-- Auto-delete messages older than 30 days (pg_cron or app-level)

-- ── 3. ROOMS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  host        TEXT NOT NULL DEFAULT '',
  max_players INTEGER NOT NULL DEFAULT 20,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  players     JSONB NOT NULL DEFAULT '[]',
  game_state  JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS rooms_updated_at ON public.rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 4. GAME STATE (genel oyun verisi, Firebase RTDB yerini alır) ──────────────
CREATE TABLE IF NOT EXISTS public.game_state (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- İlk ekonomi kaydı
INSERT INTO public.game_state (key, value)
VALUES ('economy', '{"treasury":0,"inflation":0,"unemployment":0}')
ON CONFLICT (key) DO NOTHING;

-- ── 5. ECONOMY (ayrı tablo — sık güncellenir) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.economy (
  id          TEXT PRIMARY KEY DEFAULT 'main',
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.economy (id, data) VALUES ('main', '{}') ON CONFLICT DO NOTHING;

-- ── 6. ROW LEVEL SECURITY ────────────────────────────────────────────────────
-- Frontend anon key sadece okuyabilir; yazma server-side service role ile yapılır
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (leaderboard, chat geçmişi)
CREATE POLICY "public read users"  ON public.users         FOR SELECT USING (TRUE);
CREATE POLICY "public read chat"   ON public.chat_messages FOR SELECT USING (TRUE);
CREATE POLICY "public read rooms"  ON public.rooms         FOR SELECT USING (TRUE);
CREATE POLICY "public read state"  ON public.game_state    FOR SELECT USING (TRUE);
CREATE POLICY "public read eco"    ON public.economy       FOR SELECT USING (TRUE);

-- Yazma sadece service role (backend) — anon key yazamaz
-- (service_role her zaman RLS'yi bypass eder)

-- ── 7. REALTIME (Supabase Realtime kanalları) ───────────────────────────────
-- Dashboard → Database → Replication → Realtime'dan şunları etkinleştir:
-- chat_messages, game_state, economy, users (is_online, socket_id)
