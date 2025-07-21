-- RESTORE SECURE RLS - Step by step without breaking login
-- Now that login works with RLS disabled, let's carefully restore security

-- 1. First, verify we can see current user info before enabling RLS
SELECT 'Current setup verification:' as step;
SELECT id, email, role FROM users WHERE id = auth.uid();

-- 2. Enable RLS back
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Add policies one by one, testing each step

-- Policy 1: Essential - Users can read their own profile
CREATE POLICY "users_read_own" ON users 
FOR SELECT USING (auth.uid() = id);

-- Policy 2: Essential - Allow profile creation during signup
CREATE POLICY "users_create_profile" ON users 
FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 3: Essential - Users can update their own basic info
CREATE POLICY "users_update_own" ON users 
FOR UPDATE USING (auth.uid() = id);

-- Policy 4: Admin can read all users (for user management)
CREATE POLICY "admin_read_all" ON users 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- Policy 5: Admin can update all users (for role changes)
CREATE POLICY "admin_update_all" ON users 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- 4. Test that we can still access our profile
SELECT 'RLS re-enabled with secure policies' as status;
SELECT 'Testing profile access...' as test;

-- Try to read current user profile
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) 
    THEN 'SUCCESS: Can read own profile'
    ELSE 'ERROR: Cannot read own profile'
  END as profile_test;

-- 5. Show final policy summary
SELECT 'Active policies:' as summary;
SELECT policyname, cmd as operation 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;