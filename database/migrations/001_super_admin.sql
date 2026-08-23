-- ============================================================
-- Migration: Super Admin Panel
-- Adds:
--   - super_admins table (platform owner login)
--   - election_licences.used_by (which org admin redeemed a licence)
--   - election_plans.description (shown on the public pricing page)
--
-- Run ONCE on the server:
--   psql -h localhost -U votesecure -d votesecure_db -f database/migrations/001_super_admin.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS super_admins (
    super_admin_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username         VARCHAR(100) UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT NOW()
);

ALTER TABLE election_licences
    ADD COLUMN IF NOT EXISTS used_by UUID REFERENCES org_admins(org_admin_id);

ALTER TABLE election_plans
    ADD COLUMN IF NOT EXISTS description TEXT;
