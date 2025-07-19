-- IMMEDIATE FIX for RLS recursion blocking profile access
-- This should resolve the authentication hanging issue

-- Step 1: Temporarily disable RLS to stop the infinite recursion
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that might be causing recursion
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SIMPLE, non-recursive policies
-- These only use auth.uid() - no table lookups that cause recursion

-- Users can view their own profile
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile  
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Service role can do everything (for admin functions)
CREATE POLICY "service_role_all_access" ON public.users
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- Step 5: Verify the fix
SELECT 
    'RLS POLICIES FIXED' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';

-- Step 6: Test a simple query to ensure no recursion
SELECT 
    'TESTING PROFILE ACCESS' as test,
    COUNT(*) as user_count
FROM public.users 
WHERE id = auth.uid()
LIMIT 1;