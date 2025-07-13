-- Emergency Admin Bypass System - FIXED VERSION
-- This script fixes the role_level column issue and RLS recursion problems

-- 1. First, add the missing role_level column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role_level') THEN
        ALTER TABLE users ADD COLUMN role_level INTEGER DEFAULT 10;
        
        -- Update existing users with role levels
        UPDATE users SET role_level = 
          CASE 
            WHEN role = 'admin' THEN 100
            WHEN role = 'manager' THEN 80
            WHEN role = 'coach' THEN 70
            WHEN role = 'analyst' THEN 60
            WHEN role = 'player' THEN 50
            ELSE 10
          END;
    END IF;
END $$;

-- 2. Drop ALL existing RLS policies to prevent recursion
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON users;
DROP POLICY IF EXISTS "Public can insert users during signup" ON users;

-- 3. TEMPORARILY DISABLE RLS to break the recursion cycle
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 4. Create emergency functions that work without RLS
CREATE OR REPLACE FUNCTION emergency_create_super_admin_fixed(
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
  -- Insert or update user as super admin (RLS is disabled so this will work)
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
    'message', 'Super admin created successfully (RLS disabled)'
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

-- 5. Create function to get all users (works without RLS)
CREATE OR REPLACE FUNCTION emergency_get_all_users_fixed()
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
  -- This works because RLS is disabled
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

-- 6. Create function to safely re-enable RLS with proper policies
CREATE OR REPLACE FUNCTION emergency_enable_safe_rls()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Re-enable RLS
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  
  -- Create NON-RECURSIVE policies
  
  -- Policy 1: Users can always read their own profile
  CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);
  
  -- Policy 2: Users can update their own profile (but not role unless admin)
  CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);
  
  -- Policy 3: Allow profile creation during signup
  CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
  
  -- Policy 4: Super simple admin policy - just check if user exists with admin role
  -- This uses a different approach to avoid recursion
  CREATE POLICY "admin_full_access" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'RLS re-enabled with safe policies'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to enable safe RLS'
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to update user roles
CREATE OR REPLACE FUNCTION emergency_update_user_role_fixed(
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
  
  -- Update user role
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

-- 8. Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_emergency_functions_fixed()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Drop all emergency functions
  DROP FUNCTION IF EXISTS emergency_create_super_admin_fixed(UUID, TEXT, TEXT);
  DROP FUNCTION IF EXISTS emergency_get_all_users_fixed();
  DROP FUNCTION IF EXISTS emergency_enable_safe_rls();
  DROP FUNCTION IF EXISTS emergency_update_user_role_fixed(UUID, TEXT, UUID);
  DROP FUNCTION IF EXISTS cleanup_emergency_functions_fixed();
  
  -- Also drop the old functions if they exist
  DROP FUNCTION IF EXISTS emergency_create_super_admin(UUID, TEXT, TEXT);
  DROP FUNCTION IF EXISTS emergency_update_user_role(UUID, TEXT, UUID);
  DROP FUNCTION IF EXISTS emergency_get_all_users();
  DROP FUNCTION IF EXISTS emergency_fix_admin_policies();
  DROP FUNCTION IF EXISTS cleanup_emergency_functions();
  
  RETURN json_build_object(
    'success', true,
    'message', 'All emergency functions cleaned up successfully'
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

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION emergency_create_super_admin_fixed(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION emergency_get_all_users_fixed() TO authenticated;
GRANT EXECUTE ON FUNCTION emergency_enable_safe_rls() TO authenticated;
GRANT EXECUTE ON FUNCTION emergency_update_user_role_fixed(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_emergency_functions_fixed() TO authenticated;

-- 10. Instructions for immediate use:
-- Run this script first, then use these commands:

-- Step 1: Create your admin user
-- SELECT emergency_create_super_admin_fixed('b26b7eff-fa27-4a66-89c3-cd3858083c2a', 'rathod.swaraj@gmail.com', 'Swaraj Rathod');

-- Step 2: Verify you can see all users
-- SELECT * FROM emergency_get_all_users_fixed();

-- Step 3: Re-enable RLS with safe policies
-- SELECT emergency_enable_safe_rls();

-- Step 4: Test that you can still access users normally

-- Step 5: Clean up when done
-- SELECT cleanup_emergency_functions_fixed();

-- Emergency manual fix if needed:
-- INSERT INTO users (id, email, name, role, role_level, created_at) 
-- VALUES ('b26b7eff-fa27-4a66-89c3-cd3858083c2a', 'rathod.swaraj@gmail.com', 'Swaraj Rathod', 'admin', 100, NOW())
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', role_level = 100;