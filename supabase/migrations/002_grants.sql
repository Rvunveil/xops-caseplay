-- =============================================================================
-- X-OPS CASEPLAY: THE OBERMEYER GAMBIT
-- Supabase Database Migration: 002_grants.sql
-- =============================================================================
--
-- A schema permission mismatch was discovered during the database health check.
-- The tables exist, but the `service_role` (used by the Node server) does not
-- have the required permissions to read/write to them.
--
-- HOW TO APPLY:
-- 1. Go to your Supabase SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
-- =============================================================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Ensure future tables also get these grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;
