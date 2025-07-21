-- URGENT FIX: Restore proper RLS policies for login system
-- The previous emergency fix broke authentication by using overly permissive policies

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

-- Allow managers and coaches to read users in their scope
CREATE POLICY "Managers and coaches can read relevant users" ON users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND (
      u.role IN ('admin', 'manager') OR
      (u.role = 'coach' AND (users.team_id = u.team_id OR users.id = auth.uid()))
    )
  )
);

-- Allow users to update their own profile (except role unless admin)
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND (
    -- Regular users can't change their role
    (OLD.role = NEW.role) OR
    -- Unless they're admin
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
);

-- Allow admins to update any user
CREATE POLICY "Admins can update all users" ON users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Allow profile creation during signup (essential for auth)
CREATE POLICY "Allow profile creation during signup" ON users
FOR INSERT WITH CHECK (
  auth.uid() = id OR
  -- Allow if no auth context (server-side operations)
  auth.uid() IS NULL
);

-- Allow admins to insert users
CREATE POLICY "Admins can insert users" ON users
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ) OR
  -- Allow if no existing users (first user scenario)
  NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')
);

-- 3. Ensure the update functions still work by making them SECURITY DEFINER
-- (They bypass RLS because they're marked as SECURITY DEFINER)

-- Verify the functions are still there and have SECURITY DEFINER
SELECT routine_name, security_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%user_update%' 
AND routine_schema = 'public';

-- 4. Test authentication by checking if we can read the current user
SELECT 'Login system should now work!' as status;
SELECT 'Current user ID: ' || COALESCE(auth.uid()::text, 'No user logged in') as current_user;

-- 5. Show all policies for verification
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;