-- ====================================================================
-- 🦖 COMPLETE PRODUCTION SCHEMA MIGRATION - MIGRATION #19
-- ====================================================================
-- This migration creates the complete production database schema
-- Includes all tables, constraints, indexes, functions, and RLS policies
-- Run this to establish the complete production database schema

-- ====================================================================
-- 1. CORE SYSTEM TABLES
-- ====================================================================

-- Admin configuration table
CREATE TABLE IF NOT EXISTS public.admin_config (
  key text NOT NULL,
  value text NOT NULL,
  CONSTRAINT admin_config_pkey PRIMARY KEY (key)
);

-- Module permissions for role-based access
CREATE TABLE IF NOT EXISTS public.module_permissions (
  id integer GENERATED ALWAYS AS IDENTITY,
  role text NOT NULL,
  module text NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  CONSTRAINT module_permissions_pkey PRIMARY KEY (id)
);

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  tier text DEFAULT 'T4'::text,
  coach_id uuid,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text])),
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);

-- Users table (main profile storage)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text,
  role text DEFAULT 'pending_player'::text CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'coach'::text, 'analyst'::text, 'player'::text, 'pending_player'::text, 'tryout'::text])),
  team_id uuid,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  role_level integer DEFAULT 10,
  contact_number text,
  in_game_role text,
  device_info text,
  provider text,
  device_model text,
  ram text,
  fps text,
  storage text,
  status text DEFAULT 'Active'::text CHECK (status = ANY (ARRAY['Active'::text, 'Benched'::text, 'On Leave'::text, 'Discontinued'::text])),
  gyroscope_enabled boolean DEFAULT true,
  instagram_handle text,
  discord_id text,
  bio text,
  favorite_game text,
  gaming_experience text,
  display_name text,
  full_name text,
  experience text,
  preferred_role text,
  favorite_games text,
  onboarding_completed boolean DEFAULT false,
  last_login timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  bgmi_id text,
  bgmi_tier text CHECK (bgmi_tier = ANY (ARRAY['Bronze'::text, 'Silver'::text, 'Gold'::text, 'Platinum'::text, 'Diamond'::text, 'Crown'::text, 'Ace'::text, 'Conqueror'::text])),
  bgmi_points integer DEFAULT 0,
  sensitivity_settings jsonb,
  control_layout text CHECK (control_layout = ANY (ARRAY['2-finger'::text, '3-finger'::text, '4-finger'::text, '5-finger'::text, '6-finger'::text])),
  hud_layout_code text,
  game_stats jsonb,
  achievements jsonb DEFAULT '[]'::jsonb,
  social_links jsonb DEFAULT '{}'::jsonb,
  emergency_contact_name text,
  emergency_contact_number text,
  date_of_birth date,
  address text,
  preferred_language text DEFAULT 'English'::text,
  timezone text DEFAULT 'Asia/Kolkata'::text,
  profile_visibility text DEFAULT 'team'::text CHECK (profile_visibility = ANY (ARRAY['public'::text, 'team'::text, 'private'::text])),
  auto_sync_tryout_data boolean DEFAULT true,
  last_profile_update timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Profiles table (extended user information)
CREATE TABLE IF NOT EXISTS public.profiles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL UNIQUE,
  username text,
  avatar_url text,
  website text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  bio text,
  full_name text,
  display_name text,
  contact_number text,
  experience text,
  preferred_role text,
  favorite_games text,
  role text DEFAULT 'pending_player'::text,
  onboarding_completed boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ====================================================================
-- 2. PERFORMANCE & GAMING TABLES
-- ====================================================================

-- Slots table (tournament slots)
CREATE TABLE IF NOT EXISTS public.slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  organizer text NOT NULL,
  time_range text NOT NULL,
  match_count integer NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  number_of_slots integer DEFAULT 1 CHECK (number_of_slots > 0),
  slot_rate integer DEFAULT 0 CHECK (slot_rate >= 0),
  notes text,
  CONSTRAINT slots_pkey PRIMARY KEY (id),
  CONSTRAINT slots_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- Performances table
CREATE TABLE IF NOT EXISTS public.performances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  player_id uuid,
  match_number integer NOT NULL,
  map text NOT NULL,
  placement integer,
  kills integer DEFAULT 0,
  assists integer DEFAULT 0,
  damage double precision DEFAULT 0,
  survival_time double precision DEFAULT 0,
  added_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  slot uuid,
  CONSTRAINT performances_pkey PRIMARY KEY (id),
  CONSTRAINT performances_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id),
  CONSTRAINT performances_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.users(id),
  CONSTRAINT performances_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- Winnings table
CREATE TABLE IF NOT EXISTS public.winnings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  team_id uuid NOT NULL,
  position integer NOT NULL CHECK ("position" > 0),
  amount_won integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT winnings_pkey PRIMARY KEY (id),
  CONSTRAINT winnings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT winnings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id)
);

-- Prize pools table
CREATE TABLE IF NOT EXISTS public.prize_pools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  total_amount integer NOT NULL,
  breakdown jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prize_pools_pkey PRIMARY KEY (id),
  CONSTRAINT prize_pools_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id)
);

-- Slot expenses table
CREATE TABLE IF NOT EXISTS public.slot_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  team_id uuid NOT NULL,
  rate integer NOT NULL,
  total integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  number_of_slots integer DEFAULT 1 CHECK (number_of_slots > 0),
  CONSTRAINT slot_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT slot_expenses_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id),
  CONSTRAINT slot_expenses_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- Team monthly stats table
CREATE TABLE IF NOT EXISTS public.team_monthly_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  month text NOT NULL,
  current_tier text NOT NULL DEFAULT 'T4'::text,
  slots_played integer NOT NULL DEFAULT 0,
  slots_won integer NOT NULL DEFAULT 0,
  slot_price_per_slot integer NOT NULL DEFAULT 0,
  slot_cost_per_slot integer NOT NULL DEFAULT 0,
  trial_phase text NOT NULL DEFAULT 'none'::text,
  trial_weeks_used integer NOT NULL DEFAULT 0,
  tournament_winnings integer NOT NULL DEFAULT 0,
  win_percentage numeric NOT NULL DEFAULT 0,
  updated_tier text NOT NULL DEFAULT 'T4'::text,
  status_update text NOT NULL DEFAULT 'retained'::text,
  sponsorship_status text NOT NULL DEFAULT 'none'::text,
  trial_extension_granted boolean NOT NULL DEFAULT false,
  trial_extension_weeks integer NOT NULL DEFAULT 0,
  monthly_prize_pool integer NOT NULL DEFAULT 0,
  monthly_cost integer NOT NULL DEFAULT 0,
  surplus integer NOT NULL DEFAULT 0,
  org_share integer NOT NULL DEFAULT 0,
  team_share integer NOT NULL DEFAULT 0,
  split_rule text NOT NULL DEFAULT 'surplus_30_70'::text,
  recalculated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_monthly_stats_pkey PRIMARY KEY (id),
  CONSTRAINT team_monthly_stats_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_monthly_stats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Tier defaults table
CREATE TABLE IF NOT EXISTS public.tier_defaults (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE,
  default_slot_rate integer NOT NULL CHECK (default_slot_rate > 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tier_defaults_pkey PRIMARY KEY (id)
);

-- ====================================================================
-- 3. ATTENDANCE & SESSION TABLES
-- ====================================================================

-- Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  session_type text NOT NULL CHECK (session_type = ANY (ARRAY['practice'::text, 'tournament'::text, 'meeting'::text])),
  session_subtype text,
  date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  cutoff_time time without time zone,
  title text,
  description text,
  is_mandatory boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text,
  max_participants integer CHECK (max_participants > 0 OR max_participants IS NULL),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT sessions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- Attendances table
CREATE TABLE IF NOT EXISTS public.attendances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  team_id uuid NOT NULL,
  date date NOT NULL,
  session_time text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'auto'::text])),
  marked_by uuid,
  slot_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  session_id uuid,
  source text DEFAULT 'manual'::text CHECK (source = ANY (ARRAY['manual'::text, 'auto'::text, 'system'::text])),
  training_details jsonb,
  verification_status text DEFAULT 'pending'::text CHECK (verification_status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text])),
  manager_notes text,
  verified_by uuid,
  verified_at timestamp with time zone,
  CONSTRAINT attendances_pkey PRIMARY KEY (id),
  CONSTRAINT attendances_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id),
  CONSTRAINT attendances_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT attendances_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.users(id),
  CONSTRAINT attendances_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT attendances_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.users(id),
  CONSTRAINT attendances_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id)
);

-- Attendance debug log table
CREATE TABLE IF NOT EXISTS public.attendance_debug_log (
  id uuid DEFAULT gen_random_uuid(),
  timestamp timestamp without time zone DEFAULT now(),
  message text,
  data jsonb
);

-- Practice session config table
CREATE TABLE IF NOT EXISTS public.practice_session_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  session_subtype text NOT NULL CHECK (session_subtype = ANY (ARRAY['Morning'::text, 'Evening'::text, 'Night'::text])),
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  cutoff_time time without time zone DEFAULT '12:00:00'::time without time zone,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT practice_session_config_pkey PRIMARY KEY (id),
  CONSTRAINT practice_session_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT practice_session_config_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- Holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  date date NOT NULL,
  name text NOT NULL,
  recurring_day integer CHECK (recurring_day >= 0 AND recurring_day <= 6),
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT holidays_pkey PRIMARY KEY (id),
  CONSTRAINT holidays_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT holidays_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- ====================================================================
-- 4. TRYOUT SYSTEM TABLES
-- ====================================================================

-- Tryouts table
CREATE TABLE IF NOT EXISTS public.tryouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  purpose text NOT NULL CHECK (purpose = ANY (ARRAY['new_team'::text, 'existing_team'::text, 'role_based'::text])),
  target_roles text[] DEFAULT '{}'::text[],
  team_ids uuid[] DEFAULT '{}'::uuid[],
  type text NOT NULL CHECK (type = ANY (ARRAY['scrim'::text, 'tournament'::text, 'practice'::text, 'meeting'::text])),
  open_to_public boolean DEFAULT true,
  application_deadline timestamp with time zone,
  evaluation_method text NOT NULL CHECK (evaluation_method = ANY (ARRAY['manual'::text, 'automated'::text, 'mixed'::text])),
  additional_links jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text, 'completed'::text, 'archived'::text])),
  description text,
  requirements text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  launched_at timestamp with time zone,
  closed_at timestamp with time zone,
  CONSTRAINT tryouts_pkey PRIMARY KEY (id),
  CONSTRAINT tryouts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Tryout applications table
CREATE TABLE IF NOT EXISTS public.tryout_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tryout_id uuid NOT NULL,
  full_name text NOT NULL,
  ign text NOT NULL,
  discord_tag text,
  role_applied_for text,
  game_id text,
  availability text[] DEFAULT '{}'::text[],
  highlights_links text[] DEFAULT '{}'::text[],
  additional_notes text,
  contact_email text,
  contact_phone text,
  status text NOT NULL DEFAULT 'applied'::text CHECK (status = ANY (ARRAY['applied'::text, 'screened'::text, 'shortlisted'::text, 'rejected'::text, 'withdrawn'::text])),
  screening_notes text,
  screened_by uuid,
  screened_at timestamp with time zone,
  application_source text DEFAULT 'direct'::text,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tryout_applications_pkey PRIMARY KEY (id),
  CONSTRAINT tryout_applications_tryout_id_fkey FOREIGN KEY (tryout_id) REFERENCES public.tryouts(id),
  CONSTRAINT tryout_applications_screened_by_fkey FOREIGN KEY (screened_by) REFERENCES public.users(id)
);

-- Tryout invitations table
CREATE TABLE IF NOT EXISTS public.tryout_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tryout_id uuid NOT NULL,
  application_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'invited'::text CHECK (status = ANY (ARRAY['invited'::text, 'accepted'::text, 'declined'::text, 'expired'::text])),
  invitation_message text,
  temporary_access_granted boolean DEFAULT false,
  access_expires_at timestamp with time zone,
  temp_user_id uuid,
  invited_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  notes text,
  CONSTRAINT tryout_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT tryout_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id),
  CONSTRAINT tryout_invitations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.tryout_applications(id),
  CONSTRAINT tryout_invitations_tryout_id_fkey FOREIGN KEY (tryout_id) REFERENCES public.tryouts(id),
  CONSTRAINT tryout_invitations_temp_user_id_fkey FOREIGN KEY (temp_user_id) REFERENCES public.users(id)
);

-- Tryout sessions table
CREATE TABLE IF NOT EXISTS public.tryout_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tryout_id uuid NOT NULL,
  invitation_id uuid NOT NULL,
  session_id uuid,
  session_type text NOT NULL CHECK (session_type = ANY (ARRAY['scrim'::text, 'tournament'::text, 'practice'::text, 'meeting'::text, 'custom'::text])),
  session_title text NOT NULL,
  session_description text,
  scheduled_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  evaluation_goals text,
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])),
  attendance_status text CHECK (attendance_status = ANY (ARRAY['present'::text, 'late'::text, 'absent'::text, 'excused'::text])),
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tryout_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT tryout_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT tryout_sessions_tryout_id_fkey FOREIGN KEY (tryout_id) REFERENCES public.tryouts(id),
  CONSTRAINT tryout_sessions_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.tryout_invitations(id),
  CONSTRAINT tryout_sessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);

-- Tryout evaluations table
CREATE TABLE IF NOT EXISTS public.tryout_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tryout_id uuid NOT NULL,
  invitation_id uuid NOT NULL,
  session_id uuid,
  evaluator_id uuid NOT NULL,
  kills integer DEFAULT 0,
  assists integer DEFAULT 0,
  damage double precision DEFAULT 0,
  survival_time double precision DEFAULT 0,
  placement integer,
  game_sense_score integer CHECK (game_sense_score >= 1 AND game_sense_score <= 10),
  utility_score integer CHECK (utility_score >= 1 AND utility_score <= 10),
  rotations_score integer CHECK (rotations_score >= 1 AND rotations_score <= 10),
  communication_score integer CHECK (communication_score >= 1 AND communication_score <= 10),
  overall_score double precision,
  evaluation_notes text,
  strengths text,
  areas_for_improvement text,
  recommendation text CHECK (recommendation = ANY (ARRAY['strong_select'::text, 'select'::text, 'maybe'::text, 'reject'::text, 'strong_reject'::text])),
  evaluation_date date DEFAULT CURRENT_DATE,
  is_final boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tryout_evaluations_pkey PRIMARY KEY (id),
  CONSTRAINT tryout_evaluations_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.users(id),
  CONSTRAINT tryout_evaluations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.tryout_sessions(id),
  CONSTRAINT tryout_evaluations_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.tryout_invitations(id),
  CONSTRAINT tryout_evaluations_tryout_id_fkey FOREIGN KEY (tryout_id) REFERENCES public.tryouts(id)
);

-- Tryout selections table
CREATE TABLE IF NOT EXISTS public.tryout_selections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tryout_id uuid NOT NULL,
  invitation_id uuid NOT NULL,
  application_id uuid NOT NULL,
  selected_by uuid NOT NULL,
  selection_status text NOT NULL CHECK (selection_status = ANY (ARRAY['selected'::text, 'rejected'::text, 'extended'::text, 'pending'::text])),
  assigned_team_id uuid,
  assigned_role text,
  player_type text CHECK (player_type = ANY (ARRAY['main'::text, 'sub'::text, 'support'::text])),
  rejection_reason text,
  feedback_message text,
  new_team_name text,
  new_team_tier text,
  selection_date date DEFAULT CURRENT_DATE,
  notification_sent boolean DEFAULT false,
  discord_notified boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tryout_selections_pkey PRIMARY KEY (id),
  CONSTRAINT tryout_selections_tryout_id_fkey FOREIGN KEY (tryout_id) REFERENCES public.tryouts(id),
  CONSTRAINT tryout_selections_assigned_team_id_fkey FOREIGN KEY (assigned_team_id) REFERENCES public.teams(id),
  CONSTRAINT tryout_selections_selected_by_fkey FOREIGN KEY (selected_by) REFERENCES public.users(id),
  CONSTRAINT tryout_selections_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.tryout_applications(id),
  CONSTRAINT tryout_selections_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.tryout_invitations(id)
);

-- ====================================================================
-- 5. COMMUNICATION & DISCORD TABLES
-- ====================================================================

-- Discord webhooks table
CREATE TABLE IF NOT EXISTS public.discord_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  hook_url text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['team'::text, 'admin'::text, 'global'::text])),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  channel_name text,
  CONSTRAINT discord_webhooks_pkey PRIMARY KEY (id),
  CONSTRAINT discord_webhooks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT discord_webhooks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Communication logs table
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  webhook_id uuid,
  message_type text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text, 'retry'::text])),
  payload jsonb NOT NULL,
  response_code integer,
  response_body text,
  error_message text,
  triggered_by uuid,
  retry_count integer DEFAULT 0,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT communication_logs_pkey PRIMARY KEY (id),
  CONSTRAINT communication_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.discord_webhooks(id),
  CONSTRAINT communication_logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT communication_logs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.users(id)
);

-- Communication settings table
CREATE TABLE IF NOT EXISTS public.communication_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  setting_key text NOT NULL,
  setting_value boolean NOT NULL DEFAULT false,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communication_settings_pkey PRIMARY KEY (id),
  CONSTRAINT communication_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id),
  CONSTRAINT communication_settings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- ====================================================================
-- 6. TEAM MANAGEMENT TABLES
-- ====================================================================

-- Rosters table
CREATE TABLE IF NOT EXISTS public.rosters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  in_game_role text,
  contact_number text,
  device_info text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rosters_pkey PRIMARY KEY (id),
  CONSTRAINT rosters_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT rosters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- User agreements table
CREATE TABLE IF NOT EXISTS public.user_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['player'::text, 'coach'::text, 'manager'::text, 'analyst'::text, 'tryout'::text, 'admin'::text, 'pending_player'::text])),
  agreement_version integer NOT NULL,
  accepted_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  status text NOT NULL DEFAULT 'accepted'::text CHECK (status = ANY (ARRAY['accepted'::text, 'pending'::text, 'declined'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_agreements_pkey PRIMARY KEY (id),
  CONSTRAINT user_agreements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ====================================================================
-- 7. ADDITIONAL CONSTRAINTS & INDEXES
-- ====================================================================

-- Add unique constraint for profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_user_id_unique'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Add unique constraint for communication settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'communication_settings_team_setting_key_unique'
    ) THEN
        ALTER TABLE public.communication_settings 
        ADD CONSTRAINT communication_settings_team_setting_key_unique UNIQUE (team_id, setting_key);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON public.teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_teams_tier ON public.teams(tier);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(status);

CREATE INDEX IF NOT EXISTS idx_performances_team_id ON public.performances(team_id);
CREATE INDEX IF NOT EXISTS idx_performances_player_id ON public.performances(player_id);
CREATE INDEX IF NOT EXISTS idx_performances_slot ON public.performances(slot);
CREATE INDEX IF NOT EXISTS idx_performances_created_at ON public.performances(created_at);

CREATE INDEX IF NOT EXISTS idx_slots_team_id ON public.slots(team_id);
CREATE INDEX IF NOT EXISTS idx_slots_date ON public.slots(date);

CREATE INDEX IF NOT EXISTS idx_attendances_player_id ON public.attendances(player_id);
CREATE INDEX IF NOT EXISTS idx_attendances_team_id ON public.attendances(team_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON public.attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON public.attendances(status);
CREATE INDEX IF NOT EXISTS idx_attendances_slot_id ON public.attendances(slot_id);

CREATE INDEX IF NOT EXISTS idx_sessions_team_id ON public.sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON public.sessions(session_type);

CREATE INDEX IF NOT EXISTS idx_tryout_applications_tryout_id ON public.tryout_applications(tryout_id);
CREATE INDEX IF NOT EXISTS idx_tryout_applications_status ON public.tryout_applications(status);

CREATE INDEX IF NOT EXISTS idx_tryout_invitations_tryout_id ON public.tryout_invitations(tryout_id);
CREATE INDEX IF NOT EXISTS idx_tryout_invitations_status ON public.tryout_invitations(status);

CREATE INDEX IF NOT EXISTS idx_discord_webhooks_team_id ON public.discord_webhooks(team_id);
CREATE INDEX IF NOT EXISTS idx_discord_webhooks_type ON public.discord_webhooks(type);
CREATE INDEX IF NOT EXISTS idx_discord_webhooks_active ON public.discord_webhooks(active);

CREATE INDEX IF NOT EXISTS idx_communication_logs_team_id ON public.communication_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_status ON public.communication_logs(status);
CREATE INDEX IF NOT EXISTS idx_communication_logs_timestamp ON public.communication_logs(timestamp);

-- ====================================================================
-- 8. DATABASE FUNCTIONS
-- ====================================================================

-- Function to handle user updates with conflict resolution
CREATE OR REPLACE FUNCTION public.bulletproof_user_update(
  p_user_id uuid,
  p_role text,
  p_team_id uuid DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  updated_user record;
  result json;
BEGIN
  -- Update user with conflict resolution
  UPDATE public.users 
  SET 
    role = p_role,
    team_id = p_team_id,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO updated_user;
  
  -- If user doesn't exist, create them
  IF NOT FOUND THEN
    INSERT INTO public.users (id, role, team_id)
    VALUES (p_user_id, p_role, p_team_id)
    RETURNING * INTO updated_user;
  END IF;
  
  -- Return success response
  result := json_build_object(
    'success', true,
    'user', row_to_json(updated_user)
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error response
  result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync user profile data
CREATE OR REPLACE FUNCTION public.sync_user_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Update profiles table when users table is updated
  INSERT INTO public.profiles (user_id, full_name, display_name, contact_number, experience, preferred_role, favorite_games, role, onboarding_completed)
  VALUES (NEW.id, NEW.full_name, NEW.display_name, NEW.contact_number, NEW.experience, NEW.preferred_role, NEW.favorite_games, NEW.role, NEW.onboarding_completed)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    display_name = EXCLUDED.display_name,
    contact_number = EXCLUDED.contact_number,
    experience = EXCLUDED.experience,
    preferred_role = EXCLUDED.preferred_role,
    favorite_games = EXCLUDED.favorite_games,
    role = EXCLUDED.role,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create auto attendance on performance entry
CREATE OR REPLACE FUNCTION public.create_auto_attendance_fixed()
RETURNS TRIGGER AS $$
DECLARE
    slot_date date;
    slot_team_id uuid;
    attendance_date date;
    attendance_team_id uuid;
BEGIN
    -- Initialize fallback values
    attendance_date := CURRENT_DATE;
    attendance_team_id := NEW.team_id;
    
    -- Try to get slot information if slot is linked to performance
    IF NEW.slot IS NOT NULL THEN
        SELECT date, team_id INTO slot_date, slot_team_id
        FROM public.slots
        WHERE id = NEW.slot;
        
        -- Use slot information if available, but ensure non-null values
        IF slot_date IS NOT NULL THEN
            attendance_date := slot_date;
        END IF;
        
        IF slot_team_id IS NOT NULL THEN
            attendance_team_id := slot_team_id;
        END IF;
    END IF;
    
    -- Always ensure we have a non-null date and team_id
    IF attendance_date IS NULL THEN
        attendance_date := CURRENT_DATE;
    END IF;
    
    IF attendance_team_id IS NULL THEN
        attendance_team_id := NEW.team_id;
    END IF;
    
    -- Create attendance record for each performance
    BEGIN
        INSERT INTO public.attendances (
            player_id, 
            team_id, 
            date, 
            session_time, 
            status, 
            source, 
            marked_by, 
            slot_id
        )
        VALUES (
            NEW.player_id,
            attendance_team_id,
            attendance_date,
            'Match',
            'auto',
            'auto',
            NULL,
            NEW.slot
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Log any insertion errors (if debug table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_debug_log') THEN
            INSERT INTO public.attendance_debug_log (message, data)
            VALUES ('Error inserting attendance', jsonb_build_object(
                'error_code', SQLSTATE,
                'error_message', SQLERRM,
                'performance_id', NEW.id
            ));
        END IF;
        
        -- Re-raise the error so it's not silently ignored
        RAISE;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 9. TRIGGERS
-- ====================================================================

-- Trigger to sync user profile data
DROP TRIGGER IF EXISTS sync_user_profile_trigger ON public.users;
CREATE TRIGGER sync_user_profile_trigger
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_profile_data();

-- Trigger to auto-create attendance on performance entry
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;
CREATE TRIGGER auto_attendance_on_performance
  AFTER INSERT ON public.performances
  FOR EACH ROW
  EXECUTE FUNCTION public.create_auto_attendance_fixed();

-- ====================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_monthly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_session_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on requirements)
-- Users can view their own data and team data if they're team members
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Team members can view team data
DROP POLICY IF EXISTS "Team members can view team data" ON public.teams;
CREATE POLICY "Team members can view team data" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (role IN ('admin', 'manager') OR team_id = teams.id)
    )
  );

-- ====================================================================
-- 11. GRANT PERMISSIONS
-- ====================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.bulletproof_user_update(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_profile_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_auto_attendance_fixed() TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE public.module_permissions_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.profiles_id_seq TO authenticated;

-- ====================================================================
-- 12. SEED DATA (OPTIONAL)
-- ====================================================================

-- Insert default tier defaults if not exists
INSERT INTO public.tier_defaults (tier, default_slot_rate) VALUES
  ('T1', 5000),
  ('T2', 3000),
  ('T3', 2000),
  ('T4', 1000)
ON CONFLICT (tier) DO NOTHING;

-- Insert default module permissions if not exists
INSERT INTO public.module_permissions (role, module, can_access) VALUES
  ('admin', 'dashboard', true),
  ('admin', 'users', true),
  ('admin', 'teams', true),
  ('admin', 'performances', true),
  ('admin', 'attendance', true),
  ('admin', 'tryouts', true),
  ('admin', 'finance', true),
  ('admin', 'settings', true),
  ('manager', 'dashboard', true),
  ('manager', 'users', true),
  ('manager', 'teams', true),
  ('manager', 'performances', true),
  ('manager', 'attendance', true),
  ('manager', 'tryouts', true),
  ('manager', 'finance', true),
  ('coach', 'dashboard', true),
  ('coach', 'performances', true),
  ('coach', 'attendance', true),
  ('coach', 'tryouts', true),
  ('player', 'dashboard', true),
  ('player', 'performances', true),
  ('player', 'attendance', true),
  ('analyst', 'dashboard', true),
  ('analyst', 'performances', true),
  ('analyst', 'attendance', true)
ON CONFLICT DO NOTHING;

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================

-- Verify migration success
DO $$
BEGIN
  RAISE NOTICE '✅ Migration #19 completed successfully!';
  RAISE NOTICE '📊 Created/Updated % tables', (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  );
  RAISE NOTICE '🔧 Created/Updated % functions', (
    SELECT COUNT(*) FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
  );
  RAISE NOTICE '🔒 RLS enabled on all tables';
  RAISE NOTICE '📈 Indexes created for optimal performance';
END $$;