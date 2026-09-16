-- =============================================================================
-- X-OPS CASEPLAY: THE OBERMEYER GAMBIT
-- Supabase Database Migration: 003_sessions.sql
-- =============================================================================
--
-- This migration creates the `sessions` table to persist session tokens,
-- allowing Admin and Teams to survive a Node.js server restart seamlessly.
--
-- HOW TO APPLY:
-- 1. Go to your Supabase SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
-- =============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  token        VARCHAR(200) PRIMARY KEY,
  role         VARCHAR(20) NOT NULL,
  game_id      UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id      UUID REFERENCES teams(id) ON DELETE CASCADE,
  team_name    VARCHAR(100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- Enable RLS and grant privileges to service_role to ensure the Node server
-- has full access, while blocking any unauthorized direct access.
-- =============================================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON TABLE sessions TO service_role;

-- Ensure future grants (just in case)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
