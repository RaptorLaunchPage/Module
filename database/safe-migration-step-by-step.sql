-- =====================================================
-- SAFE STEP-BY-STEP MIGRATION TO SESSION SYSTEM
-- Run each step separately and verify before proceeding
-- =====================================================

-- STEP 1: Check current state
-- Run this first to see what we're working with
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'attendances' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing constraints
SELECT 
    constraint_name, 
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'attendances' 
AND table_schema = 'public';

-- Check existing status values
SELECT DISTINCT status, COUNT(*) as count
FROM public.attendances 
GROUP BY status;

-- =====================================================
-- STEP 2: Create new tables (safe to run multiple times)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL,
    session_type text NOT NULL CHECK (session_type IN ('practice', 'tournament', 'meeting')),
    session_subtype text,
    date date NOT NULL,
    start_time time,
    end_time time,
    cutoff_time time,
    title text,
    description text,
    is_mandatory boolean DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT sessions_unique_practice UNIQUE(team_id, date, session_type, session_subtype)
);

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
    CONSTRAINT holidays_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT holidays_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- =====================================================
-- STEP 3: Add new columns to attendances (without constraints)
-- =====================================================

-- Add session_id column
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS session_id uuid;

-- Add source column
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- =====================================================
-- STEP 4: Create sessions for existing attendance data
-- =====================================================

DO $$
DECLARE
    attendance_record RECORD;
    session_id_var uuid;
    admin_user_id uuid;
BEGIN
    -- Get admin user
    SELECT id INTO admin_user_id FROM public.users WHERE role = 'admin' LIMIT 1;
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM public.users LIMIT 1;
    END IF;
    
    -- Only process records that don't have session_id yet
    FOR attendance_record IN 
        SELECT DISTINCT team_id, date, session_time 
        FROM public.attendances 
        WHERE session_id IS NULL
    LOOP
        session_id_var := NULL;
        
        -- Create appropriate session based on session_time
        IF attendance_record.session_time IN ('Morning', 'Evening', 'Night') THEN
            -- Practice session
            BEGIN
                INSERT INTO public.sessions (
                    team_id, session_type, session_subtype, date, 
                    cutoff_time, is_mandatory, created_by
                )
                VALUES (
                    attendance_record.team_id,
                    'practice',
                    attendance_record.session_time,
                    attendance_record.date,
                    '12:00:00'::time,
                    true,
                    admin_user_id
                )
                RETURNING id INTO session_id_var;
            EXCEPTION WHEN unique_violation THEN
                -- Session already exists, get its ID
                SELECT id INTO session_id_var 
                FROM public.sessions 
                WHERE team_id = attendance_record.team_id 
                AND date = attendance_record.date 
                AND session_type = 'practice' 
                AND session_subtype = attendance_record.session_time;
            END;
            
        ELSIF attendance_record.session_time = 'Match' THEN
            -- Tournament/Scrims session
            BEGIN
                INSERT INTO public.sessions (
                    team_id, session_type, session_subtype, date, 
                    title, is_mandatory, created_by
                )
                VALUES (
                    attendance_record.team_id,
                    'tournament',
                    'Scrims',
                    attendance_record.date,
                    'Historical Scrims Session',
                    false,
                    admin_user_id
                )
                RETURNING id INTO session_id_var;
            EXCEPTION WHEN unique_violation THEN
                -- Session already exists, get its ID
                SELECT id INTO session_id_var 
                FROM public.sessions 
                WHERE team_id = attendance_record.team_id 
                AND date = attendance_record.date 
                AND session_type = 'tournament' 
                AND session_subtype = 'Scrims';
            END;
        END IF;
        
        -- Update attendance records with session_id
        IF session_id_var IS NOT NULL THEN
            UPDATE public.attendances 
            SET session_id = session_id_var
            WHERE team_id = attendance_record.team_id 
            AND date = attendance_record.date 
            AND session_time = attendance_record.session_time
            AND session_id IS NULL;
        END IF;
    END LOOP;
END;
$$;

-- =====================================================
-- STEP 5: Update status values to lowercase
-- =====================================================

-- First, let's see what status values we have
SELECT DISTINCT status, COUNT(*) 
FROM public.attendances 
GROUP BY status;

-- Update status values to lowercase
UPDATE public.attendances SET 
    status = CASE 
        WHEN status = 'Present' THEN 'present'
        WHEN status = 'Absent' THEN 'absent'
        WHEN status = 'Auto (Match)' THEN 'present'
        WHEN status = 'Late' THEN 'late'
        WHEN status = 'present' THEN 'present'  -- already correct
        WHEN status = 'absent' THEN 'absent'    -- already correct
        WHEN status = 'late' THEN 'late'        -- already correct
        ELSE LOWER(status)
    END;

-- Update source values
UPDATE public.attendances SET 
    source = CASE 
        WHEN status = 'present' AND marked_by IS NULL THEN 'auto'
        WHEN marked_by IS NULL THEN 'system'
        ELSE 'manual'
    END
WHERE source IS NULL OR source = 'manual';

-- =====================================================
-- STEP 6: Verify data before adding constraints
-- =====================================================

-- Check that all attendance records have session_id
SELECT COUNT(*) as records_without_session_id
FROM public.attendances 
WHERE session_id IS NULL;

-- Check status values
SELECT DISTINCT status, COUNT(*) 
FROM public.attendances 
GROUP BY status;

-- Check source values  
SELECT DISTINCT source, COUNT(*)
FROM public.attendances 
GROUP BY source;

-- =====================================================
-- STEP 7: Remove old constraints carefully
-- =====================================================

-- Drop old status constraint if it exists
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_status_check;

-- Drop old session_time constraint if it exists
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_session_time_check;

-- Drop old unique constraint
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_unique_player_date_session;

-- =====================================================
-- STEP 8: Add new constraints
-- =====================================================

-- Add foreign key to sessions
ALTER TABLE public.attendances 
ADD CONSTRAINT attendances_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Add status constraint (only for valid lowercase values)
ALTER TABLE public.attendances 
ADD CONSTRAINT attendances_status_new_check 
CHECK (status IN ('present', 'late', 'absent'));

-- Add source constraint
ALTER TABLE public.attendances 
ADD CONSTRAINT attendances_source_check
CHECK (source IN ('manual', 'auto', 'system'));

-- Add new unique constraint for session-based system
ALTER TABLE public.attendances 
ADD CONSTRAINT attendances_unique_player_session 
UNIQUE(player_id, session_id);

-- =====================================================
-- STEP 9: Create indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sessions_team_date ON public.sessions(team_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_type_date ON public.sessions(session_type, date);
CREATE INDEX IF NOT EXISTS idx_attendances_session_id ON public.attendances(session_id);

-- =====================================================
-- STEP 10: Enable RLS and create policies
-- =====================================================

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS policies for sessions
DROP POLICY IF EXISTS "Team members can view team sessions" ON public.sessions;
CREATE POLICY "Team members can view team sessions" ON public.sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND team_id = sessions.team_id
        )
    );

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.sessions;
CREATE POLICY "Admins can view all sessions" ON public.sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Admins can create sessions" ON public.sessions;
CREATE POLICY "Admins can create sessions" ON public.sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- RLS policies for holidays
DROP POLICY IF EXISTS "Everyone can view holidays" ON public.holidays;
CREATE POLICY "Everyone can view holidays" ON public.holidays
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage holidays" ON public.holidays;
CREATE POLICY "Admins can manage holidays" ON public.holidays
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- STEP 11: Create functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_holiday(check_date date, team_id_param uuid DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
    day_of_week integer;
BEGIN
    day_of_week := EXTRACT(DOW FROM check_date);
    
    RETURN EXISTS (
        SELECT 1 FROM public.holidays 
        WHERE is_active = true
        AND (
            (date = check_date AND (team_id IS NULL OR team_id = team_id_param))
            OR 
            (recurring_day = day_of_week AND (team_id IS NULL OR team_id = team_id_param))
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_daily_practice_sessions()
RETURNS void AS $$
DECLARE
    team_record record;
    practice_times text[] := ARRAY['Morning', 'Evening', 'Night'];
    practice_time text;
    current_date date := CURRENT_DATE;
BEGIN
    FOR team_record IN 
        SELECT id, name FROM public.teams WHERE is_active = true
    LOOP
        IF NOT public.is_holiday(current_date, team_record.id) THEN
            FOREACH practice_time IN ARRAY practice_times
            LOOP
                INSERT INTO public.sessions (
                    team_id, session_type, session_subtype, date, 
                    cutoff_time, created_by
                )
                SELECT 
                    team_record.id,
                    'practice',
                    practice_time,
                    current_date,
                    '12:00:00'::time,
                    (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)
                WHERE NOT EXISTS (
                    SELECT 1 FROM public.sessions 
                    WHERE team_id = team_record.id 
                    AND date = current_date 
                    AND session_type = 'practice' 
                    AND session_subtype = practice_time
                );
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auto_mark_absent_after_cutoff()
RETURNS void AS $$
DECLARE
    session_record record;
    player_record record;
BEGIN
    FOR session_record IN 
        SELECT s.id, s.team_id, s.cutoff_time
        FROM public.sessions s
        WHERE s.date = CURRENT_DATE 
        AND s.session_type = 'practice'
        AND s.cutoff_time < CURRENT_TIME
        AND s.is_mandatory = true
    LOOP
        FOR player_record IN
            SELECT u.id
            FROM public.users u
            WHERE u.team_id = session_record.team_id
            AND u.role = 'player'
            AND NOT EXISTS (
                SELECT 1 FROM public.attendances a
                WHERE a.player_id = u.id 
                AND a.session_id = session_record.id
            )
        LOOP
            INSERT INTO public.attendances (
                player_id, team_id, session_id, 
                status, source, created_at
            ) VALUES (
                player_record.id,
                session_record.team_id,
                session_record.id,
                'absent',
                'system',
                now()
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_match_attendance_from_performance()
RETURNS TRIGGER AS $$
DECLARE
    match_session_id uuid;
    performance_date date;
BEGIN
    performance_date := CURRENT_DATE;
    IF NEW.slot IS NOT NULL THEN
        SELECT date INTO performance_date FROM public.slots WHERE id = NEW.slot;
    END IF;

    INSERT INTO public.sessions (
        team_id, session_type, session_subtype, date, 
        title, is_mandatory, created_by
    )
    SELECT 
        NEW.team_id,
        'tournament',
        'Scrims',
        performance_date,
        'Auto-generated Scrims Session',
        false,
        NEW.player_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sessions 
        WHERE team_id = NEW.team_id 
        AND date = performance_date 
        AND session_type = 'tournament'
        AND session_subtype = 'Scrims'
    )
    RETURNING id INTO match_session_id;

    IF match_session_id IS NULL THEN
        SELECT id INTO match_session_id 
        FROM public.sessions 
        WHERE team_id = NEW.team_id 
        AND date = performance_date 
        AND session_type = 'tournament'
        AND session_subtype = 'Scrims';
    END IF;

    INSERT INTO public.attendances (
        player_id, team_id, session_id, 
        status, source, slot_id
    )
    SELECT 
        NEW.player_id,
        NEW.team_id,
        match_session_id,
        'present',
        'auto',
        NEW.slot
    WHERE NOT EXISTS (
        SELECT 1 FROM public.attendances 
        WHERE player_id = NEW.player_id 
        AND session_id = match_session_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 12: Create triggers
-- =====================================================

DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;
DROP TRIGGER IF EXISTS auto_match_attendance_on_performance ON public.performances;

CREATE TRIGGER auto_match_attendance_on_performance
    AFTER INSERT ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.create_match_attendance_from_performance();

-- =====================================================
-- STEP 13: Grant permissions
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.holidays TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_holiday(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_practice_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_mark_absent_after_cutoff() TO authenticated;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Check final state
SELECT 'Migration completed successfully!' as status;

-- Verify all attendances have session_id
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'All attendance records have session_id ✅'
        ELSE CONCAT(COUNT(*), ' attendance records missing session_id ❌')
    END as session_id_check
FROM public.attendances 
WHERE session_id IS NULL;

-- Verify status values
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'All status values are valid ✅'
        ELSE CONCAT(COUNT(*), ' invalid status values ❌')
    END as status_check
FROM public.attendances 
WHERE status NOT IN ('present', 'late', 'absent');

-- Show session counts
SELECT 
    session_type,
    session_subtype,
    COUNT(*) as session_count
FROM public.sessions 
GROUP BY session_type, session_subtype
ORDER BY session_type, session_subtype;