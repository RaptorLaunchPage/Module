-- Emergency Profile Update Function
-- This function allows users to update their profile even with RLS restrictions

CREATE OR REPLACE FUNCTION emergency_update_user_profile(
  user_id UUID,
  user_name TEXT DEFAULT NULL,
  contact_number TEXT DEFAULT NULL,
  in_game_role TEXT DEFAULT NULL,
  device_info TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Update user profile with provided fields
  UPDATE users 
  SET 
    name = COALESCE(user_name, users.name),
    contact_number = COALESCE(contact_number, users.contact_number),
    in_game_role = COALESCE(in_game_role, users.in_game_role),
    device_info = COALESCE(device_info, users.device_info)
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'user_id', user_id
    );
  END IF;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'user_id', user_id,
    'message', 'Profile updated successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to update profile'
    );
END;
$$ LANGUAGE plpgsql;