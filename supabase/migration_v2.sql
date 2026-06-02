-- UNDERSTATE: Missing Tables Migration v2
-- Run: psql $DATABASE_URL -f supabase/migration_v2.sql

-- Elections
CREATE TABLE IF NOT EXISTS public.elections (
  id          SERIAL PRIMARY KEY,
  type        TEXT NOT NULL,
  city        TEXT NOT NULL DEFAULT 'ulusal',
  candidates  JSONB DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'active',
  ends_at     TIMESTAMPTZ,
  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Election votes
CREATE TABLE IF NOT EXISTS public.election_votes (
  id                  SERIAL PRIMARY KEY,
  election_id         INT REFERENCES public.elections(id) ON DELETE CASCADE,
  voter_id            INT,
  voter_username      TEXT,
  candidate_username  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(election_id, voter_id)
);

-- Loans / credit
CREATE TABLE IF NOT EXISTS public.loans (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL,
  principal     BIGINT NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 8.0,
  amount_due    BIGINT NOT NULL,
  amount_paid   BIGINT NOT NULL DEFAULT 0,
  due_date      TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON public.loans(user_id);

-- Marketplace listings
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id          SERIAL PRIMARY KEY,
  seller_id   INT NOT NULL,
  item_type   TEXT,
  item_name   TEXT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1,
  price       BIGINT NOT NULL,
  description TEXT DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_active ON public.marketplace_listings(is_active, created_at DESC);

-- Marketplace transactions
CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id          SERIAL PRIMARY KEY,
  listing_id  INT,
  buyer_id    INT NOT NULL,
  seller_id   INT NOT NULL,
  item_name   TEXT,
  quantity    INT NOT NULL DEFAULT 1,
  price       BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships
CREATE TABLE IF NOT EXISTS public.friendships (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL,
  friend_id   INT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);

-- User blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id          SERIAL PRIMARY KEY,
  blocker_id  INT NOT NULL,
  blocked_id  INT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Direct messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INT NOT NULL,
  receiver_id INT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON public.direct_messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_sender   ON public.direct_messages(sender_id, created_at DESC);

-- User sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL,
  token_hash  TEXT NOT NULL,
  ip_address  TEXT,
  device_info TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.user_sessions(token_hash);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  data        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id, created_at DESC);

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id          SERIAL PRIMARY KEY,
  referrer_id INT NOT NULL,
  referred_id INT NOT NULL,
  bonus_paid  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- Portfolio history
CREATE TABLE IF NOT EXISTS public.portfolio_history (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL,
  total_value BIGINT NOT NULL DEFAULT 0,
  money       BIGINT NOT NULL DEFAULT 0,
  bank_money  BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON public.portfolio_history(user_id, recorded_at DESC);

-- Parliament bills
CREATE TABLE IF NOT EXISTS public.parliament_bills (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  proposed_by   TEXT,
  proposed_by_id INT,
  status        TEXT NOT NULL DEFAULT 'pending',
  votes_for     INT NOT NULL DEFAULT 0,
  votes_against INT NOT NULL DEFAULT 0,
  ends_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Parliament votes
CREATE TABLE IF NOT EXISTS public.parliament_votes (
  id        SERIAL PRIMARY KEY,
  bill_id   INT REFERENCES public.parliament_bills(id) ON DELETE CASCADE,
  voter_id  INT NOT NULL,
  vote      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bill_id, voter_id)
);

-- Money transfers
CREATE TABLE IF NOT EXISTS public.money_transfers (
  id          SERIAL PRIMARY KEY,
  sender_id   INT NOT NULL,
  receiver_id INT NOT NULL,
  amount      BIGINT NOT NULL,
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transfers_sender   ON public.money_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_transfers_receiver ON public.money_transfers(receiver_id);

-- Daily streaks
CREATE TABLE IF NOT EXISTS public.daily_streaks (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  streak_count INT NOT NULL DEFAULT 0,
  last_claim   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- City taxes
CREATE TABLE IF NOT EXISTS public.city_taxes (
  id         SERIAL PRIMARY KEY,
  city       TEXT NOT NULL UNIQUE,
  rate       NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Campaign spending (for elections)
CREATE TABLE IF NOT EXISTS public.campaign_spending (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL,
  election_id INT,
  amount      BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Game events log
CREATE TABLE IF NOT EXISTS public.game_events (
  id         SERIAL PRIMARY KEY,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT DEFAULT '',
  data       JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timed events (server-created events)
CREATE TABLE IF NOT EXISTS public.timed_events (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_type  TEXT NOT NULL,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Event participations
CREATE TABLE IF NOT EXISTS public.event_participations (
  id          SERIAL PRIMARY KEY,
  event_id    INT,
  user_id     INT NOT NULL,
  result      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- IP bans
CREATE TABLE IF NOT EXISTS public.ip_bans (
  id          SERIAL PRIMARY KEY,
  ip_address  TEXT NOT NULL UNIQUE,
  reason      TEXT DEFAULT '',
  banned_by   TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Error logs
CREATE TABLE IF NOT EXISTS public.error_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT,
  message     TEXT NOT NULL,
  stack       TEXT DEFAULT '',
  version     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Security flags
CREATE TABLE IF NOT EXISTS public.security_flags (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL,
  flag_type   TEXT NOT NULL,
  reason      TEXT DEFAULT '',
  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Two-factor authentication
CREATE TABLE IF NOT EXISTS public.two_factor_auth (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,
  secret     TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alliance diplomacy
CREATE TABLE IF NOT EXISTS public.alliance_diplomacy (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL,
  target_id     INT NOT NULL,
  alliance_type TEXT NOT NULL DEFAULT 'neutral',
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_id)
);

-- Seed default city taxes
INSERT INTO public.city_taxes (city, rate) VALUES
  ('İstanbul',  12.0),
  ('Ankara',    10.0),
  ('İzmir',      9.0),
  ('Bursa',      8.5),
  ('Adana',      8.0),
  ('Konya',      7.5),
  ('Antalya',    9.5),
  ('Gaziantep',  7.0),
  ('Kayseri',    7.5),
  ('Mersin',     8.0)
ON CONFLICT (city) DO NOTHING;
