-- Create attendance table
CREATE TABLE IF NOT EXISTS attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  session_time TEXT CHECK (session_time IN ('Morning', 'Evening', 'Night', 'Match')) NOT NULL,
  status TEXT CHECK (status IN ('Present', 'Absent', 'Auto (Match)')) NOT NULL,
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate attendance for same player, date, and session
  UNIQUE(player_id, date, session_time)
);

-- Enable RLS
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendances_player_date ON attendances(player_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_team_date ON attendances(team_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_session_date ON attendances(session_time, date);

-- RLS Policies for attendances table

-- Players can view their own attendance records
CREATE POLICY "Players can view own attendance" ON attendances
  FOR SELECT USING (
    auth.uid() = player_id
  );

-- Team members can view attendance for their team
CREATE POLICY "Team members can view team attendance" ON attendances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND team_id = attendances.team_id
      AND role IN ('coach', 'admin', 'manager', 'analyst')
    )
  );

-- Admins and managers can view all attendance
CREATE POLICY "Admins and managers can view all attendance" ON attendances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Players can insert their own attendance
CREATE POLICY "Players can mark own attendance" ON attendances
  FOR INSERT WITH CHECK (
    auth.uid() = player_id
    AND marked_by = auth.uid()
  );

-- Coaches can mark attendance for their team players
CREATE POLICY "Coaches can mark team attendance" ON attendances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users coach
      WHERE coach.id = auth.uid() 
      AND coach.role = 'coach'
      AND coach.team_id = attendances.team_id
    )
    AND EXISTS (
      SELECT 1 FROM users player
      WHERE player.id = attendances.player_id
      AND player.team_id = attendances.team_id
    )
  );

-- Admins and managers can mark attendance for any player
CREATE POLICY "Admins and managers can mark any attendance" ON attendances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Auto attendance insertion (for match performance entries)
CREATE POLICY "System can insert auto attendance" ON attendances
  FOR INSERT WITH CHECK (
    status = 'Auto (Match)'
    AND marked_by IS NULL
  );

-- Function to automatically create attendance when performance is recorded
CREATE OR REPLACE FUNCTION create_auto_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert attendance record for match if not already exists
  INSERT INTO attendances (player_id, team_id, date, session_time, status, marked_by)
  SELECT 
    NEW.player_id,
    NEW.team_id,
    CURRENT_DATE, -- Use current date for now, can be enhanced with slot date later
    'Match',
    'Auto (Match)',
    NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM attendances 
    WHERE player_id = NEW.player_id 
    AND date = CURRENT_DATE 
    AND session_time = 'Match'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create attendance on performance entry
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON performances;
CREATE TRIGGER auto_attendance_on_performance
  AFTER INSERT ON performances
  FOR EACH ROW
  EXECUTE FUNCTION create_auto_attendance();

-- Grant necessary permissions
GRANT SELECT, INSERT ON attendances TO authenticated;
GRANT USAGE ON SEQUENCE attendances_id_seq TO authenticated;