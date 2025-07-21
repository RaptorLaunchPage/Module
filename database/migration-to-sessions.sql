-- =====================================================
-- MIGRATION TO SESSION-WISE ATTENDANCE SYSTEM
-- This script safely migrates existing attendance data to the new session-based system
-- =====================================================

-- Step 1: Create new tables (sessions and holidays)
CREATE TABLE IF NOT EXISTS public.sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL,
    session_type text NOT NULL CHECK (session_type IN ('practice', 'tournament', 'meeting')),
    session_subtype text, -- Morning/Evening/Night for practice, Scrims for tournament, etc.
    date date NOT NULL,
    start_time time,
    end_time time,
    cutoff_time time, -- Cutoff for marking attendance (e.g., 12:00 PM)
    title text, -- Optional title for tournament/meeting sessions
    description text,
    is_mandatory boolean DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Prevent duplicate practice sessions for same team/date/subtype
    CONSTRAINT sessions_unique_practice UNIQUE(team_id, date, session_type, session_subtype)
);

CREATE TABLE IF NOT EXISTS public.holidays (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    team_id uuid, -- NULL means global holiday, specific team_id means team-specific
    date date NOT NULL,
    name text NOT NULL,
    recurring_day integer, -- 0=Sunday, 1=Monday, etc. for weekly recurring holidays
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT holidays_pkey PRIMARY KEY (id),
    CONSTRAINT holidays_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT holidays_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT holidays_recurring_day_check CHECK (recurring_day >= 0 AND recurring_day <= 6)
);

-- Step 2: Add new columns to attendances table (without constraints first)
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Step 3: Create sessions for existing attendance records
DO $$
DECLARE
    attendance_record RECORD;
    session_id_var uuid;
    admin_user_id uuid;
BEGIN
    -- Get an admin user for created_by field
    SELECT id INTO admin_user_id FROM public.users WHERE role = 'admin' LIMIT 1;
    
    -- If no admin found, use the first user
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM public.users LIMIT 1;
    END IF;
    
    -- Create sessions for existing attendance records
    FOR attendance_record IN 
        SELECT DISTINCT team_id, date, session_time 
        FROM public.attendances 
        WHERE session_id IS NULL
    LOOP
        -- Determine session type and subtype based on session_time
        IF attendance_record.session_time IN ('Morning', 'Evening', 'Night') THEN
            -- Practice session
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
            ON CONFLICT (team_id, date, session_type, session_subtype) DO NOTHING
            RETURNING id INTO session_id_var;
            
            -- Get the session ID if it already existed
            IF session_id_var IS NULL THEN
                SELECT id INTO session_id_var 
                FROM public.sessions 
                WHERE team_id = attendance_record.team_id 
                AND date = attendance_record.date 
                AND session_type = 'practice' 
                AND session_subtype = attendance_record.session_time;
            END IF;
            
        ELSIF attendance_record.session_time = 'Match' THEN
            -- Tournament/Scrims session
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
            ON CONFLICT (team_id, date, session_type, session_subtype) DO NOTHING
            RETURNING id INTO session_id_var;
            
            -- Get the session ID if it already existed
            IF session_id_var IS NULL THEN
                SELECT id INTO session_id_var 
                FROM public.sessions 
                WHERE team_id = attendance_record.team_id 
                AND date = attendance_record.date 
                AND session_type = 'tournament' 
                AND session_subtype = 'Scrims';
            END IF;
        END IF;
        
        -- Update attendance records with the session_id
        UPDATE public.attendances 
        SET session_id = session_id_var
        WHERE team_id = attendance_record.team_id 
        AND date = attendance_record.date 
        AND session_time = attendance_record.session_time
        AND session_id IS NULL;
        
    END LOOP;
END;
$$;

-- Step 4: Update existing status values to lowercase and set source
UPDATE public.attendances SET 
    status = CASE 
        WHEN status = 'Present' THEN 'present'
        WHEN status = 'Absent' THEN 'absent'
        WHEN status = 'Auto (Match)' THEN 'present'
        WHEN status = 'Late' THEN 'late'
        ELSE LOWER(status)
    END,
    source = CASE 
        WHEN status = 'Auto (Match)' THEN 'auto'
        WHEN marked_by IS NULL THEN 'system'
        ELSE 'manual'
    END
WHERE session_id IS NOT NULL;

-- Step 5: Drop old constraints and add new ones
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_session_time_check;
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_status_check;
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_unique_player_date_session;

-- Add new constraints
ALTER TABLE public.attendances ADD CONSTRAINT attendances_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.attendances ADD CONSTRAINT attendances_status_check 
    CHECK (status IN ('present', 'late', 'absent'));

ALTER TABLE public.attendances ADD CONSTRAINT attendances_source_check
    CHECK (source IN ('manual', 'auto', 'system'));

ALTER TABLE public.attendances ADD CONSTRAINT attendances_unique_player_session 
    UNIQUE(player_id, session_id);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_team_date ON public.sessions(team_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_type_date ON public.sessions(session_type, date);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_team_date ON public.holidays(team_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_session_id ON public.attendances(session_id);

-- Step 7: Enable RLS on new tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for sessions
CREATE POLICY "Team members can view team sessions" ON public.sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND team_id = sessions.team_id
        )
    );

CREATE POLICY "Admins can view all sessions" ON public.sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can create sessions" ON public.sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can update sessions" ON public.sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Step 9: Create RLS policies for holidays
CREATE POLICY "Everyone can view holidays" ON public.holidays
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage holidays" ON public.holidays
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Step 10: Create helper functions
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
            -- Specific date holiday
            (date = check_date AND (team_id IS NULL OR team_id = team_id_param))
            OR 
            -- Recurring weekly holiday
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

-- Step 11: Create/Update triggers
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;
DROP TRIGGER IF EXISTS auto_match_attendance_on_performance ON public.performances;

CREATE TRIGGER auto_match_attendance_on_performance
    AFTER INSERT ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.create_match_attendance_from_performance();

-- Step 12: Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.sessions TO authenticated;
GRANT SELECT ON public.holidays TO authenticated;
GRANT INSERT, UPDATE ON public.holidays TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_holiday(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_practice_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_mark_absent_after_cutoff() TO authenticated;

-- Migration complete!
-- The session_time and date columns are kept for backward compatibility
-- All existing attendance records now have session_id and updated status values