-- UNDERSTATE — Eksik Tablolar (Supabase Dashboard'da çalıştırın)
-- Bu SQL dosyasını Supabase → SQL Editor'e yapıştırıp çalıştırın.

-- 1. global_chat (chat_messages'ın alias view'ı)
CREATE OR REPLACE VIEW public.global_chat AS
  SELECT
    id,
    channel,
    message,
    sender,
    user_id,
    filtered,
    msg_id,
    created_at
  FROM public.chat_messages
  WHERE channel = 'global';

-- 2. players tablosu (anlık oyuncu pozisyon takibi)
CREATE TABLE IF NOT EXISTS public.players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE,
  username      TEXT NOT NULL,
  socket_id     TEXT,
  position      JSONB DEFAULT '{}'::jsonb,
  health        INTEGER DEFAULT 100,
  level         INTEGER DEFAULT 1,
  city          TEXT DEFAULT '',
  is_online     BOOLEAN DEFAULT TRUE,
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS players_user_id_idx   ON public.players(user_id);
CREATE INDEX IF NOT EXISTS players_is_online_idx ON public.players(is_online);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "players_select_all" ON public.players
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "players_insert_self" ON public.players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "players_update_self" ON public.players
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. stock_market tablosu
CREATE TABLE IF NOT EXISTS public.stock_market (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  price          NUMERIC(12,2) DEFAULT 0,
  change         NUMERIC(8,2) DEFAULT 0,
  change_percent NUMERIC(8,2) DEFAULT 0,
  volume         INTEGER DEFAULT 0,
  high           NUMERIC(12,2) DEFAULT 0,
  low            NUMERIC(12,2) DEFAULT 0,
  history        JSONB DEFAULT '[]'::jsonb,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_market_company_id_idx ON public.stock_market(company_id);

ALTER TABLE public.stock_market ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "stock_select_all" ON public.stock_market FOR SELECT USING (true);

-- 4. game_events tablosu
CREATE TABLE IF NOT EXISTS public.game_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  effect      TEXT,
  data        JSONB DEFAULT '{}'::jsonb,
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_events_created_at_idx ON public.game_events(created_at DESC);
CREATE INDEX IF NOT EXISTS game_events_expires_at_idx ON public.game_events(expires_at);

ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "events_select_all" ON public.game_events FOR SELECT USING (true);

-- 5. elections tablosu (seçimler)
CREATE TABLE IF NOT EXISTS public.elections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL,          -- 'cumhurbaskani', 'baskan', 'meclis', etc.
  city          TEXT DEFAULT 'ulusal',
  candidates    JSONB DEFAULT '[]'::jsonb,
  votes         JSONB DEFAULT '{}'::jsonb,
  status        TEXT DEFAULT 'active',  -- 'active', 'ended', 'cancelled'
  started_by    UUID REFERENCES public.users(id),
  ends_at       TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.election_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id   UUID REFERENCES public.elections(id) ON DELETE CASCADE,
  voter_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
  candidate_id  UUID REFERENCES public.users(id),
  candidate_username TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(election_id, voter_id)
);

CREATE INDEX IF NOT EXISTS election_votes_election_id_idx ON public.election_votes(election_id);
CREATE INDEX IF NOT EXISTS election_votes_voter_id_idx    ON public.election_votes(voter_id);

ALTER TABLE public.elections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "elections_select_all"  ON public.elections      FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "election_votes_select" ON public.election_votes FOR SELECT USING (true);

-- 6. push_subscriptions tablosu (ayrı tablo olarak)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT,
  auth        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subs_user_id_idx ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "push_subs_own" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Realtime tabloları aktif et
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_market;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.elections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
