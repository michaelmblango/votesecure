--
-- PostgreSQL database dump
--

\restrict Dg5qetfpBt0mfUpNOVb5NyOrOPWdpOTGSz2MufHcpaRoFEshLtTfIckJ7mPAO0a

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: approval_action_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_action_enum AS ENUM (
    'delete_election',
    'export_voters',
    'remove_admin',
    'change_org_settings',
    'suspend_voter'
);


--
-- Name: approval_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'expired'
);


--
-- Name: candidate_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.candidate_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: election_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.election_status_enum AS ENUM (
    'draft',
    'active',
    'closed',
    'archived'
);


--
-- Name: election_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.election_type_enum AS ENUM (
    'single_choice',
    'multi_choice'
);


--
-- Name: log_actor_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.log_actor_type AS ENUM (
    'voter',
    'admin',
    'system'
);


--
-- Name: payment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status_enum AS ENUM (
    'submitted',
    'under_review',
    'verified',
    'rejected'
);


--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role_enum AS ENUM (
    'voter',
    'candidate',
    'election_admin',
    'system_admin',
    'auditor'
);


--
-- Name: voter_invite_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.voter_invite_status_enum AS ENUM (
    'pending',
    'registered',
    'approved',
    'rejected',
    'expired'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_approval_requests (
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    initiated_by uuid NOT NULL,
    action public.approval_action_enum NOT NULL,
    action_label character varying(200) NOT NULL,
    action_payload jsonb DEFAULT '{}'::jsonb,
    status public.approval_status_enum DEFAULT 'pending'::public.approval_status_enum,
    total_required integer NOT NULL,
    total_approved integer DEFAULT 0,
    expires_at timestamp without time zone DEFAULT (now() + '48:00:00'::interval) NOT NULL,
    executed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: admin_approval_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_approval_votes (
    vote_id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    vote character varying(10) NOT NULL,
    voted_at timestamp without time zone DEFAULT now(),
    CONSTRAINT admin_approval_votes_vote_check CHECK (((vote)::text = ANY ((ARRAY['approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: applied_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applied_migrations (
    migration_id integer NOT NULL,
    migration_name character varying(200) NOT NULL,
    applied_at timestamp without time zone DEFAULT now()
);


--
-- Name: applied_migrations_migration_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.applied_migrations_migration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: applied_migrations_migration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.applied_migrations_migration_id_seq OWNED BY public.applied_migrations.migration_id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_type public.log_actor_type DEFAULT 'system'::public.log_actor_type NOT NULL,
    event_type character varying(100) NOT NULL,
    event_description text,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    "timestamp" timestamp without time zone DEFAULT now()
);


--
-- Name: candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidates (
    candidate_id uuid DEFAULT gen_random_uuid() NOT NULL,
    position_id uuid NOT NULL,
    user_id uuid,
    display_name character varying(200) NOT NULL,
    manifesto text,
    photo_url character varying(500),
    approval_status public.candidate_status_enum DEFAULT 'pending'::public.candidate_status_enum NOT NULL,
    approved_by uuid,
    approved_at timestamp without time zone,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: election_licences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.election_licences (
    licence_id uuid DEFAULT gen_random_uuid() NOT NULL,
    licence_code character varying(20) NOT NULL,
    org_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status character varying(20) DEFAULT 'unused'::character varying NOT NULL,
    notes text,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    used_by uuid,
    expires_at timestamp without time zone,
    election_id uuid
);


--
-- Name: election_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.election_plans (
    plan_id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_name character varying(100) NOT NULL,
    max_voters integer NOT NULL,
    price_usd numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    description text
);


--
-- Name: elections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elections (
    election_id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(300) NOT NULL,
    description text,
    election_type public.election_type_enum DEFAULT 'single_choice'::public.election_type_enum NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    status public.election_status_enum DEFAULT 'draft'::public.election_status_enum NOT NULL,
    eligible_group character varying(100),
    is_public_results boolean DEFAULT false,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    max_voters integer,
    plan_name character varying(100),
    licence_id uuid
);


--
-- Name: org_admin_otp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_admin_otp (
    otp_id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_admin_id uuid NOT NULL,
    otp_code character varying(10) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: org_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_admins (
    org_admin_id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(200) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(200) NOT NULL,
    is_owner boolean DEFAULT false,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    linked_user_id uuid
);


--
-- Name: organisations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organisations (
    org_id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_name character varying(300) NOT NULL,
    slug character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    invite_code character varying(50) NOT NULL,
    contact_email character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    activated_at timestamp without time zone
);


--
-- Name: otp_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_tokens (
    token_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    token_id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    user_id uuid,
    token character varying(80) NOT NULL,
    expires_at timestamp without time zone DEFAULT (now() + '01:00:00'::interval) NOT NULL,
    is_used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: payment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_requests (
    payment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    org_admin_id uuid NOT NULL,
    plan_name character varying(50) NOT NULL,
    amount_usd numeric(10,2) NOT NULL,
    payment_reference character varying(200) NOT NULL,
    receipt_note text,
    status public.payment_status_enum DEFAULT 'submitted'::public.payment_status_enum,
    reviewed_at timestamp without time zone,
    licence_id uuid,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    position_id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_id uuid NOT NULL,
    position_name character varying(200) NOT NULL,
    description text,
    max_votes integer DEFAULT 1,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: super_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.super_admins (
    super_admin_id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(200) NOT NULL,
    email character varying(200) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role_enum DEFAULT 'voter'::public.user_role_enum NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: voter_election_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voter_election_status (
    status_id uuid DEFAULT gen_random_uuid() NOT NULL,
    voter_id uuid NOT NULL,
    election_id uuid NOT NULL,
    position_id uuid NOT NULL,
    has_voted boolean DEFAULT false,
    voted_at timestamp without time zone
);


--
-- Name: voter_invite_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voter_invite_approvals (
    approval_id uuid DEFAULT gen_random_uuid() NOT NULL,
    invite_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    approved boolean NOT NULL,
    voted_at timestamp without time zone DEFAULT now()
);


--
-- Name: voter_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voter_invites (
    invite_id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    email character varying(200) NOT NULL,
    invite_code character varying(40) NOT NULL,
    invited_by uuid,
    status public.voter_invite_status_enum DEFAULT 'pending'::public.voter_invite_status_enum,
    voter_id uuid,
    approvals_needed integer DEFAULT 2,
    approvals_given integer DEFAULT 0,
    expires_at timestamp without time zone DEFAULT (now() + '7 days'::interval),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: voters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voters (
    voter_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    student_number character varying(50) NOT NULL,
    department character varying(100),
    level character varying(20),
    eligibility_group character varying(100),
    phone_number character varying(20),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.votes (
    vote_id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_id uuid NOT NULL,
    position_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    vote_hash character varying(512),
    cast_at timestamp without time zone DEFAULT now(),
    ip_address inet
);


--
-- Name: applied_migrations migration_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applied_migrations ALTER COLUMN migration_id SET DEFAULT nextval('public.applied_migrations_migration_id_seq'::regclass);


--
-- Name: admin_approval_requests admin_approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_requests
    ADD CONSTRAINT admin_approval_requests_pkey PRIMARY KEY (request_id);


--
-- Name: admin_approval_votes admin_approval_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_votes
    ADD CONSTRAINT admin_approval_votes_pkey PRIMARY KEY (vote_id);


--
-- Name: admin_approval_votes admin_approval_votes_request_id_admin_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_votes
    ADD CONSTRAINT admin_approval_votes_request_id_admin_id_key UNIQUE (request_id, admin_id);


--
-- Name: applied_migrations applied_migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applied_migrations
    ADD CONSTRAINT applied_migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: applied_migrations applied_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applied_migrations
    ADD CONSTRAINT applied_migrations_pkey PRIMARY KEY (migration_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (candidate_id);


--
-- Name: election_licences election_licences_licence_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.election_licences
    ADD CONSTRAINT election_licences_licence_code_key UNIQUE (licence_code);


--
-- Name: election_licences election_licences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.election_licences
    ADD CONSTRAINT election_licences_pkey PRIMARY KEY (licence_id);


--
-- Name: election_plans election_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.election_plans
    ADD CONSTRAINT election_plans_pkey PRIMARY KEY (plan_id);


--
-- Name: election_plans election_plans_plan_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.election_plans
    ADD CONSTRAINT election_plans_plan_name_key UNIQUE (plan_name);


--
-- Name: elections elections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elections
    ADD CONSTRAINT elections_pkey PRIMARY KEY (election_id);


--
-- Name: org_admin_otp org_admin_otp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_admin_otp
    ADD CONSTRAINT org_admin_otp_pkey PRIMARY KEY (otp_id);


--
-- Name: org_admins org_admins_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_admins
    ADD CONSTRAINT org_admins_email_key UNIQUE (email);


--
-- Name: org_admins org_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_admins
    ADD CONSTRAINT org_admins_pkey PRIMARY KEY (org_admin_id);


--
-- Name: org_admins org_admins_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_admins
    ADD CONSTRAINT org_admins_username_key UNIQUE (username);


--
-- Name: organisations organisations_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_invite_code_key UNIQUE (invite_code);


--
-- Name: organisations organisations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_pkey PRIMARY KEY (org_id);


--
-- Name: organisations organisations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_slug_key UNIQUE (slug);


--
-- Name: otp_tokens otp_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_tokens
    ADD CONSTRAINT otp_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: payment_requests payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_pkey PRIMARY KEY (payment_id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (position_id);


--
-- Name: super_admins super_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_pkey PRIMARY KEY (super_admin_id);


--
-- Name: super_admins super_admins_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_username_key UNIQUE (username);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: voter_election_status voter_election_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_election_status
    ADD CONSTRAINT voter_election_status_pkey PRIMARY KEY (status_id);


--
-- Name: voter_election_status voter_election_status_voter_id_election_id_position_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_election_status
    ADD CONSTRAINT voter_election_status_voter_id_election_id_position_id_key UNIQUE (voter_id, election_id, position_id);


--
-- Name: voter_invite_approvals voter_invite_approvals_invite_id_admin_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_invite_approvals
    ADD CONSTRAINT voter_invite_approvals_invite_id_admin_id_key UNIQUE (invite_id, admin_id);


--
-- Name: voter_invite_approvals voter_invite_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_invite_approvals
    ADD CONSTRAINT voter_invite_approvals_pkey PRIMARY KEY (approval_id);


--
-- Name: voter_invites voter_invites_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_invites
    ADD CONSTRAINT voter_invites_invite_code_key UNIQUE (invite_code);


--
-- Name: voter_invites voter_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_invites
    ADD CONSTRAINT voter_invites_pkey PRIMARY KEY (invite_id);


--
-- Name: voters voters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voters
    ADD CONSTRAINT voters_pkey PRIMARY KEY (voter_id);


--
-- Name: voters voters_student_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voters
    ADD CONSTRAINT voters_student_number_key UNIQUE (student_number);


--
-- Name: votes votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_pkey PRIMARY KEY (vote_id);


--
-- Name: idx_approval_requests_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_requests_org ON public.admin_approval_requests USING btree (org_id);


--
-- Name: idx_approval_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_requests_status ON public.admin_approval_requests USING btree (status);


--
-- Name: idx_approval_votes_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_votes_request ON public.admin_approval_votes USING btree (request_id);


--
-- Name: idx_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_actor ON public.audit_logs USING btree (actor_id);


--
-- Name: idx_audit_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_event ON public.audit_logs USING btree (event_type);


--
-- Name: idx_audit_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_timestamp ON public.audit_logs USING btree ("timestamp");


--
-- Name: idx_candidates_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_position ON public.candidates USING btree (position_id);


--
-- Name: idx_candidates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_status ON public.candidates USING btree (approval_status);


--
-- Name: idx_election_licences_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_election_licences_code ON public.election_licences USING btree (licence_code);


--
-- Name: idx_election_licences_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_election_licences_org ON public.election_licences USING btree (org_id);


--
-- Name: idx_elections_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elections_start_time ON public.elections USING btree (start_time);


--
-- Name: idx_elections_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elections_status ON public.elections USING btree (status);


--
-- Name: idx_org_admin_otp_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_admin_otp_admin ON public.org_admin_otp USING btree (org_admin_id);


--
-- Name: idx_org_admins_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_admins_org ON public.org_admins USING btree (org_id);


--
-- Name: idx_organisations_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organisations_slug ON public.organisations USING btree (slug);


--
-- Name: idx_organisations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organisations_status ON public.organisations USING btree (status);


--
-- Name: idx_otp_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_expires ON public.otp_tokens USING btree (expires_at);


--
-- Name: idx_otp_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_user ON public.otp_tokens USING btree (user_id);


--
-- Name: idx_payment_requests_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_requests_org ON public.payment_requests USING btree (org_id);


--
-- Name: idx_payment_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_requests_status ON public.payment_requests USING btree (status);


--
-- Name: idx_positions_election; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_election ON public.positions USING btree (election_id);


--
-- Name: idx_reset_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_status_election; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_election ON public.voter_election_status USING btree (election_id);


--
-- Name: idx_status_voter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_voter ON public.voter_election_status USING btree (voter_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_voter_invites_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voter_invites_code ON public.voter_invites USING btree (invite_code);


--
-- Name: idx_voter_invites_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voter_invites_org ON public.voter_invites USING btree (org_id);


--
-- Name: idx_voters_student_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voters_student_number ON public.voters USING btree (student_number);


--
-- Name: idx_voters_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voters_user_id ON public.voters USING btree (user_id);


--
-- Name: idx_votes_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_votes_candidate ON public.votes USING btree (candidate_id);


--
-- Name: idx_votes_election; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_votes_election ON public.votes USING btree (election_id);


--
-- Name: idx_votes_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_votes_position ON public.votes USING btree (position_id);


--
-- Name: admin_approval_requests admin_approval_requests_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_requests
    ADD CONSTRAINT admin_approval_requests_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.org_admins(org_admin_id);


--
-- Name: admin_approval_requests admin_approval_requests_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_requests
    ADD CONSTRAINT admin_approval_requests_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(org_id) ON DELETE CASCADE;


--
-- Name: admin_approval_votes admin_approval_votes_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_votes
    ADD CONSTRAINT admin_approval_votes_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.org_admins(org_admin_id);


--
-- Name: admin_approval_votes admin_approval_votes_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_votes
    ADD CONSTRAINT admin_approval_votes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.admin_approval_requests(request_id) ON DELETE CASCADE;


--
-- Name: candidates candidates_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id);


--
-- Name: candidates candidates_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(position_id) ON DELETE CASCADE;


--
-- Name: candidates candidates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: election_licences election_licences_election_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.election_licences
    ADD CONSTRAINT election_licences_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(election_id);


--
-- Name: election_licences election_licences_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.election_licences
    ADD CONSTRAINT election_licences_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(org_id) ON DELETE CASCADE;


--
-- Name: election_licences election_licences_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.election_licences
    ADD CONSTRAINT election_licences_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.election_plans(plan_id);


--
-- Name: election_licences election_licences_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.election_licences
    ADD CONSTRAINT election_licences_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.org_admins(org_admin_id);


--
-- Name: elections elections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elections
    ADD CONSTRAINT elections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: elections elections_licence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elections
    ADD CONSTRAINT elections_licence_id_fkey FOREIGN KEY (licence_id) REFERENCES public.election_licences(licence_id);


--
-- Name: org_admin_otp org_admin_otp_org_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_admin_otp
    ADD CONSTRAINT org_admin_otp_org_admin_id_fkey FOREIGN KEY (org_admin_id) REFERENCES public.org_admins(org_admin_id) ON DELETE CASCADE;


--
-- Name: org_admins org_admins_linked_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_admins
    ADD CONSTRAINT org_admins_linked_user_id_fkey FOREIGN KEY (linked_user_id) REFERENCES public.users(user_id);


--
-- Name: org_admins org_admins_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_admins
    ADD CONSTRAINT org_admins_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(org_id) ON DELETE CASCADE;


--
-- Name: otp_tokens otp_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_tokens
    ADD CONSTRAINT otp_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.org_admins(org_admin_id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: payment_requests payment_requests_licence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_licence_id_fkey FOREIGN KEY (licence_id) REFERENCES public.election_licences(licence_id);


--
-- Name: payment_requests payment_requests_org_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_org_admin_id_fkey FOREIGN KEY (org_admin_id) REFERENCES public.org_admins(org_admin_id);


--
-- Name: payment_requests payment_requests_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(org_id);


--
-- Name: positions positions_election_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(election_id) ON DELETE CASCADE;


--
-- Name: voter_election_status voter_election_status_election_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_election_status
    ADD CONSTRAINT voter_election_status_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(election_id);


--
-- Name: voter_election_status voter_election_status_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_election_status
    ADD CONSTRAINT voter_election_status_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(position_id);


--
-- Name: voter_election_status voter_election_status_voter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_election_status
    ADD CONSTRAINT voter_election_status_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES public.voters(voter_id);


--
-- Name: voter_invite_approvals voter_invite_approvals_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_invite_approvals
    ADD CONSTRAINT voter_invite_approvals_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.org_admins(org_admin_id);


--
-- Name: voter_invite_approvals voter_invite_approvals_invite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_invite_approvals
    ADD CONSTRAINT voter_invite_approvals_invite_id_fkey FOREIGN KEY (invite_id) REFERENCES public.voter_invites(invite_id) ON DELETE CASCADE;


--
-- Name: voter_invites voter_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_invites
    ADD CONSTRAINT voter_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.org_admins(org_admin_id);


--
-- Name: voter_invites voter_invites_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_invites
    ADD CONSTRAINT voter_invites_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(org_id) ON DELETE CASCADE;


--
-- Name: voter_invites voter_invites_voter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voter_invites
    ADD CONSTRAINT voter_invites_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES public.voters(voter_id);


--
-- Name: voters voters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voters
    ADD CONSTRAINT voters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: votes votes_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(candidate_id);


--
-- Name: votes votes_election_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(election_id);


--
-- Name: votes votes_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(position_id);


--
-- PostgreSQL database dump complete
--

\unrestrict Dg5qetfpBt0mfUpNOVb5NyOrOPWdpOTGSz2MufHcpaRoFEshLtTfIckJ7mPAO0a

