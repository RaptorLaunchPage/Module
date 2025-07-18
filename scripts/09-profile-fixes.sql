-- Profile fixes script
-- This script ensures all profile-related fields exist and are properly configured

-- 1. Ensure all profile fields exist in users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_model TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ram TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fps TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS gyroscope_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS in_game_role TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_info TEXT;

-- 2. Update status constraint to include all valid statuses
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check 
CHECK (status IN ('Active', 'Benched', 'On Leave', 'Discontinued'));

-- 3. Create or update profile update function
CREATE OR REPLACE FUNCTION update_user_profile_complete(
  user_id UUID,
  user_name TEXT DEFAULT NULL,
  device_model TEXT DEFAULT NULL,
  ram TEXT DEFAULT NULL,
  fps TEXT DEFAULT NULL,
  storage TEXT DEFAULT NULL,
  status TEXT DEFAULT NULL,
  gyroscope_enabled BOOLEAN DEFAULT NULL,
  instagram_handle TEXT DEFAULT NULL,
  discord_id TEXT DEFAULT NULL,
  profile_picture TEXT DEFAULT NULL,
  avatar_url TEXT DEFAULT NULL,
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
  updated_user RECORD;
BEGIN
  -- Update user profile with provided fields
  UPDATE users 
  SET 
    name = COALESCE(update_user_profile_complete.user_name, users.name),
    device_model = COALESCE(update_user_profile_complete.device_model, users.device_model),
    ram = COALESCE(update_user_profile_complete.ram, users.ram),
    fps = COALESCE(update_user_profile_complete.fps, users.fps),
    storage = COALESCE(update_user_profile_complete.storage, users.storage),
    status = COALESCE(update_user_profile_complete.status, users.status),
    gyroscope_enabled = COALESCE(update_user_profile_complete.gyroscope_enabled, users.gyroscope_enabled),
    instagram_handle = COALESCE(update_user_profile_complete.instagram_handle, users.instagram_handle),
    discord_id = COALESCE(update_user_profile_complete.discord_id, users.discord_id),
    profile_picture = COALESCE(update_user_profile_complete.profile_picture, users.profile_picture),
    avatar_url = COALESCE(update_user_profile_complete.avatar_url, users.avatar_url),
    contact_number = COALESCE(update_user_profile_complete.contact_number, users.contact_number),
    in_game_role = COALESCE(update_user_profile_complete.in_game_role, users.in_game_role),
    device_info = COALESCE(update_user_profile_complete.device_info, users.device_info)
  WHERE users.id = update_user_profile_complete.user_id
  RETURNING * INTO updated_user;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'user_id', user_id
    );
  END IF;
  
  -- Return success result with updated user data
  result := json_build_object(
    'success', true,
    'user_id', user_id,
    'updated_user', row_to_json(updated_user),
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

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_profile_complete TO authenticated;