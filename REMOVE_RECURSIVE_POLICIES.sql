-- REMOVE RECURSIVE POLICIES - SELECTIVE APPROACH
-- This script removes only the policies that cause recursion

-- Common recursive policy patterns that need to be removed:

-- 1. Drop policies that check users table for admin role (these cause recursion)
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- 2. Drop policies that use EXISTS with users table (recursive)
DROP POLICY IF EXISTS "admin_users_all_select" ON public.users;
DROP POLICY IF EXISTS "admin_users_all_update" ON public.users;
DROP POLICY IF EXISTS "admin_users_all_insert" ON public.users;
DROP POLICY IF EXISTS "admin_users_all_delete" ON public.users;

-- 3. Drop any policy that references the users table in its condition
-- (We'll identify these from the diagnostic script above)

-- 4. Keep only simple, non-recursive policies
-- These are safe policies that don't cause recursion:

-- Policy for users to view their own profile (SAFE - no recursion)
CREATE POLICY IF NOT EXISTS "users_view_own_profile" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy for users to update their own profile (SAFE - no recursion)  
CREATE POLICY IF NOT EXISTS "users_update_own_profile" ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Policy for users to insert their own profile (SAFE - no recursion)
CREATE POLICY IF NOT EXISTS "users_insert_own_profile" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Temporary policy for authenticated users to view basic user info (SAFE - no table reference)
-- This allows the app to function while we fix admin access
CREATE POLICY IF NOT EXISTS "authenticated_users_view_users" ON public.users
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 5. Verify what policies remain
SELECT 
    'REMAINING POLICIES AFTER CLEANUP' as section,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- 6. Test if we can now query users table without recursion
SELECT 
    'TEST QUERY' as section,
    COUNT(*) as user_count,
    'Query successful - no recursion' as status
FROM public.users;