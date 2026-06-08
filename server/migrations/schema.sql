-- UNDERSTATE — Supabase Canonical Schema
-- Supabase Dashboard > SQL Editor > Run
-- Safe to run multiple times

-- ── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  username            TEXT UNIQUE NOT NULL,
  email               TEXT UNIQUE,
  password_hash       TEXT,
  role                TEXT NOT NULL DEFAULT 'user',
  banned              BOOLEAN NOT NULL DEFAULT false,
  ban_reason          TEXT DEFAULT '',

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

  city                TEXT NOT NULL DEFAULT 'İstanbul',
  position_tag        TEXT DEFAULT '',
  education_level     TEXT DEFAULT 'İlkokul',
  education_progress  INTEGER DEFAULT 0,

  inventory           JSONB NOT NULL DEFAULT '[]',
  equipped_items      JSONB NOT NULL DEFAULT '{}',
  holdings            JSONB NOT NULL DEFAULT '[]',
  game_data           JSONB NOT NULL DEFAULT '{}',
  push_subscriptions  JSONB NOT NULL DEFAULT '[]',

  email_verified      BOOLEAN NOT NULL DEFAULT false,
  email_verify_token  TEXT DEFAULT NULL,
  email_verify_expiry TIMESTAMPTZ DEFAULT NULL,
  refresh_token       TEXT DEFAULT NULL,
  reset_token         TEXT DEFAULT NULL,
  reset_token_expiry  TIMESTAMPTZ DEFAULT NULL,

  is_online           BOOLEAN NOT NULL DEFAULT false,
  socket_id           TEXT DEFAULT NULL,
  last_login          TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username  ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_level     ON users(level DESC, xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_money     ON users(money DESC);
CREATE INDEX IF NOT EXISTS idx_users_score     ON users(score DESC);

-- ── GAME STATE (KV store) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_state (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── ECONOMY ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS economy (
  id         TEXT PRIMARY KEY DEFAULT 'main',
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO economy (id, data) VALUES ('main', '{}') ON CONFLICT DO NOTHING;

-- ── CHAT MESSAGES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id         TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  channel    TEXT NOT NULL,
  message    TEXT NOT NULL,
  sender     TEXT NOT NULL,
  user_id    TEXT,
  filtered   BOOLEAN NOT NULL DEFAULT false,
  msg_id     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_channel ON chat_messages(channel, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_msgid ON chat_messages(msg_id) WHERE msg_id IS NOT NULL;

-- ── GLOBAL CHAT ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_chat (
  id         TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  sender_id  TEXT,
  sender     TEXT NOT NULL,
  message    TEXT,
  gif_url    TEXT,
  channel    TEXT DEFAULT 'global',
  sticker    TEXT,
  reply_to   TEXT,
  ts         BIGINT DEFAULT (EXTRACT(EPOCH FROM now())::BIGINT * 1000),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_global_chat_channel ON global_chat(channel);
CREATE INDEX IF NOT EXISTS idx_global_chat_ts      ON global_chat(ts DESC);

-- ── ROOMS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id         TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  room_id    TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL DEFAULT '',
  host       TEXT NOT NULL DEFAULT '',
  max_players INTEGER NOT NULL DEFAULT 20,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  players    JSONB NOT NULL DEFAULT '[]',
  game_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── GANGS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gangs (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  leader_id   TEXT,
  leader      TEXT,
  leader_name TEXT,
  members     JSONB DEFAULT '[]',
  territory   TEXT DEFAULT '',
  territories JSONB DEFAULT '[]',
  treasury    BIGINT DEFAULT 0,
  power       INTEGER DEFAULT 0,
  weapons     INTEGER DEFAULT 0,
  logo        TEXT,
  color       TEXT DEFAULT '#DC2626',
  alliance_id TEXT,
  war_status  JSONB DEFAULT '{}',
  rank        INTEGER DEFAULT 0,
  founded_at  BIGINT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gangs_power ON gangs(power DESC);

-- ── PARTIES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parties (
  id               TEXT PRIMARY KEY,
  name             TEXT,
  leader_id        TEXT,
  leader           TEXT,
  leader_name      TEXT,
  members          JSONB DEFAULT '[]',
  ideology         TEXT DEFAULT 'merkez',
  color            TEXT DEFAULT '#2563EB',
  logo             TEXT,
  description      TEXT,
  influence_points INTEGER DEFAULT 0,
  treasury         BIGINT DEFAULT 0,
  seats            INTEGER DEFAULT 0,
  vote_history     JSONB DEFAULT '[]',
  founded_at       BIGINT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ── ELECTIONS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elections (
  id          SERIAL PRIMARY KEY,
  type        TEXT NOT NULL,
  city        TEXT NOT NULL DEFAULT 'ulusal',
  candidates  JSONB DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'active',
  ends_at     TIMESTAMPTZ,
  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS election_votes (
  id                 SERIAL PRIMARY KEY,
  election_id        INTEGER,
  voter_id           TEXT,
  voter_username     TEXT,
  candidate_username TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_election_votes ON election_votes(election_id);

CREATE TABLE IF NOT EXISTS election_history (
  id            TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  election_type TEXT DEFAULT 'general',
  city          TEXT DEFAULT '',
  winner_id     TEXT,
  winner_name   TEXT,
  total_votes   INTEGER DEFAULT 0,
  results       JSONB DEFAULT '{}',
  ended_at      TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info',
  icon       TEXT DEFAULT '🔔',
  ts         BIGINT DEFAULT 0,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  data       JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);

-- ── DIRECT MESSAGES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id          SERIAL PRIMARY KEY,
  sender_id   TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON direct_messages(receiver_id, created_at DESC);

-- ── FRIENDSHIPS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  friend_id  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);

-- ── USER BLOCKS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_blocks (
  id         SERIAL PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- ── USER SESSIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  token_hash  TEXT NOT NULL,
  ip_address  TEXT,
  device_info TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);

-- ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id         TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  title      TEXT,
  content    TEXT,
  author_id  TEXT,
  author     TEXT,
  type       TEXT DEFAULT 'general',
  pinned     BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── CABINET ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cabinet (
  position         TEXT PRIMARY KEY,
  player_id        TEXT,
  username         TEXT,
  appointed_by     TEXT,
  appointed_at     BIGINT,
  salary           BIGINT DEFAULT 0,
  under_coin_bonus INTEGER DEFAULT 0,
  city             TEXT DEFAULT '',
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ── LAWS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laws (
  id             TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  title          TEXT,
  description    TEXT,
  type           TEXT,
  effects        JSONB DEFAULT '{}',
  proposer_id    TEXT,
  proposer       TEXT,
  votes_for      INTEGER DEFAULT 0,
  votes_against  INTEGER DEFAULT 0,
  voted_by       JSONB DEFAULT '[]',
  status         TEXT DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT now(),
  expires_at     TIMESTAMPTZ
);

-- ── PARLIAMENT ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parliament_bills (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  proposed_by   TEXT,
  proposed_by_id TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  votes_for     INT NOT NULL DEFAULT 0,
  votes_against INT NOT NULL DEFAULT 0,
  ends_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parliament_votes (
  id         SERIAL PRIMARY KEY,
  bill_id    INTEGER REFERENCES parliament_bills(id) ON DELETE CASCADE,
  voter_id   TEXT NOT NULL,
  vote       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bill_id, voter_id)
);

-- ── MARKETPLACE ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id          SERIAL PRIMARY KEY,
  seller_id   TEXT NOT NULL,
  item_type   TEXT,
  item_name   TEXT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1,
  price       BIGINT NOT NULL,
  description TEXT DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mkt_active ON marketplace_listings(is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id         SERIAL PRIMARY KEY,
  listing_id INT,
  buyer_id   TEXT NOT NULL,
  seller_id  TEXT NOT NULL,
  item_name  TEXT,
  quantity   INT NOT NULL DEFAULT 1,
  price      BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── LOANS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL,
  principal     BIGINT NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 8.0,
  amount_due    BIGINT NOT NULL,
  amount_paid   BIGINT NOT NULL DEFAULT 0,
  due_date      TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);

-- ── MONEY TRANSFERS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS money_transfers (
  id          SERIAL PRIMARY KEY,
  sender_id   TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  amount      BIGINT NOT NULL,
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── PORTFOLIO HISTORY ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_history (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  total_value BIGINT NOT NULL DEFAULT 0,
  money       BIGINT NOT NULL DEFAULT 0,
  bank_money  BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_history(user_id, recorded_at DESC);

-- ── DAILY STREAKS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_streaks (
  id           SERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL UNIQUE,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_claim   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── CITY TAXES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_taxes (
  id         SERIAL PRIMARY KEY,
  city       TEXT NOT NULL UNIQUE,
  rate       NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

INSERT INTO city_taxes (city, rate) VALUES
  ('İstanbul',  12.0), ('Ankara',    10.0), ('İzmir',      9.0),
  ('Bursa',      8.5), ('Adana',      8.0), ('Konya',      7.5),
  ('Antalya',    9.5), ('Gaziantep',  7.0), ('Kayseri',    7.5), ('Mersin',     8.0)
ON CONFLICT (city) DO NOTHING;

-- ── REFERRALS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id          SERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_id TEXT NOT NULL,
  bonus_paid  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referred_id)
);

-- ── TWO FACTOR AUTH ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL UNIQUE,
  secret     TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── SECURITY FLAGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_flags (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  flag_type  TEXT NOT NULL,
  reason     TEXT DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── IP BANS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ip_bans (
  id         SERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  reason     TEXT DEFAULT '',
  banned_by  TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── ERROR LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_logs (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT,
  message    TEXT NOT NULL,
  stack      TEXT DEFAULT '',
  version    TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── GAME EVENTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_events (
  id         SERIAL PRIMARY KEY,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT DEFAULT '',
  data       JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── TIMED EVENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timed_events (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_type  TEXT NOT NULL,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_participations (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER,
  user_id    TEXT NOT NULL,
  result     JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- ── CAMPAIGN SPENDING ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_spending (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  election_id INTEGER,
  amount      BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── ALLIANCE DIPLOMACY ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alliance_diplomacy (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL,
  target_id     TEXT NOT NULL,
  alliance_type TEXT NOT NULL DEFAULT 'neutral',
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_id)
);

-- ── ACTIVITY / AUDIT LOGS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id          TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  player_id   TEXT,
  username    TEXT,
  action      TEXT,
  description TEXT,
  data        JSONB DEFAULT '{}',
  city        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  player_id   TEXT,
  player_name TEXT,
  action      TEXT,
  data        JSONB DEFAULT '{}',
  flagged     BOOLEAN DEFAULT false,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── COMBAT / CRIME ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combat_logs (
  id               TEXT PRIMARY KEY,
  attacker_id      TEXT,
  attacker_name    TEXT,
  defender_id      TEXT,
  defender_name    TEXT,
  winner_id        TEXT,
  winner_name      TEXT,
  combat_type      TEXT DEFAULT 'duel',
  money_transfer   BIGINT DEFAULT 0,
  attacker_power   INTEGER DEFAULT 0,
  defender_power   INTEGER DEFAULT 0,
  data             JSONB DEFAULT '{}',
  ts               BIGINT DEFAULT (EXTRACT(EPOCH FROM now())::BIGINT * 1000),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assassinations (
  id            TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  attacker_id   TEXT,
  attacker_name TEXT,
  target_id     TEXT,
  target_name   TEXT,
  method        TEXT,
  success       BOOLEAN DEFAULT false,
  cost          BIGINT DEFAULT 0,
  result_data   JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gang_crime_log (
  id            SERIAL PRIMARY KEY,
  gang_id       TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  operation_id  TEXT NOT NULL,
  success       BOOLEAN NOT NULL,
  reward_money  BIGINT DEFAULT 0,
  reward_xp     INTEGER DEFAULT 0,
  reward_merit  INTEGER DEFAULT 0,
  hp_cost       INTEGER DEFAULT 0,
  gang_cut      BIGINT DEFAULT 0,
  executed_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gang_crime_log_gang ON gang_crime_log(gang_id);

CREATE TABLE IF NOT EXISTS gang_crime_cooldowns (
  user_id       TEXT NOT NULL,
  operation_id  TEXT NOT NULL,
  last_done_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, operation_id)
);

-- ── FAMILIES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  leader_id   TEXT,
  leader      TEXT,
  members     JSONB DEFAULT '[]',
  treasury    BIGINT DEFAULT 0,
  influence   INTEGER DEFAULT 0,
  logo        TEXT,
  color       TEXT DEFAULT '#7C3AED',
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── FACTORIES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factories (
  id              TEXT PRIMARY KEY,
  owner_id        TEXT,
  owner_name      TEXT,
  name            TEXT,
  type            TEXT,
  level           INTEGER DEFAULT 1,
  production_rate BIGINT DEFAULT 0,
  inventory       JSONB DEFAULT '{}',
  orders          JSONB DEFAULT '[]',
  city            TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── CASINO LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS casino_logs (
  id         TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  player_id  TEXT,
  username   TEXT,
  game_type  TEXT,
  bet        BIGINT DEFAULT 0,
  result     BIGINT DEFAULT 0,
  won        BOOLEAN DEFAULT false,
  data       JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── COMMODITIES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commodities (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  icon          TEXT,
  price         BIGINT DEFAULT 100,
  supply        INTEGER DEFAULT 1000,
  demand        INTEGER DEFAULT 1000,
  price_history JSONB DEFAULT '[]',
  category      TEXT DEFAULT 'general',
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── HOLDINGS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holdings (
  id             TEXT PRIMARY KEY,
  name           TEXT,
  owner_id       TEXT,
  owner_name     TEXT,
  sector         TEXT,
  sector_icon    TEXT DEFAULT '🏢',
  level          INTEGER DEFAULT 1,
  profit         BIGINT DEFAULT 0,
  weekly_revenue BIGINT DEFAULT 0,
  employees      INTEGER DEFAULT 0,
  city           TEXT DEFAULT '',
  active         BOOLEAN DEFAULT true,
  data           JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── PUSH SUBSCRIPTIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  user_id      TEXT NOT NULL,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- ── COURT / COUP ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS court_cases (
  id              TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  plaintiff_id    TEXT,
  plaintiff_name  TEXT,
  defendant_id    TEXT,
  defendant_name  TEXT,
  charge          TEXT,
  evidence        JSONB DEFAULT '[]',
  verdict         TEXT,
  judge_id        TEXT,
  judge_name      TEXT,
  status          TEXT DEFAULT 'open',
  fine            BIGINT DEFAULT 0,
  prison_days     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS coup_system (
  id              TEXT PRIMARY KEY DEFAULT 'current',
  active          BOOLEAN DEFAULT false,
  instigator_id   TEXT,
  instigator_name TEXT,
  votes           JSONB DEFAULT '[]',
  status          TEXT DEFAULT 'idle',
  started_at      BIGINT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── COLLAB REQUESTS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collab_requests (
  id           TEXT PRIMARY KEY,
  job_id       TEXT,
  job_name     TEXT,
  job_icon     TEXT,
  from_user    TEXT,
  to_user      TEXT,
  earn         BIGINT DEFAULT 0,
  trade_point  INTEGER DEFAULT 0,
  status       TEXT DEFAULT 'pending',
  day          TEXT,
  sent_at      BIGINT,
  expires_at   BIGINT,
  completed_at BIGINT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── DAILY TASK TEMPLATES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_task_templates (
  id            TEXT PRIMARY KEY,
  title         TEXT,
  description   TEXT,
  type          TEXT,
  target        INTEGER DEFAULT 1,
  reward_money  BIGINT DEFAULT 0,
  reward_uc     INTEGER DEFAULT 0,
  reward_xp     INTEGER DEFAULT 0,
  icon          TEXT DEFAULT '🎯',
  active        BOOLEAN DEFAULT true
);

-- ── TRADE OFFERS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_offers (
  id            TEXT PRIMARY KEY,
  from_user_id  TEXT,
  from_username TEXT,
  to_user_id    TEXT,
  to_username   TEXT,
  offer         JSONB DEFAULT '{}',
  request       JSONB DEFAULT '{}',
  status        TEXT DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── CITY OWNERSHIP ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_ownership (
  city_id          TEXT PRIMARY KEY,
  gang_id          TEXT,
  gang_name        TEXT,
  captured_by      TEXT,
  captured_at      BIGINT,
  tax_rate         INTEGER DEFAULT 5,
  income_per_hour  BIGINT DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS city_wars (
  id                 TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  attacker_gang_id   TEXT,
  attacker_gang_name TEXT,
  defender_gang_id   TEXT,
  defender_gang_name TEXT,
  city               TEXT,
  status             TEXT DEFAULT 'active',
  attacker_power     INTEGER DEFAULT 0,
  defender_power     INTEGER DEFAULT 0,
  winner             TEXT,
  winner_name        TEXT,
  started_at         BIGINT,
  ended_at           BIGINT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ── TENDER ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auction_items (
  id                TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  title             TEXT,
  description       TEXT,
  type              TEXT,
  starting_price    BIGINT DEFAULT 0,
  current_bid       BIGINT DEFAULT 0,
  highest_bidder_id TEXT,
  highest_bidder    TEXT,
  data              JSONB DEFAULT '{}',
  status            TEXT DEFAULT 'active',
  created_at        TIMESTAMPTZ DEFAULT now(),
  ends_at           TIMESTAMPTZ
);
