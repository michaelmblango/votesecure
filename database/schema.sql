-- ============================================================
-- VoteSecure Database Schema
-- AI Professional College | Computer Science FYP 2024/2025
-- ============================================================
-- Run this file in pgAdmin: open votesecure_db → Tools → Query Tool
-- Then paste this entire file and click Run (F5)
-- ============================================================


-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- ENUMS (custom column types with fixed allowed values)
-- ============================================================

CREATE TYPE user_role_enum AS ENUM (
    'voter',
    'candidate',
    'election_admin',
    'system_admin',
    'auditor'
);

CREATE TYPE election_status_enum AS ENUM (
    'draft',
    'active',
    'closed',
    'archived'
);

CREATE TYPE election_type_enum AS ENUM (
    'single_choice',
    'multi_choice'
);

CREATE TYPE candidate_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);

CREATE TYPE log_actor_type AS ENUM (
    'voter',
    'admin',
    'system'
);


-- ============================================================
-- TABLE 1: users
-- Stores ALL system users: voters, admins, candidates, auditors
-- Password is ALWAYS stored as a bcrypt hash - never plain text
-- ============================================================

CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(200) NOT NULL,
    email           VARCHAR(200) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role_enum NOT NULL DEFAULT 'voter',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Speed up login lookups
CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_role   ON users(role);


-- ============================================================
-- TABLE 2: voters
-- Extends users with student-specific identity data
-- student_number is the PRIMARY login identifier
-- ============================================================

CREATE TABLE voters (
    voter_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Links to the users table for login credentials
    user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Unique student registration number from the college
    student_number   VARCHAR(50) UNIQUE NOT NULL,

    department       VARCHAR(100),
    level            VARCHAR(20),   -- e.g. '100', '200', '300', '400'
    eligibility_group VARCHAR(100), -- e.g. 'undergraduate', 'postgraduate', 'staff'
    phone_number     VARCHAR(20),
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_voters_student_number ON voters(student_number);
CREATE INDEX idx_voters_user_id        ON voters(user_id);


-- ============================================================
-- TABLE 3: elections
-- One row per election event
-- An election can have multiple positions
-- ============================================================

CREATE TABLE elections (
    election_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            VARCHAR(300) NOT NULL,
    description      TEXT,
    election_type    election_type_enum NOT NULL DEFAULT 'single_choice',
    start_time       TIMESTAMP NOT NULL,
    end_time         TIMESTAMP NOT NULL,
    status           election_status_enum NOT NULL DEFAULT 'draft',

    -- Which eligibility_group can vote in this election?
    -- NULL means all registered voters are eligible
    eligible_group   VARCHAR(100),

    -- Should results be visible while election is still active?
    is_public_results BOOLEAN DEFAULT FALSE,

    -- Which admin created this election
    created_by       UUID REFERENCES users(user_id),
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_elections_status     ON elections(status);
CREATE INDEX idx_elections_start_time ON elections(start_time);


-- ============================================================
-- TABLE 4: positions
-- Each election has one or more positions being contested
-- Example: President, Secretary, Treasurer
-- ============================================================

CREATE TABLE positions (
    position_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id      UUID NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    position_name    VARCHAR(200) NOT NULL,
    description      TEXT,
    max_votes        INT DEFAULT 1, -- How many candidates a voter can pick for this position
    display_order    INT DEFAULT 0,
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_positions_election ON positions(election_id);


-- ============================================================
-- TABLE 5: candidates
-- Each candidate is linked to one position in one election
-- Candidates must be APPROVED before appearing on the ballot
-- ============================================================

CREATE TABLE candidates (
    candidate_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id      UUID NOT NULL REFERENCES positions(position_id) ON DELETE CASCADE,

    -- The candidate is also a system user
    user_id          UUID REFERENCES users(user_id),

    display_name     VARCHAR(200) NOT NULL,
    manifesto        TEXT,
    photo_url        VARCHAR(500),
    approval_status  candidate_status_enum NOT NULL DEFAULT 'pending',
    approved_by      UUID REFERENCES users(user_id),
    approved_at      TIMESTAMP,
    display_order    INT DEFAULT 0,
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_candidates_position ON candidates(position_id);
CREATE INDEX idx_candidates_status   ON candidates(approval_status);


-- ============================================================
-- TABLE 6: votes  ← THE MOST CRITICAL TABLE
-- Stores ballot choices - NO voter identity column here
-- This is how ballot secrecy is enforced at the schema level
-- A result report can only show: candidate X got N votes
-- It CANNOT show: voter Y chose candidate X
-- ============================================================

CREATE TABLE votes (
    vote_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id      UUID NOT NULL REFERENCES elections(election_id),
    position_id      UUID NOT NULL REFERENCES positions(position_id),
    candidate_id     UUID NOT NULL REFERENCES candidates(candidate_id),

    -- SHA-256 hash of (vote_id + election_id + candidate_id + cast_at)
    -- Used to verify this vote record was not tampered with after storage
    vote_hash        VARCHAR(512),

    cast_at          TIMESTAMP DEFAULT NOW(),

    -- Stored for fraud detection analysis only - NOT used to identify the voter
    ip_address       INET
    -- NOTE: There is deliberately NO voter_id column in this table
);

CREATE INDEX idx_votes_election   ON votes(election_id);
CREATE INDEX idx_votes_position   ON votes(position_id);
CREATE INDEX idx_votes_candidate  ON votes(candidate_id);


-- ============================================================
-- TABLE 7: voter_election_status
-- Tracks WHETHER a voter has voted in a given election/position
-- This is SEPARATE from the votes table on purpose:
--   → This table knows WHO voted
--   → The votes table knows WHAT was chosen
--   → No JOIN between them reveals the combination
-- ============================================================

CREATE TABLE voter_election_status (
    status_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_id         UUID NOT NULL REFERENCES voters(voter_id),
    election_id      UUID NOT NULL REFERENCES elections(election_id),
    position_id      UUID NOT NULL REFERENCES positions(position_id),
    has_voted        BOOLEAN DEFAULT FALSE,
    voted_at         TIMESTAMP,

    -- A voter can only vote ONCE per position per election
    -- The database enforces this automatically
    UNIQUE(voter_id, election_id, position_id)
);

CREATE INDEX idx_status_voter    ON voter_election_status(voter_id);
CREATE INDEX idx_status_election ON voter_election_status(election_id);


-- ============================================================
-- TABLE 8: audit_logs
-- Every significant action is recorded here
-- This is your transparency and forensic investigation tool
-- Records: WHO did WHAT at WHEN from WHERE
-- Does NOT record: which candidate a voter chose
-- ============================================================

CREATE TABLE audit_logs (
    log_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who performed the action?
    actor_id         UUID,
    actor_type       log_actor_type NOT NULL DEFAULT 'system',

    -- What happened? Use standardized codes:
    -- LOGIN_SUCCESS, LOGIN_FAILED_PASSWORD, LOGIN_FAILED_OTP,
    -- VOTE_CAST, ELECTION_CREATED, ELECTION_OPENED, ELECTION_CLOSED,
    -- CANDIDATE_APPROVED, VOTER_REGISTERED, ACCOUNT_LOCKED
    event_type       VARCHAR(100) NOT NULL,

    -- Human-readable description of the event
    event_description TEXT,

    -- Extra context stored as JSON (flexible)
    -- Example: {"attempt_number": 3, "election_id": "abc-123"}
    details          JSONB DEFAULT '{}',

    ip_address       INET,
    timestamp        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_actor     ON audit_logs(actor_id);
CREATE INDEX idx_audit_event     ON audit_logs(event_type);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);


-- ============================================================
-- TABLE 9: otp_tokens
-- Stores one-time password codes for 2-factor authentication
-- Each token expires and is deleted after use
-- (Redis handles this in production but this table is the
--  database backup record for audit purposes)
-- ============================================================

CREATE TABLE otp_tokens (
    token_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- We store the HASH of the OTP, not the code itself
    token_hash       VARCHAR(255) NOT NULL,

    -- OTP expires 10 minutes after creation
    expires_at       TIMESTAMP NOT NULL,

    -- Once used, marked TRUE so it cannot be reused
    is_used          BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_otp_user    ON otp_tokens(user_id);
CREATE INDEX idx_otp_expires ON otp_tokens(expires_at);


-- ============================================================
-- TABLE 10: organisations
-- One row per client organisation using VoteSecure.
-- An organisation needs MIN_ORG_ADMINS admins registered
-- before its status flips from 'pending' to 'active'.
-- ============================================================

CREATE TABLE organisations (
    org_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name         VARCHAR(300) NOT NULL,
    slug             VARCHAR(100) UNIQUE NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | active
    invite_code      VARCHAR(50) UNIQUE NOT NULL,
    contact_email    VARCHAR(200) NOT NULL,
    created_at       TIMESTAMP DEFAULT NOW(),
    activated_at     TIMESTAMP
);

CREATE INDEX idx_organisations_slug   ON organisations(slug);
CREATE INDEX idx_organisations_status ON organisations(status);


-- ============================================================
-- TABLE 11: org_admins
-- Admin accounts belonging to an organisation. The first
-- (owner) admin creates the org; further admins join with
-- the invite code until MIN_ORG_ADMINS is reached.
-- ============================================================

CREATE TABLE org_admins (
    org_admin_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES organisations(org_id) ON DELETE CASCADE,
    username         VARCHAR(100) UNIQUE NOT NULL,
    email            VARCHAR(200) UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    full_name        VARCHAR(200) NOT NULL,
    is_owner         BOOLEAN DEFAULT FALSE,
    is_active        BOOLEAN DEFAULT TRUE,
    last_login       TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_org_admins_org ON org_admins(org_id);


-- ============================================================
-- TABLE 12: org_admin_otp
-- One-time login codes for org admin 2-factor authentication.
-- ============================================================

CREATE TABLE org_admin_otp (
    otp_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_admin_id     UUID NOT NULL REFERENCES org_admins(org_admin_id) ON DELETE CASCADE,
    otp_code         VARCHAR(10) NOT NULL,
    expires_at       TIMESTAMP NOT NULL,
    is_used          BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_org_admin_otp_admin ON org_admin_otp(org_admin_id);


-- ============================================================
-- TABLE 13: election_plans
-- Pricing tiers an organisation can purchase a licence for.
-- ============================================================

CREATE TABLE election_plans (
    plan_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name        VARCHAR(100) UNIQUE NOT NULL,
    max_voters       INT NOT NULL,
    price_usd        NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active        BOOLEAN DEFAULT TRUE,
    display_order    INT DEFAULT 0,
    created_at       TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 14: election_licences
-- Licence codes issued to an organisation after payment,
-- consumed once when they set up an election.
-- ============================================================

CREATE TABLE election_licences (
    licence_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licence_code     VARCHAR(20) UNIQUE NOT NULL,
    org_id           UUID NOT NULL REFERENCES organisations(org_id) ON DELETE CASCADE,
    plan_id          UUID NOT NULL REFERENCES election_plans(plan_id),
    status           VARCHAR(20) NOT NULL DEFAULT 'unused', -- unused | used | expired | revoked
    notes            TEXT,
    used_at          TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_election_licences_org  ON election_licences(org_id);
CREATE INDEX idx_election_licences_code ON election_licences(licence_code);


-- ============================================================
-- SEED DATA - Default Election Plans
-- ============================================================

INSERT INTO election_plans (plan_name, max_voters, price_usd, display_order) VALUES
    ('Free',       100,   0.00, 1),
    ('Starter',    1000,  49.00, 2),
    ('Growth',     5000,  149.00, 3),
    ('Enterprise', 50000, 499.00, 4);


-- ============================================================
-- SEED DATA - Default System Administrator Account
-- Password: Admin@2025 (hashed with bcrypt)
-- CHANGE THIS PASSWORD immediately after first login
-- ============================================================

INSERT INTO users (full_name, email, password_hash, role)
VALUES (
    'System Administrator',
    'admin@votesecure.ac',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaLRiRl/JmVFVhG3gg6M2fXXi',
    'system_admin'
);


-- ============================================================
-- VERIFICATION - Run this after to confirm all tables exist
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;