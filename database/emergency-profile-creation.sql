-- Emergency Profile Creation Function
-- This function creates user profiles even with RLS restrictions

CREATE OR REPLACE FUNCTION emergency_create_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT 'User'
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  new_profile RECORD;
BEGIN
  -- Check if user already exists
  SELECT * INTO new_profile FROM users WHERE id = user_id;
  
  IF FOUND THEN
    -- User exists, return existing profile
    RETURN json_build_object(
      'success', true,
      'profile', row_to_json(new_profile),
      'message', 'Profile already exists'
    );
  END IF;
  
  -- Create new profile
  INSERT INTO users (id, email, name, role, role_level, created_at)
  VALUES (user_id, user_email, user_name, 'pending_player', 10, NOW())
  RETURNING * INTO new_profile;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'profile', row_to_json(new_profile),
    'message', 'Profile created successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create profile'
    );
END;
$$ LANGUAGE plpgsql;