-- Fix auto-attendance trigger to prevent null date constraint violations
-- This addresses the error: null value in column "date" of relation "attendances" violates not-null constraint

-- Drop existing trigger to prevent conflicts
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;

-- Drop existing function
DROP FUNCTION IF EXISTS public.create_auto_attendance();
DROP FUNCTION IF EXISTS public.create_auto_attendance_v2();

-- Create new fixed function
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
    
    -- Use slot information if both date and team_id are available
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
  
  -- Insert attendance record with proper error handling
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
    'present',  -- Use valid status value
    'auto',     -- Track that this was auto-generated
    NULL,       -- No specific user marked this
    NEW.slot
  )
  ON CONFLICT (player_id, date, session_time) DO NOTHING; -- Prevent duplicate entries
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create attendance on performance entry
CREATE TRIGGER auto_attendance_on_performance
  AFTER INSERT ON public.performances
  FOR EACH ROW
  EXECUTE FUNCTION public.create_auto_attendance_fixed();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_auto_attendance_fixed() TO authenticated;