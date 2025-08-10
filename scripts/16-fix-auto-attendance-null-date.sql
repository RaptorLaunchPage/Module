-- Fix auto-attendance trigger to prevent null date constraint violations
-- This addresses the error: null value in column "date" of relation "attendances" violates not-null constraint
-- Updated to use session-based attendance model

-- Drop existing trigger to prevent conflicts
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;
DROP TRIGGER IF EXISTS auto_match_attendance_on_performance ON public.performances;

-- Drop existing function
DROP FUNCTION IF EXISTS public.create_auto_attendance();
DROP FUNCTION IF EXISTS public.create_auto_attendance_v2();
DROP FUNCTION IF EXISTS public.create_auto_attendance_fixed();
DROP FUNCTION IF EXISTS public.create_match_attendance_from_performance();

-- Create new session-based function that handles null dates properly
CREATE OR REPLACE FUNCTION public.create_match_attendance_from_performance()
RETURNS TRIGGER AS $$
DECLARE
    match_session_id uuid;
    performance_date date;
BEGIN
    -- Determine the date for the performance - always ensure non-null
    performance_date := CURRENT_DATE;
    IF NEW.slot IS NOT NULL THEN
        SELECT date INTO performance_date FROM public.slots WHERE id = NEW.slot;
        -- If slot date is null, keep CURRENT_DATE as fallback
        IF performance_date IS NULL THEN
            performance_date := CURRENT_DATE;
        END IF;
    END IF;

    -- Create or get match session for this team and date
    INSERT INTO public.sessions (
        team_id, 
        session_type, 
        session_subtype, 
        date, 
        title,
        is_mandatory,
        created_by
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
    );

    -- Get the session ID
    SELECT id INTO match_session_id 
    FROM public.sessions 
    WHERE team_id = NEW.team_id 
    AND date = performance_date 
    AND session_type = 'tournament'
    AND session_subtype = 'Scrims'
    LIMIT 1;

    -- Create attendance record
    INSERT INTO public.attendances (
        player_id, 
        team_id, 
        session_id, 
        status, 
        source,
        slot_id
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

-- Create trigger to auto-create attendance on performance entry
CREATE TRIGGER auto_match_attendance_on_performance
  AFTER INSERT ON public.performances
  FOR EACH ROW
  EXECUTE FUNCTION public.create_match_attendance_from_performance();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_match_attendance_from_performance() TO authenticated;