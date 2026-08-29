-- ============================================================
-- Migration: candidate self-registration
--
-- Adds candidate_invites, mirroring voter_invites' structure -
-- an owner admin invites a candidate by email, the candidate
-- self-registers with their own username/password, and admins
-- approve before they appear on the ballot.
--
-- The users.username column/index already exists (migration
-- 004_voter_username) - repeated here with IF NOT EXISTS only
-- so this migration is self-contained and safe to run standalone.
--
-- Run ONCE on the server:
--   psql -h localhost -U votesecure -d votesecure_db -f database/migrations/005_candidate_invites.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_invites (
    invite_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id     UUID NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    position_id     UUID NOT NULL REFERENCES positions(position_id) ON DELETE CASCADE,
    org_id          UUID NOT NULL REFERENCES organisations(org_id),
    email           VARCHAR(200) NOT NULL,
    invite_code     VARCHAR(80) UNIQUE NOT NULL,
    invited_by      UUID REFERENCES org_admins(org_admin_id),
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','registered','approved','rejected','expired')),
    candidate_id    UUID REFERENCES candidates(candidate_id),
    expires_at      TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_invites_code
    ON candidate_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_candidate_invites_election
    ON candidate_invites(election_id);
CREATE INDEX IF NOT EXISTS idx_candidate_invites_position
    ON candidate_invites(position_id);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
    ON users(username)
    WHERE username IS NOT NULL;

INSERT INTO applied_migrations (migration_name)
VALUES ('005_candidate_invites')
ON CONFLICT (migration_name) DO NOTHING;
