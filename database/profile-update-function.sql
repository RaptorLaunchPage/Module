-- Profile Update Function
-- This function allows users to update their profile fields safely

CREATE OR REPLACE FUNCTION update_user_profile(
  user_id UUID,
  user_name TEXT DEFAULT NULL,
  contact_number TEXT DEFAULT NULL,
  in_game_role TEXT DEFAULT NULL,
  device_info TEXT DEFAULT NULL,
  device_model TEXT DEFAULT NULL,
  ram TEXT DEFAULT NULL,
  fps TEXT DEFAULT NULL,
  storage TEXT DEFAULT NULL,
  status TEXT DEFAULT NULL,
  gyroscope_enabled BOOLEAN DEFAULT NULL,
  instagram_handle TEXT DEFAULT NULL,
  discord_id TEXT DEFAULT NULL,
  profile_picture TEXT DEFAULT NULL
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
    public.users.device_info = COALESCE(update_user_profile.device_info, public.users.device_info),
    public.users.device_model = COALESCE(update_user_profile.device_model, public.users.device_model),
    public.users.ram = COALESCE(update_user_profile.ram, public.users.ram),
    public.users.fps = COALESCE(update_user_profile.fps, public.users.fps),
    public.users.storage = COALESCE(update_user_profile.storage, public.users.storage),
    public.users.status = COALESCE(update_user_profile.status, public.users.status),
    public.users.gyroscope_enabled = COALESCE(update_user_profile.gyroscope_enabled, public.users.gyroscope_enabled),
    public.users.instagram_handle = COALESCE(update_user_profile.instagram_handle, public.users.instagram_handle),
    public.users.discord_id = COALESCE(update_user_profile.discord_id, public.users.discord_id),
    public.users.profile_picture = COALESCE(update_user_profile.profile_picture, public.users.profile_picture)
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