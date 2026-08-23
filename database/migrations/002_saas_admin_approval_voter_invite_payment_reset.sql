-- ============================================================
-- Migration: Admin approval, voter self-registration, payment
--            tracking, password reset, migration logging
--
-- Adds:
--   - applied_migrations (tracking table)
--   - admin_approval_requests / admin_approval_votes
--     (multi-admin sign-off on sensitive actions)
--   - voter_invites / voter_invite_approvals
--     (voter self-registration with admin approval)
--   - password_reset_tokens
--   - payment_requests
--   - election_licences.expires_at (referenced by step 7 below,
--     but was never created anywhere in the original draft of
--     this migration - added here so that step doesn't fail)
--
-- Run ONCE on the server:
--   psql -h localhost -U votesecure -d votesecure_db -f database/migrations/002_saas_admin_approval_voter_invite_payment_reset.sql
-- ============================================================

-- 1. Migration tracking
CREATE TABLE IF NOT EXISTS applied_migrations (
    migration_id   SERIAL PRIMARY KEY,
    migration_name VARCHAR(200) UNIQUE NOT NULL,
    applied_at     TIMESTAMP DEFAULT NOW()
);

-- 2. Admin approval requests
DO $$ BEGIN
    CREATE TYPE approval_action_enum AS ENUM (
        'delete_election',
        'export_voters',
        'remove_admin',
        'change_org_settings',
        'suspend_voter'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status_enum AS ENUM (
        'pending',
        'approved',
        'rejected',
        'expired'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS admin_approval_requests (
    request_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organisations(org_id) ON DELETE CASCADE,
    initiated_by    UUID NOT NULL REFERENCES org_admins(org_admin_id),
    action          approval_action_enum NOT NULL,
    action_label    VARCHAR(200) NOT NULL,
    action_payload  JSONB DEFAULT '{}',
    status          approval_status_enum DEFAULT 'pending',
    total_required  INT NOT NULL,
    total_approved  INT DEFAULT 0,
    expires_at      TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
    executed_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_approval_votes (
    vote_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  UUID NOT NULL REFERENCES admin_approval_requests(request_id) ON DELETE CASCADE,
    admin_id    UUID NOT NULL REFERENCES org_admins(org_admin_id),
    vote        VARCHAR(10) NOT NULL CHECK (vote IN ('approved', 'rejected')),
    voted_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(request_id, admin_id)
);

-- 3. Voter self-registration
DO $$ BEGIN
    CREATE TYPE voter_invite_status_enum AS ENUM (
        'pending',
        'registered',
        'approved',
        'rejected',
        'expired'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS voter_invites (
    invite_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organisations(org_id) ON DELETE CASCADE,
    email           VARCHAR(200) NOT NULL,
    invite_code     VARCHAR(40) UNIQUE NOT NULL,
    invited_by      UUID REFERENCES org_admins(org_admin_id),
    status          voter_invite_status_enum DEFAULT 'pending',
    voter_id        UUID REFERENCES voters(voter_id),
    approvals_needed INT DEFAULT 2,
    approvals_given  INT DEFAULT 0,
    expires_at      TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voter_invite_approvals (
    approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_id   UUID NOT NULL REFERENCES voter_invites(invite_id) ON DELETE CASCADE,
    admin_id    UUID NOT NULL REFERENCES org_admins(org_admin_id),
    approved    BOOLEAN NOT NULL,
    voted_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(invite_id, admin_id)
);

-- 4. Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id    UUID REFERENCES org_admins(org_admin_id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(user_id) ON DELETE CASCADE,
    token       VARCHAR(80) UNIQUE NOT NULL,
    expires_at  TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
    is_used     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 5. Payment requests table
DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM (
        'submitted',
        'under_review',
        'verified',
        'rejected'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payment_requests (
    payment_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id             UUID NOT NULL REFERENCES organisations(org_id),
    org_admin_id       UUID NOT NULL REFERENCES org_admins(org_admin_id),
    plan_name          VARCHAR(50) NOT NULL,
    amount_usd         DECIMAL(10,2) NOT NULL,
    payment_reference  VARCHAR(200) NOT NULL,
    receipt_note       TEXT,
    status             payment_status_enum DEFAULT 'submitted',
    reviewed_at        TIMESTAMP,
    licence_id         UUID REFERENCES election_licences(licence_id),
    created_at         TIMESTAMP DEFAULT NOW()
);

-- 6. Indices
CREATE INDEX IF NOT EXISTS idx_approval_requests_org    ON admin_approval_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON admin_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_votes_request   ON admin_approval_votes(request_id);
CREATE INDEX IF NOT EXISTS idx_voter_invites_org        ON voter_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_voter_invites_code       ON voter_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_payment_requests_org     ON payment_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status  ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token       ON password_reset_tokens(token);

-- 7. Licence expiry enforcement
-- election_licences.expires_at did not exist anywhere in the schema
-- prior to this migration - added here before the UPDATE that
-- populates it (the original draft of this migration was missing
-- this ALTER TABLE step, which would have made the UPDATE fail).
ALTER TABLE election_licences
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

UPDATE election_licences
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL AND status = 'unused';

-- 8. Record this migration
INSERT INTO applied_migrations (migration_name)
VALUES ('002_saas_admin_approval_voter_invite_payment_reset')
ON CONFLICT (migration_name) DO NOTHING;
