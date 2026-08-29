-- ============================================================
-- Migration: username column for voter self-registration
--
-- Voters previously logged in with a student number, entered
-- by an admin. The new self-registration flow lets voters
-- choose their own username instead - this column stores it.
-- NULL is allowed (existing rows, and org_admins' linked users
-- rows) since not every users row is a self-registered voter.
--
-- Run ONCE on the server:
--   psql -h localhost -U votesecure -d votesecure_db -f database/migrations/004_voter_username.sql
-- ============================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
    ON users(username)
    WHERE username IS NOT NULL;

INSERT INTO applied_migrations (migration_name)
VALUES ('004_voter_username')
ON CONFLICT (migration_name) DO NOTHING;
