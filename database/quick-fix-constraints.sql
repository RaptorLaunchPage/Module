-- =====================================================
-- QUICK FIX: Just fix the constraint issue
-- No migration, just update what's needed
-- =====================================================

-- Step 1: Check what constraints exist
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'attendances' AND table_schema = 'public';

-- Step 2: Drop the problematic status constraint
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_status_check;

-- Step 3: Add the correct status constraint for both old and new values
ALTER TABLE public.attendances 
ADD CONSTRAINT attendances_status_check 
CHECK (status IN ('Present', 'Absent', 'Auto (Match)', 'Late', 'present', 'late', 'absent'));

-- Step 4: Add session_id column if it doesn't exist
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS session_id uuid;

-- Step 5: Add source column if it doesn't exist  
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Step 6: Create sessions table if it doesn't exist
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

-- Step 7: Create holidays table if it doesn't exist
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

-- Step 8: Add foreign key to sessions if it doesn't exist
DO $$
BEGIN
    -- Check if foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendances_session_id_fkey' 
        AND table_name = 'attendances'
    ) THEN
        ALTER TABLE public.attendances 
        ADD CONSTRAINT attendances_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
    END IF;
END;
$$;

-- Step 9: Enable RLS on new tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Step 10: Create basic RLS policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Team members can view team sessions" ON public.sessions;
    DROP POLICY IF EXISTS "Admins can view all sessions" ON public.sessions;
    DROP POLICY IF EXISTS "Admins can create sessions" ON public.sessions;
    DROP POLICY IF EXISTS "Everyone can view holidays" ON public.holidays;
    DROP POLICY IF EXISTS "Admins can manage holidays" ON public.holidays;
    
    -- Create policies
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
END;
$$;

-- Step 11: Create essential functions
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

-- Step 12: Create trigger for auto-attendance
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;
DROP TRIGGER IF EXISTS auto_match_attendance_on_performance ON public.performances;

CREATE TRIGGER auto_match_attendance_on_performance
    AFTER INSERT ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.create_match_attendance_from_performance();

-- Step 13: Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.holidays TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_practice_sessions() TO authenticated;

-- Done! This should fix the constraint issue without full migration
SELECT 'Quick fix completed! Attendance system should now work.' as status;