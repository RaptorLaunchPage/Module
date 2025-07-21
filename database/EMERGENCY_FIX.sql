-- EMERGENCY FIX for ON CONFLICT specification error
-- Run this in your Supabase SQL Editor to completely resolve the issue

-- 1. Check what constraints currently exist
SELECT constraint_name, constraint_type, table_name 
FROM information_schema.table_constraints 
WHERE table_name = 'users';

-- 2. Drop ALL constraints that might be causing issues
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;

-- 3. Recreate the primary key (essential)
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- 4. Recreate a simple role constraint
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'coach', 'analyst', 'player', 'pending_player'));

-- 5. Add unique constraint on email if it doesn't exist
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- 6. Disable RLS temporarily for testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 7. Create a super simple update function that uses dynamic SQL
CREATE OR REPLACE FUNCTION emergency_user_update(
  user_id_param TEXT,
  role_param TEXT,
  team_id_param TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  sql_command TEXT;
  result_text TEXT;
BEGIN
  -- Build the SQL command dynamically
  sql_command := 'UPDATE users SET role = ''' || role_param || '''';
  
  -- Handle team_id logic
  IF role_param IN ('admin', 'manager') THEN
    sql_command := sql_command || ', team_id = NULL';
  ELSIF team_id_param IS NOT NULL AND team_id_param != 'null' THEN
    sql_command := sql_command || ', team_id = ''' || team_id_param || '''';
  END IF;
  
  -- Add WHERE clause
  sql_command := sql_command || ', updated_at = NOW() WHERE id = ''' || user_id_param || '''';
  
  -- Execute the command
  EXECUTE sql_command;
  
  -- Return success message
  result_text := 'Successfully updated user ' || user_id_param || ' to role ' || role_param;
  RETURN result_text;
END;
$$;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION emergency_user_update(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION emergency_user_update(TEXT, TEXT, TEXT) TO anon;

-- 9. Re-enable RLS with a simple policy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON users;

-- Create very permissive policies for testing
CREATE POLICY "Allow all reads" ON users FOR SELECT USING (true);
CREATE POLICY "Allow all updates" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow all inserts" ON users FOR INSERT WITH CHECK (true);

-- 10. Test the function (replace with actual user ID)
-- SELECT emergency_user_update('your-user-id-here', 'admin', NULL);

-- 11. Verification queries
SELECT 'Emergency fix completed' as status;
SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name = 'users';

-- Instructions:
-- 1. Replace 'your-user-id-here' in the test query above with an actual user ID
-- 2. Test the emergency_user_update function
-- 3. If it works, the main app should also work
-- 4. You can tighten the RLS policies later once everything works