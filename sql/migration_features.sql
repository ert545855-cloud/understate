-- ─────────────────────────────────────────────────────────────────────────────
-- UNDERSTATE — Feature Migration
-- Run once. All tables are CREATE IF NOT EXISTS to be safe.
-- ─────────────────────────────────────────────────────────────────────────────

-- ALTER users: new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_frozen        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS freeze_reason    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code    TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by      UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skill_points     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills           JSONB NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS presidency_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS campaign_budget  BIGINT NOT NULL DEFAULT 0;

-- ── #4  Session management ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  device_info  TEXT,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user   ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token  ON user_sessions(token_hash);

-- ── #12 Daily streak ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_streaks (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_claim_date DATE,
  total_claims   INTEGER NOT NULL DEFAULT 0
);

-- ── #13 Time-limited events ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timed_events (
  id          SERIAL PRIMARY KEY,
  event_type  TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  rewards     JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participations (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER REFERENCES timed_events(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL DEFAULT 0,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ── #15 City taxes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_taxes (
  city               TEXT PRIMARY KEY,
  income_tax_rate    NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  trade_tax_rate     NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  property_tax_rate  NUMERIC(5,2) NOT NULL DEFAULT 3.0,
  last_updated       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES users(id)
);
INSERT INTO city_taxes (city) VALUES
  ('İstanbul'),('Ankara'),('İzmir'),('Bursa'),('Antalya')
ON CONFLICT (city) DO NOTHING;

-- ── #16 Money transfers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS money_transfers (
  id            SERIAL PRIMARY KEY,
  sender_id     UUID REFERENCES users(id),
  receiver_id   UUID REFERENCES users(id),
  amount        BIGINT NOT NULL,
  message       TEXT,
  transfer_type TEXT NOT NULL DEFAULT 'player',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transfers_sender   ON money_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_transfers_receiver ON money_transfers(receiver_id);

-- ── #17 Friends ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_user   ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

-- ── #18 Direct messages ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id          SERIAL PRIMARY KEY,
  sender_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dm_sender   ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON direct_messages(receiver_id);

-- ── #19 Gang war log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gang_war_logs (
  id              SERIAL PRIMARY KEY,
  attacker_gang   TEXT,
  defender_gang   TEXT,
  attacker_user_id UUID REFERENCES users(id),
  defender_user_id UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  damage_dealt    INTEGER NOT NULL DEFAULT 0,
  result          TEXT,
  territory       TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gwl_attacker ON gang_war_logs(attacker_gang);
CREATE INDEX IF NOT EXISTS idx_gwl_defender ON gang_war_logs(defender_gang);

-- ── #20 Alliance diplomacy ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alliance_diplomacy (
  id           SERIAL PRIMARY KEY,
  alliance_a   TEXT NOT NULL,
  alliance_b   TEXT,
  action_type  TEXT NOT NULL,
  initiator_id UUID REFERENCES users(id),
  status       TEXT NOT NULL DEFAULT 'pending',
  metadata     JSONB NOT NULL DEFAULT '{}',
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── #22 User blocks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_blocks (
  id         SERIAL PRIMARY KEY,
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ── #23 Referrals ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id          SERIAL PRIMARY KEY,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  bonus_paid  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── #24 Marketplace ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id          SERIAL PRIMARY KEY,
  seller_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL,
  item_name   TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  price       BIGINT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_market_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_market_active ON marketplace_listings(is_active);

CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id         SERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES marketplace_listings(id),
  buyer_id   UUID REFERENCES users(id),
  seller_id  UUID REFERENCES users(id),
  item_name  TEXT,
  quantity   INTEGER,
  price      BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── #25 Loans ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id            SERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  principal     BIGINT NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  amount_due    BIGINT NOT NULL,
  amount_paid   BIGINT NOT NULL DEFAULT 0,
  due_date      TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);

-- ── #27 Portfolio history ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_history (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  total_value BIGINT NOT NULL,
  money       BIGINT,
  bank_money  BIGINT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_history(user_id, recorded_at DESC);

-- ── #29/#30/#31/#32 Parliament ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parliament_bills (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  proposed_by    UUID REFERENCES users(id),
  party_name     TEXT,
  bill_type      TEXT NOT NULL DEFAULT 'law',
  status         TEXT NOT NULL DEFAULT 'voting',
  votes_for      INTEGER NOT NULL DEFAULT 0,
  votes_against  INTEGER NOT NULL DEFAULT 0,
  voting_ends_at TIMESTAMPTZ,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parliament_votes (
  id       SERIAL PRIMARY KEY,
  bill_id  INTEGER REFERENCES parliament_bills(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES users(id),
  vote     TEXT NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bill_id, voter_id)
);

CREATE TABLE IF NOT EXISTS campaign_spending (
  id            SERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  party_name    TEXT,
  election_id   INTEGER,
  amount_spent  BIGINT NOT NULL DEFAULT 0,
  campaign_type TEXT,
  vote_boost    NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── #33 IP bans ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ip_bans (
  id         SERIAL PRIMARY KEY,
  ip_address TEXT UNIQUE NOT NULL,
  reason     TEXT,
  banned_by  UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── #34 Security flags ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_flags (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  flag_type   TEXT NOT NULL,
  details     JSONB NOT NULL DEFAULT '{}',
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  auto_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_secflags_user ON security_flags(user_id);

-- ── #35 Two-factor auth ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS two_factor_auth (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret       TEXT NOT NULL,
  is_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  backup_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── #7  Error logs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_logs (
  id         SERIAL PRIMARY KEY,
  error_type TEXT,
  message    TEXT NOT NULL,
  stack      TEXT,
  context    JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_id    UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_errlogs_type ON error_logs(error_type, created_at DESC);

-- ── Referral code backfill ───────────────────────────────────────────────────
UPDATE users
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;
