-- UNDERSTATE — Full Schema Migration
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gangs (
  id TEXT PRIMARY KEY,
  name TEXT,
  leader_id TEXT,
  leader TEXT,
  members JSONB DEFAULT '[]',
  territory TEXT DEFAULT '',
  territories JSONB DEFAULT '[]',
  treasury BIGINT DEFAULT 0,
  power INTEGER DEFAULT 0,
  weapons INTEGER DEFAULT 0,
  logo TEXT,
  color TEXT DEFAULT '#DC2626',
  alliance_id TEXT,
  war_status JSONB DEFAULT '{}',
  rank INTEGER DEFAULT 0,
  founded_at BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parties (
  id TEXT PRIMARY KEY,
  name TEXT,
  leader_id TEXT,
  leader TEXT,
  leader_name TEXT,
  members JSONB DEFAULT '[]',
  ideology TEXT,
  color TEXT DEFAULT '#2563EB',
  logo TEXT,
  description TEXT,
  influence_points INTEGER DEFAULT 0,
  seats INTEGER DEFAULT 0,
  founded_at BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS elections (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'ulusal',
  candidates JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  ends_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS election_votes (
  id SERIAL PRIMARY KEY,
  election_id INTEGER,
  voter_id INTEGER,
  voter_username TEXT,
  candidate_username TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS election_history (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  election_id TEXT,
  election_type TEXT DEFAULT 'general',
  city TEXT DEFAULT '',
  winner_id TEXT,
  winner_name TEXT,
  total_votes INTEGER DEFAULT 0,
  results JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  title TEXT,
  content TEXT,
  author_id TEXT,
  author TEXT,
  type TEXT DEFAULT 'general',
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cabinet (
  position TEXT PRIMARY KEY,
  player_id TEXT,
  username TEXT,
  appointed_by TEXT,
  appointed_at BIGINT,
  salary BIGINT DEFAULT 0,
  under_coin_bonus INTEGER DEFAULT 0,
  city TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS global_chat (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  sender_id TEXT,
  sender TEXT NOT NULL,
  message TEXT,
  gif_url TEXT,
  channel TEXT DEFAULT 'global',
  sticker TEXT,
  reply_to TEXT,
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM now())::BIGINT * 1000),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  sender TEXT NOT NULL,
  user_id UUID,
  filtered BOOLEAN NOT NULL DEFAULT false,
  msg_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  player_id TEXT,
  username TEXT,
  action TEXT,
  description TEXT,
  data JSONB DEFAULT '{}',
  city TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  player_id TEXT,
  player_name TEXT,
  action TEXT,
  data JSONB DEFAULT '{}',
  flagged BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  message TEXT NOT NULL,
  stack TEXT DEFAULT '',
  version TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS combat_logs (
  id TEXT PRIMARY KEY,
  attacker_id TEXT,
  attacker_name TEXT,
  defender_id TEXT,
  defender_name TEXT,
  winner_id TEXT,
  winner_name TEXT,
  combat_type TEXT DEFAULT 'duel',
  money_transfer BIGINT DEFAULT 0,
  attacker_power INTEGER DEFAULT 0,
  defender_power INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}',
  ts BIGINT DEFAULT (EXTRACT(EPOCH FROM now())::BIGINT * 1000),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assassinations (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  attacker_id TEXT,
  attacker_name TEXT,
  target_id TEXT,
  target_name TEXT,
  method TEXT,
  success BOOLEAN DEFAULT false,
  cost BIGINT DEFAULT 0,
  result_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS economy (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commodities (
  id TEXT PRIMARY KEY,
  name TEXT,
  icon TEXT,
  price BIGINT DEFAULT 100,
  supply INTEGER DEFAULT 1000,
  demand INTEGER DEFAULT 1000,
  price_history JSONB DEFAULT '[]',
  category TEXT DEFAULT 'general',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auction_items (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  title TEXT,
  description TEXT,
  type TEXT,
  starting_price BIGINT DEFAULT 0,
  current_bid BIGINT DEFAULT 0,
  highest_bidder_id TEXT,
  highest_bidder TEXT,
  data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS city_ownership (
  city_id TEXT PRIMARY KEY,
  gang_id TEXT,
  gang_name TEXT,
  captured_by TEXT,
  captured_at BIGINT,
  tax_rate INTEGER DEFAULT 5,
  income_per_hour BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS city_wars (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  attacker_gang_id TEXT,
  attacker_gang_name TEXT,
  defender_gang_id TEXT,
  defender_gang_name TEXT,
  city TEXT,
  status TEXT DEFAULT 'active',
  attacker_power INTEGER DEFAULT 0,
  defender_power INTEGER DEFAULT 0,
  winner TEXT,
  winner_name TEXT,
  started_at BIGINT,
  ended_at BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS city_taxes (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 10.0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS faction_wars (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  faction_type TEXT DEFAULT 'gang',
  attacker_id TEXT,
  attacker_name TEXT,
  defender_id TEXT,
  defender_name TEXT,
  city TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  attacker_hp INTEGER DEFAULT 100,
  defender_hp INTEGER DEFAULT 100,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  winner TEXT,
  data JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS gang_war_logs (
  id SERIAL PRIMARY KEY,
  attacker_gang TEXT,
  defender_gang TEXT,
  attacker_user_id UUID,
  defender_user_id UUID,
  action TEXT NOT NULL,
  damage_dealt INTEGER NOT NULL DEFAULT 0,
  result TEXT,
  territory TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gang_crime_log (
  id SERIAL PRIMARY KEY,
  gang_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  operation_id TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  reward_money BIGINT DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  reward_merit INTEGER DEFAULT 0,
  hp_cost INTEGER DEFAULT 0,
  gang_cut BIGINT DEFAULT 0,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gang_crime_cooldowns (
  user_id INTEGER NOT NULL,
  operation_id TEXT NOT NULL,
  last_done_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, operation_id)
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT,
  leader_id TEXT,
  leader TEXT,
  members JSONB DEFAULT '[]',
  treasury BIGINT DEFAULT 0,
  influence INTEGER DEFAULT 0,
  logo TEXT,
  color TEXT DEFAULT '#7C3AED',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factories (
  id TEXT PRIMARY KEY,
  owner_id TEXT,
  owner_name TEXT,
  name TEXT,
  type TEXT,
  level INTEGER DEFAULT 1,
  production_rate BIGINT DEFAULT 0,
  inventory JSONB DEFAULT '{}',
  orders JSONB DEFAULT '[]',
  city TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  player_id TEXT NOT NULL,
  crop_type TEXT,
  crop_icon TEXT,
  planted_at BIGINT,
  harvest_at BIGINT,
  yield BIGINT DEFAULT 0,
  harvested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holdings (
  id TEXT PRIMARY KEY,
  name TEXT,
  owner_id TEXT,
  owner_name TEXT,
  sector TEXT,
  sector_icon TEXT DEFAULT '🏢',
  level INTEGER DEFAULT 1,
  profit BIGINT DEFAULT 0,
  weekly_revenue BIGINT DEFAULT 0,
  employees INTEGER DEFAULT 0,
  city TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS casino_logs (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  player_id TEXT,
  username TEXT,
  game_type TEXT,
  bet BIGINT DEFAULT 0,
  result BIGINT DEFAULT 0,
  won BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS court_cases (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  plaintiff_id TEXT,
  plaintiff_name TEXT,
  defendant_id TEXT,
  defendant_name TEXT,
  charge TEXT,
  evidence JSONB DEFAULT '[]',
  verdict TEXT,
  judge_id TEXT,
  judge_name TEXT,
  status TEXT DEFAULT 'open',
  fine BIGINT DEFAULT 0,
  prison_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS coup_system (
  id TEXT PRIMARY KEY DEFAULT 'current',
  active BOOLEAN DEFAULT false,
  instigator_id TEXT,
  instigator_name TEXT,
  votes JSONB DEFAULT '[]',
  status TEXT DEFAULT 'idle',
  started_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collab_requests (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  job_name TEXT,
  job_icon TEXT,
  from_user TEXT,
  to_user TEXT,
  earn BIGINT DEFAULT 0,
  trade_point INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  day TEXT,
  sent_at BIGINT,
  expires_at BIGINT,
  completed_at BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_streaks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_claim TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_task_templates (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  type TEXT,
  target INTEGER DEFAULT 1,
  reward_money BIGINT DEFAULT 0,
  reward_uc INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  icon TEXT DEFAULT '🎯',
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS game_events (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alliance_diplomacy (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  alliance_type TEXT NOT NULL DEFAULT 'neutral',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_spending (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  election_id INTEGER,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_participations (
  id SERIAL PRIMARY KEY,
  event_id INTEGER,
  user_id INTEGER NOT NULL,
  result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_city_taxes_city ON city_taxes(city);
CREATE INDEX IF NOT EXISTS idx_global_chat_channel ON global_chat(channel);
CREATE INDEX IF NOT EXISTS idx_global_chat_ts ON global_chat(ts DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_player ON activity_log(player_id);
CREATE INDEX IF NOT EXISTS idx_combat_logs_attacker ON combat_logs(attacker_id);
CREATE INDEX IF NOT EXISTS idx_gang_crime_log_gang ON gang_crime_log(gang_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel);
CREATE INDEX IF NOT EXISTS idx_election_votes_election ON election_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
