-- EMERGENCY LOGIN FIX - Complete RLS Reset
-- This will temporarily disable RLS to get login working, then add minimal policies

-- 1. Completely disable RLS temporarily to restore login
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON users';
    END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Add only the most basic policies needed for auth to work

-- Essential: Allow reading own profile (for dashboard loading)
CREATE POLICY "users_select_own" ON users 
FOR SELECT USING (auth.uid() = id);

-- Essential: Allow creating profile during signup
CREATE POLICY "users_insert_own" ON users 
FOR INSERT WITH CHECK (auth.uid() = id);

-- Essential: Allow updating own profile
CREATE POLICY "users_update_own" ON users 
FOR UPDATE USING (auth.uid() = id);

-- Admin access: Allow admins to see and edit all users
CREATE POLICY "admin_all_access" ON users 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- 5. Verify the minimal setup
SELECT 'Emergency login fix applied!' as status;
SELECT count(*) as policy_count FROM pg_policies WHERE tablename = 'users';

-- 6. Test if we can read auth info
SELECT 
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'User is authenticated: ' || auth.uid()::text
    ELSE 'No user session detected'
  END as auth_status;