-- Emergency Admin Bypass System
-- This script creates a temporary super admin system that bypasses RLS policies
-- Use this to assign proper admin roles, then remove it once the system is working

-- 1. Create a service role function that bypasses RLS entirely
CREATE OR REPLACE FUNCTION emergency_create_super_admin(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT 'Super Admin'
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- This function runs with DEFINER rights, bypassing RLS
  -- Insert or update user as super admin
  INSERT INTO users (id, email, name, role, role_level, created_at)
  VALUES (user_id, user_email, user_name, 'admin', 100, NOW())
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    role_level = 100,
    name = COALESCE(EXCLUDED.name, users.name),
    email = COALESCE(EXCLUDED.email, users.email);
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'user_id', user_id,
    'email', user_email,
    'role', 'admin',
    'message', 'Super admin created successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create super admin'
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to force update any user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION emergency_update_user_role(
  target_user_id UUID,
  new_role TEXT,
  admin_user_id UUID DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  new_role_level INTEGER;
BEGIN
  -- Calculate role level
  new_role_level := CASE 
    WHEN new_role = 'admin' THEN 100
    WHEN new_role = 'manager' THEN 80
    WHEN new_role = 'coach' THEN 70
    WHEN new_role = 'analyst' THEN 60
    WHEN new_role = 'player' THEN 50
    WHEN new_role = 'pending' THEN 10
    ELSE 10
  END;
  
  -- Update user role (bypasses RLS)
  UPDATE users 
  SET role = new_role, role_level = new_role_level
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'user_id', target_user_id
    );
  END IF;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'user_id', target_user_id,
    'new_role', new_role,
    'new_role_level', new_role_level,
    'message', 'User role updated successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to update user role'
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to get all users (bypasses RLS completely)
CREATE OR REPLACE FUNCTION emergency_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  role_level INTEGER,
  team_id UUID,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function runs with DEFINER rights, completely bypassing RLS
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.role_level,
    u.team_id,
    u.avatar_url,
    u.created_at
  FROM users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to fix RLS policies for admin access
CREATE OR REPLACE FUNCTION emergency_fix_admin_policies()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Drop problematic policies
  DROP POLICY IF EXISTS "Admins can read all users" ON users;
  DROP POLICY IF EXISTS "Admins can update all users" ON users;
  DROP POLICY IF EXISTS "Admins can insert users" ON users;
  
  -- Create new policies that work better
  CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    (auth.uid() = id) OR  -- Users can read their own profile
    (
      auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
      )
    )
  );
  
  CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    (auth.uid() = id) OR  -- Users can update their own profile
    (
      auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
      )
    )
  );
  
  CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    (auth.uid() = id AND role = 'pending') OR  -- Self-registration
    (
      auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
      )
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Admin policies fixed successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to fix admin policies'
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Grant execute permissions (anyone can run these emergency functions)
GRANT EXECUTE ON FUNCTION emergency_create_super_admin(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION emergency_update_user_role(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION emergency_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION emergency_fix_admin_policies() TO authenticated;

-- 6. Create a cleanup function to remove these emergency functions later
CREATE OR REPLACE FUNCTION cleanup_emergency_functions()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Drop all emergency functions
  DROP FUNCTION IF EXISTS emergency_create_super_admin(UUID, TEXT, TEXT);
  DROP FUNCTION IF EXISTS emergency_update_user_role(UUID, TEXT, UUID);
  DROP FUNCTION IF EXISTS emergency_get_all_users();
  DROP FUNCTION IF EXISTS emergency_fix_admin_policies();
  DROP FUNCTION IF EXISTS cleanup_emergency_functions();
  
  RETURN json_build_object(
    'success', true,
    'message', 'Emergency functions cleaned up successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to cleanup emergency functions'
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_emergency_functions() TO authenticated;

-- Usage Instructions:
-- 1. Run this script in your Supabase SQL editor
-- 2. Use the emergency functions to create proper admin users
-- 3. Test that normal admin functions work
-- 4. Run cleanup_emergency_functions() to remove these bypass functions

-- Example usage:
-- SELECT emergency_create_super_admin('b26b7eff-fa27-4a66-89c3-cd3858083c2a', 'rathod.swaraj@gmail.com', 'Swaraj Rathod');
-- SELECT emergency_get_all_users();
-- SELECT emergency_fix_admin_policies();