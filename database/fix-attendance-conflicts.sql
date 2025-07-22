-- =====================================================
-- FIX ATTENDANCE DATABASE CONFLICTS
-- Comprehensive fix for session-based attendance system
-- =====================================================

-- Step 1: Backup existing data and prepare for migration
-- Create a backup of current attendance data
CREATE TABLE IF NOT EXISTS public.attendances_backup AS 
SELECT * FROM public.attendances;

-- Step 2: Clean up conflicting constraints and prepare for new system
-- Drop problematic constraints
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_session_time_check;
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_unique_player_date_session;
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_unique_player_session;

-- Step 3: Standardize status values (convert all to lowercase)
UPDATE public.attendances 
SET status = CASE 
    WHEN status = 'Present' THEN 'present'
    WHEN status = 'Absent' THEN 'absent' 
    WHEN status = 'Late' THEN 'late'
    WHEN status = 'Auto (Match)' THEN 'auto'
    ELSE LOWER(status)
END;

-- Step 4: Update status constraint to only allow lowercase values
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_status_check;
ALTER TABLE public.attendances ADD CONSTRAINT attendances_status_check 
    CHECK (status IN ('present', 'late', 'absent', 'auto'));

-- Step 5: Ensure source column exists with proper constraint
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_source_check;
ALTER TABLE public.attendances ADD CONSTRAINT attendances_source_check 
    CHECK (source IN ('manual', 'auto', 'system'));

-- Step 6: Create missing sessions for existing attendance records
-- This ensures all old attendance records have corresponding sessions
INSERT INTO public.sessions (team_id, session_type, session_subtype, date, start_time, end_time, cutoff_time, created_by, is_mandatory)
SELECT DISTINCT 
    a.team_id,
    CASE 
        WHEN a.session_time = 'Match' THEN 'tournament'
        ELSE 'practice'
    END as session_type,
    CASE 
        WHEN a.session_time = 'Match' THEN 'Scrims'
        ELSE a.session_time
    END as session_subtype,
    a.date,
    CASE 
        WHEN a.session_time = 'Morning' THEN '06:00:00'::time
        WHEN a.session_time = 'Evening' THEN '16:00:00'::time
        WHEN a.session_time = 'Night' THEN '21:00:00'::time
        ELSE '18:00:00'::time
    END as start_time,
    CASE 
        WHEN a.session_time = 'Morning' THEN '10:00:00'::time
        WHEN a.session_time = 'Evening' THEN '20:00:00'::time
        WHEN a.session_time = 'Night' THEN '23:59:00'::time
        ELSE '22:00:00'::time
    END as end_time,
    '12:00:00'::time as cutoff_time,
    (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1) as created_by,
    CASE 
        WHEN a.session_time = 'Match' THEN false
        ELSE true
    END as is_mandatory
FROM public.attendances a
WHERE a.session_id IS NULL
ON CONFLICT DO NOTHING;

-- Step 7: Link existing attendance records to sessions
UPDATE public.attendances 
SET session_id = (
    SELECT s.id 
    FROM public.sessions s 
    WHERE s.team_id = attendances.team_id 
    AND s.date = attendances.date 
    AND (
        (s.session_subtype = attendances.session_time) OR
        (attendances.session_time = 'Match' AND s.session_subtype = 'Scrims')
    )
    LIMIT 1
)
WHERE session_id IS NULL;

-- Step 8: Make session_id required and add proper constraints
-- First, handle any orphaned records without valid session_id
DELETE FROM public.attendances WHERE session_id IS NULL;

-- Now make session_id required
ALTER TABLE public.attendances ALTER COLUMN session_id SET NOT NULL;

-- Add unique constraint for attendance marking (one attendance per player per session)
ALTER TABLE public.attendances ADD CONSTRAINT attendances_unique_player_session 
    UNIQUE(player_id, session_id);

-- Step 9: Create practice session configuration table
CREATE TABLE IF NOT EXISTS public.practice_session_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    team_id uuid, -- NULL means global default
    session_subtype text NOT NULL CHECK (session_subtype IN ('Morning', 'Evening', 'Night')),
    start_time time NOT NULL,
    end_time time NOT NULL,
    cutoff_time time DEFAULT '12:00:00'::time,
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT practice_session_config_pkey PRIMARY KEY (id),
    CONSTRAINT practice_session_config_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT practice_session_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
    CONSTRAINT practice_session_config_unique_team_subtype UNIQUE(team_id, session_subtype)
);

-- Step 10: Insert default practice session timings
INSERT INTO public.practice_session_config (team_id, session_subtype, start_time, end_time, cutoff_time, created_by)
SELECT 
    NULL as team_id, -- Global defaults
    subtype,
    start_time,
    end_time,
    '12:00:00'::time as cutoff_time,
    (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1) as created_by
FROM (VALUES 
    ('Morning', '06:00:00'::time, '10:00:00'::time),
    ('Evening', '16:00:00'::time, '20:00:00'::time),
    ('Night', '21:00:00'::time, '23:59:00'::time)
) AS defaults(subtype, start_time, end_time)
WHERE EXISTS (SELECT 1 FROM public.users WHERE role = 'admin')
ON CONFLICT (team_id, session_subtype) DO NOTHING;

-- Step 11: Create function to check if date is holiday
CREATE OR REPLACE FUNCTION public.is_holiday(check_date date, team_id_param uuid DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
    -- Check for team-specific holidays first, then global holidays
    RETURN EXISTS (
        SELECT 1 FROM public.holidays 
        WHERE date = check_date 
        AND is_active = true
        AND (
            (team_id IS NULL) OR  -- Global holiday
            (team_id = team_id_param)  -- Team-specific holiday
        )
    ) OR EXISTS (
        SELECT 1 FROM public.holidays 
        WHERE recurring_day = EXTRACT(DOW FROM check_date)
        AND is_active = true
        AND (
            (team_id IS NULL) OR  -- Global recurring holiday
            (team_id = team_id_param)  -- Team-specific recurring holiday
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create function to generate daily practice sessions
CREATE OR REPLACE FUNCTION public.generate_daily_practice_sessions(target_date date DEFAULT CURRENT_DATE)
RETURNS integer AS $$
DECLARE
    team_record RECORD;
    config_record RECORD;
    sessions_created integer := 0;
BEGIN
    -- Loop through all active teams
    FOR team_record IN 
        SELECT id FROM public.teams WHERE status = 'active'
    LOOP
        -- Skip if it's a holiday for this team
        IF is_holiday(target_date, team_record.id) THEN
            CONTINUE;
        END IF;
        
        -- Generate sessions for this team using their config or global defaults
        FOR config_record IN 
            SELECT 
                COALESCE(team_config.session_subtype, global_config.session_subtype) as session_subtype,
                COALESCE(team_config.start_time, global_config.start_time) as start_time,
                COALESCE(team_config.end_time, global_config.end_time) as end_time,
                COALESCE(team_config.cutoff_time, global_config.cutoff_time) as cutoff_time
            FROM (VALUES ('Morning'), ('Evening'), ('Night')) AS subtypes(session_subtype)
            LEFT JOIN public.practice_session_config team_config 
                ON team_config.team_id = team_record.id 
                AND team_config.session_subtype = subtypes.session_subtype
                AND team_config.is_active = true
            LEFT JOIN public.practice_session_config global_config 
                ON global_config.team_id IS NULL 
                AND global_config.session_subtype = subtypes.session_subtype
                AND global_config.is_active = true
            WHERE COALESCE(team_config.session_subtype, global_config.session_subtype) IS NOT NULL
        LOOP
            -- Insert session if it doesn't exist
            INSERT INTO public.sessions (
                team_id, 
                session_type, 
                session_subtype, 
                date, 
                start_time, 
                end_time, 
                cutoff_time,
                title,
                is_mandatory,
                created_by
            )
            SELECT 
                team_record.id,
                'practice',
                config_record.session_subtype,
                target_date,
                config_record.start_time,
                config_record.end_time,
                config_record.cutoff_time,
                'Daily Practice - ' || config_record.session_subtype,
                true,
                (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)
            WHERE NOT EXISTS (
                SELECT 1 FROM public.sessions 
                WHERE team_id = team_record.id 
                AND date = target_date 
                AND session_type = 'practice'
                AND session_subtype = config_record.session_subtype
            );
            
            GET DIAGNOSTICS sessions_created = sessions_created + ROW_COUNT;
        END LOOP;
    END LOOP;
    
    RETURN sessions_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Create function to auto-mark absent players after cutoff
CREATE OR REPLACE FUNCTION public.auto_mark_absent_after_cutoff()
RETURNS integer AS $$
DECLARE
    marked_absent integer := 0;
BEGIN
    -- Mark players absent for practice sessions where cutoff time has passed
    INSERT INTO public.attendances (player_id, team_id, date, session_id, status, source)
    SELECT DISTINCT
        u.id as player_id,
        s.team_id,
        s.date,
        s.id as session_id,
        'absent' as status,
        'system' as source
    FROM public.sessions s
    JOIN public.users u ON u.team_id = s.team_id AND u.role = 'player'
    WHERE s.session_type = 'practice'
    AND s.date = CURRENT_DATE
    AND s.cutoff_time < CURRENT_TIME
    AND NOT EXISTS (
        SELECT 1 FROM public.attendances a 
        WHERE a.session_id = s.id 
        AND a.player_id = u.id
    );
    
    GET DIAGNOSTICS marked_absent = ROW_COUNT;
    RETURN marked_absent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendances_session_player ON public.attendances(session_id, player_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date_team ON public.attendances(date, team_id);
CREATE INDEX IF NOT EXISTS idx_sessions_team_date_type ON public.sessions(team_id, date, session_type);
CREATE INDEX IF NOT EXISTS idx_practice_config_team_subtype ON public.practice_session_config(team_id, session_subtype);

-- Step 15: Enable RLS on new tables
ALTER TABLE public.practice_session_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for practice_session_config
CREATE POLICY "Team members can view team config" ON public.practice_session_config
    FOR SELECT USING (
        team_id IS NULL OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (role IN ('admin', 'manager') OR team_id = practice_session_config.team_id)
        )
    );

CREATE POLICY "Admins can manage all configs" ON public.practice_session_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Step 16: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_holiday(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_practice_sessions(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_mark_absent_after_cutoff() TO authenticated;

-- Step 17: Generate practice sessions for today and next 7 days
SELECT public.generate_daily_practice_sessions(CURRENT_DATE + i) 
FROM generate_series(0, 7) i;

-- Step 18: Verification queries
-- Show the final state
SELECT 
    'Attendance records with session_id' as description,
    COUNT(*) as count
FROM public.attendances 
WHERE session_id IS NOT NULL

UNION ALL

SELECT 
    'Sessions created' as description,
    COUNT(*) as count
FROM public.sessions

UNION ALL

SELECT 
    'Practice session configs' as description,
    COUNT(*) as count
FROM public.practice_session_config

UNION ALL

SELECT 
    'Unique status values' as description,
    COUNT(DISTINCT status) as count
FROM public.attendances;

-- Show practice sessions created for today
SELECT 
    t.name as team_name,
    s.session_subtype,
    s.start_time,
    s.end_time,
    s.cutoff_time
FROM public.sessions s
JOIN public.teams t ON t.id = s.team_id
WHERE s.date = CURRENT_DATE 
AND s.session_type = 'practice'
ORDER BY t.name, s.start_time;

COMMENT ON FUNCTION public.generate_daily_practice_sessions(date) IS 
'Generates daily practice sessions (Morning, Evening, Night) for all active teams on the specified date. Respects team-specific timing configurations and holiday exclusions.';

COMMENT ON FUNCTION public.auto_mark_absent_after_cutoff() IS 
'Automatically marks players as absent for practice sessions where the cutoff time has passed and they have not marked attendance.';

COMMENT ON FUNCTION public.is_holiday(date, uuid) IS 
'Checks if a given date is a holiday for a specific team or globally. Supports both specific date holidays and recurring day-of-week holidays.';

-- Success message
SELECT '✅ Attendance database conflicts fixed successfully! 
- Standardized status values to lowercase
- Migrated to session-based attendance system  
- Created practice session configuration
- Added auto-generation functions for daily sessions
- Established proper unique constraints
- Generated sessions for next 7 days' as result;