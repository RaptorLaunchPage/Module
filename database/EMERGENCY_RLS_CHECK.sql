-- Emergency RLS check and fix
-- This script checks RLS policies that might be blocking user updates

-- 1. Check current RLS policies on users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 3. Temporarily disable RLS for testing (EMERGENCY ONLY)
-- UNCOMMENT THESE LINES IF YOU WANT TO TEST WITHOUT RLS:
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- COMMIT;

-- 4. Check what user the API is running as during updates
-- This will help us understand permission issues
DO $$
BEGIN
    RAISE NOTICE 'Current user context:';
    RAISE NOTICE 'current_user: %', current_user;
    RAISE NOTICE 'session_user: %', session_user;
    RAISE NOTICE 'current_setting(role): %', current_setting('role');
END;
$$;