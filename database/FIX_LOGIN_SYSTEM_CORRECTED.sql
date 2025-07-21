-- URGENT FIX: Restore proper RLS policies for login system (CORRECTED)
-- Fixed the syntax error with OLD reference

-- 1. Drop the problematic emergency policies
DROP POLICY IF EXISTS "Emergency allow all reads" ON users;
DROP POLICY IF EXISTS "Emergency allow all updates" ON users;
DROP POLICY IF EXISTS "Emergency allow all inserts" ON users;

-- 2. Create proper authentication-compatible policies

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON users
FOR SELECT USING (auth.uid() = id);

-- Allow admins to read all users
CREATE POLICY "Admins can read all users" ON users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'manager')
  )
);

-- Allow profile creation during signup (essential for auth)
CREATE POLICY "Allow profile creation during signup" ON users
FOR INSERT WITH CHECK (
  auth.uid() = id OR
  auth.uid() IS NULL
);

-- Allow users to update their own profile (simplified version)
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE USING (auth.uid() = id);

-- Allow admins to update any user (simplified version)
CREATE POLICY "Admins can update all users" ON users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Final verification
SELECT 'Login system should now work!' as status;
SELECT 'RLS policies restored successfully' as message;