-- Fixed RLS check for all PostgreSQL versions
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

-- 2. Check if RLS is enabled (fixed for older PostgreSQL versions)
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 3. Check table owner and permissions
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'public';

-- 4. Show current database user context
SELECT 
    current_user as current_user,
    session_user as session_user,
    current_database() as current_database;

-- 5. Test a simple select to see if we have basic read access
DO $$
DECLARE
    user_count integer;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    RAISE NOTICE 'Can read users table. Count: %', user_count;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'ERROR: Insufficient privilege to read users table';
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR reading users table: %', SQLERRM;
END;
$$;

-- 6. Emergency RLS disable (UNCOMMENT IF NEEDED)
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- COMMIT;