-- =============================================================================
-- X-OPS CASEPLAY: THE OBERMEYER GAMBIT
-- Supabase Database Migration: 001_initial_schema.sql
-- =============================================================================
--
-- HOW TO APPLY:
-- 1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
-- 2. Paste this entire file into the SQL editor
-- 3. Click "Run"
-- 4. Verify tables appear in the Table Editor
--
-- This migration is idempotent — safe to run multiple times.
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: games
-- One row per game session
-- =============================================================================
CREATE TABLE IF NOT EXISTS games (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_code     VARCHAR(20)  UNIQUE NOT NULL,
  status        VARCHAR(50)  NOT NULL DEFAULT 'LOBBY',
  current_round INTEGER      NOT NULL DEFAULT 0,
  seed          VARCHAR(100),
  admin_pin     VARCHAR(20),
  max_teams     INTEGER      DEFAULT 12,
  config        JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_games_game_code ON games(game_code);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- =============================================================================
-- TABLE: teams
-- One row per team per game
-- =============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id              UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_code            VARCHAR(30) NOT NULL,             -- internal teamId (T_XXXXXX)
  team_name            VARCHAR(100) NOT NULL,
  symbol               VARCHAR(10),
  cash                 BIGINT      NOT NULL DEFAULT 1000000,
  score                BIGINT      NOT NULL DEFAULT 1000000,
  status               VARCHAR(50) NOT NULL DEFAULT 'active',
  mass_allocation      JSONB       NOT NULL DEFAULT '{}',
  agile_allocation     JSONB       NOT NULL DEFAULT '{}',
  emergency_allocation JSONB       NOT NULL DEFAULT '{}',
  submitted_rounds     INTEGER[]   NOT NULL DEFAULT '{}',
  pnl_data             JSONB,
  strategy_profile     VARCHAR(50),
  joined_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, team_name)
);

CREATE INDEX IF NOT EXISTS idx_teams_game_id ON teams(game_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_code ON teams(team_code);

-- =============================================================================
-- TABLE: players
-- One row per browser session (a team can have multiple players)
-- =============================================================================
CREATE TABLE IF NOT EXISTS players (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id      UUID         NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  session_id   VARCHAR(200),
  joined_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id);

-- =============================================================================
-- TABLE: rounds
-- Tracks round state per game
-- =============================================================================
CREATE TABLE IF NOT EXISTS rounds (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id       UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number  INTEGER     NOT NULL,
  phase         VARCHAR(50) NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  config        JSONB       NOT NULL DEFAULT '{}',
  UNIQUE(game_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_rounds_game_id ON rounds(game_id);

-- =============================================================================
-- TABLE: decisions
-- One row per (team, round) — stores the allocation decision as JSONB
-- =============================================================================
CREATE TABLE IF NOT EXISTS decisions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id       UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number  INTEGER     NOT NULL,
  team_id       UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  decision_data JSONB       NOT NULL DEFAULT '{}',
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at     TIMESTAMPTZ,
  UNIQUE(game_id, round_number, team_id)
);

CREATE INDEX IF NOT EXISTS idx_decisions_game_round_team ON decisions(game_id, round_number, team_id);

-- =============================================================================
-- TABLE: results
-- Final P&L per (team, round)
-- =============================================================================
CREATE TABLE IF NOT EXISTS results (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id      UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER     NOT NULL,
  team_id      UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  revenue      BIGINT      DEFAULT 0,
  cost         BIGINT      DEFAULT 0,
  profit       BIGINT      DEFAULT 0,
  score        BIGINT      DEFAULT 0,
  result_data  JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, round_number, team_id)
);

CREATE INDEX IF NOT EXISTS idx_results_game_round_team ON results(game_id, round_number, team_id);

-- =============================================================================
-- TABLE: game_events
-- Immutable audit log of all game state transitions
-- =============================================================================
CREATE TABLE IF NOT EXISTS game_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id      UUID         NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_type   VARCHAR(100) NOT NULL,
  round_number INTEGER,
  payload      JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_events_game_created ON game_events(game_id, created_at);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON game_events(event_type);

-- =============================================================================
-- ROW LEVEL SECURITY
-- The Node.js server uses the secret key (service role) which bypasses RLS.
-- We enable RLS to protect against any accidental direct client access.
-- No public/anon policies are created — all access goes through the server.
-- =============================================================================

ALTER TABLE games        ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events  ENABLE ROW LEVEL SECURITY;

-- Service role (used by Node server with SUPABASE_SECRET_KEY) bypasses RLS automatically.
-- No anon policies created. Frontend does not directly access Supabase.

-- =============================================================================
-- VERIFICATION QUERY
-- Run this after migration to confirm tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- =============================================================================
