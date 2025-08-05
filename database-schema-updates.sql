-- Database Schema Updates for Missing Tables/Columns
-- Run this script to add missing schema elements that are not in the current database

-- Note: Based on the provided schema, most tables already exist.
-- This script only adds missing elements that might be referenced in the new components.

-- Add any missing columns to existing tables if needed
-- (Most columns appear to already exist in the provided schema)

-- Add training_details column to attendances table if it doesn't exist
-- This is used by the training session attendance system
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'training_details'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN training_details jsonb DEFAULT NULL;
    END IF;
END $$;

-- Add verification status and manager notes to attendances for training verification
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN verification_status text DEFAULT 'pending' 
        CHECK (verification_status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text]));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'manager_notes'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN manager_notes text DEFAULT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'verified_by'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN verified_by uuid DEFAULT NULL,
        ADD CONSTRAINT attendances_verified_by_fkey 
        FOREIGN KEY (verified_by) REFERENCES public.users(id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN verified_at timestamp with time zone DEFAULT NULL;
    END IF;
END $$;

-- Add name and description columns to sessions table for daily session manager
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.sessions 
        ADD COLUMN name text DEFAULT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'max_participants'
    ) THEN
        ALTER TABLE public.sessions 
        ADD COLUMN max_participants integer DEFAULT NULL 
        CHECK (max_participants > 0 OR max_participants IS NULL);
    END IF;
END $$;

-- Add indexes for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_attendances_verification_status 
ON public.attendances(verification_status);

CREATE INDEX IF NOT EXISTS idx_attendances_date_team 
ON public.attendances(date, team_id);

CREATE INDEX IF NOT EXISTS idx_sessions_date_team 
ON public.sessions(date, team_id);

CREATE INDEX IF NOT EXISTS idx_slots_date_team 
ON public.slots(date, team_id);

-- Add RLS policies for new columns if needed
-- (Existing RLS policies should cover the new columns)

-- Create function to generate daily practice sessions if it doesn't exist
CREATE OR REPLACE FUNCTION generate_daily_practice_sessions(target_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function generates daily practice sessions based on practice_session_config
    -- Insert sessions for teams that have active configurations
    INSERT INTO public.sessions (
        team_id,
        session_type,
        session_subtype,
        date,
        start_time,
        end_time,
        cutoff_time,
        title,
        description,
        is_mandatory,
        created_by
    )
    SELECT 
        psc.team_id,
        'practice'::text,
        psc.session_subtype,
        target_date,
        psc.start_time,
        psc.end_time,
        psc.cutoff_time,
        CONCAT(psc.session_subtype, ' Practice - ', target_date),
        'Auto-generated daily practice session',
        true,
        psc.created_by
    FROM public.practice_session_config psc
    WHERE psc.is_active = true
    AND NOT EXISTS (
        -- Don't create if session already exists for this team/date/subtype
        SELECT 1 FROM public.sessions s
        WHERE s.team_id = psc.team_id
        AND s.date = target_date
        AND s.session_subtype = psc.session_subtype
        AND s.session_type = 'practice'
    );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION generate_daily_practice_sessions(date) TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN public.attendances.training_details IS 'JSON data for training session details including mode, hours, screenshots, etc.';
COMMENT ON COLUMN public.attendances.verification_status IS 'Status of manager verification for training attendance';
COMMENT ON COLUMN public.attendances.manager_notes IS 'Notes added by manager during verification process';
COMMENT ON COLUMN public.attendances.verified_by IS 'User ID of manager who verified the attendance';
COMMENT ON COLUMN public.attendances.verified_at IS 'Timestamp when attendance was verified';
COMMENT ON COLUMN public.sessions.name IS 'Custom name for the session';
COMMENT ON COLUMN public.sessions.max_participants IS 'Maximum number of participants allowed in the session';

-- Update any existing data if needed
-- (No data updates required for this implementation)

COMMIT;