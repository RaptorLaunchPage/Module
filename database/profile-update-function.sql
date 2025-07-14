-- Profile Update Function
-- This function allows users to update their profile fields safely

CREATE OR REPLACE FUNCTION update_user_profile(
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
  UPDATE public.users 
  SET 
    public.users.name = COALESCE(update_user_profile.user_name, public.users.name),
    public.users.contact_number = COALESCE(update_user_profile.contact_number, public.users.contact_number),
    public.users.in_game_role = COALESCE(update_user_profile.in_game_role, public.users.in_game_role),
    public.users.device_info = COALESCE(update_user_profile.device_info, public.users.device_info)
  WHERE public.users.id = update_user_profile.user_id;
  
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