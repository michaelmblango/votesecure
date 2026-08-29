-- ============================================================
-- Migration: elections.org_id - real multi-tenant scoping
--
-- elections has never had an org_id column. Every org-scoped
-- feature built on top of it (public results' org_name lookup,
-- and now candidate_invites' ownership check) has had to work
-- around that gap, and list_elections' admin branch currently
-- has NO org filtering at all - any org admin on the platform
-- can see every other organisation's elections. This adds the
-- real column and backfills existing rows via
-- elections.created_by -> org_admins.linked_user_id -> org_id.
--
-- Run ONCE on the server:
--   psql -h localhost -U votesecure -d votesecure_db -f database/migrations/006_elections_org_id.sql
-- ============================================================

ALTER TABLE elections
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(org_id);

UPDATE elections e
SET org_id = a.org_id
FROM org_admins a
WHERE e.created_by = a.linked_user_id
  AND e.org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_elections_org ON elections(org_id);

INSERT INTO applied_migrations (migration_name)
VALUES ('006_elections_org_id')
ON CONFLICT (migration_name) DO NOTHING;
