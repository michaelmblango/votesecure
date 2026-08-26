-- ============================================================
-- Migration: elections/election_licences columns referenced by
--            application code but never actually created.
--
-- backend/routers/elections.py's create_election() INSERTs into
-- elections(max_voters, plan_name, licence_id) and, when a
-- licence_id is supplied, UPDATEs
-- election_licences(used_by, election_id) - none of these six
-- columns exist on the live schema. Every election-creation
-- request has been failing with a 500 since that code shipped.
--
-- Run ONCE on the server:
--   psql -h localhost -U votesecure -d votesecure_db -f database/migrations/003_election_licence_columns.sql
-- ============================================================

ALTER TABLE elections
    ADD COLUMN IF NOT EXISTS max_voters INT,
    ADD COLUMN IF NOT EXISTS plan_name  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS licence_id UUID REFERENCES election_licences(licence_id);

ALTER TABLE election_licences
    ADD COLUMN IF NOT EXISTS used_by     UUID,
    ADD COLUMN IF NOT EXISTS election_id UUID REFERENCES elections(election_id);

INSERT INTO applied_migrations (migration_name)
VALUES ('003_election_licence_columns')
ON CONFLICT (migration_name) DO NOTHING;
