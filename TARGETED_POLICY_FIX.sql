-- TARGETED POLICY FIX - Remove Only Recursive Policies
-- Based on the actual schema provided

-- Step 1: First, let's see what we're working with
SELECT 
    'BEFORE CLEANUP - Current Policies' as status,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- Step 2: Remove common recursive policy patterns
-- These are the typical patterns that cause infinite recursion:

-- Pattern 1: Admin policies that check users table for role
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Pattern 2: Role-based policies that query users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Pattern 3: Manager/Coach policies that check users table
DROP POLICY IF EXISTS "Managers can view all users" ON public.users;
DROP POLICY IF EXISTS "Managers can update users" ON public.users;
DROP POLICY IF EXISTS "Coaches can view team users" ON public.users;

-- Pattern 4: Any policy with EXISTS clause referencing users
DROP POLICY IF EXISTS "admin_users_all_select" ON public.users;
DROP POLICY IF EXISTS "admin_users_all_update" ON public.users;
DROP POLICY IF EXISTS "admin_users_all_insert" ON public.users;
DROP POLICY IF EXISTS "admin_users_all_delete" ON public.users;

-- Pattern 5: Team staff policies that might reference users
DROP POLICY IF EXISTS "Team staff can view team performances" ON public.users;
DROP POLICY IF EXISTS "Staff can view team users" ON public.users;

-- Step 3: Create SAFE, non-recursive policies
-- These policies use only auth.uid() and auth.role() - no table references

-- Safe policy: Users can view their own profile
CREATE POLICY "safe_users_select_own" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Safe policy: Users can update their own profile
CREATE POLICY "safe_users_update_own" ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Safe policy: Users can insert their own profile (for registration)
CREATE POLICY "safe_users_insert_own" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Safe policy: Allow authenticated users to view basic user info
-- This is needed for team operations, user lists, etc.
CREATE POLICY "safe_authenticated_users_select" ON public.users
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Step 4: Verify the fix
SELECT 
    'AFTER CLEANUP - Remaining Policies' as status,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- Step 5: Test that queries work without recursion
SELECT 
    'TEST QUERY - Should work without recursion' as status,
    COUNT(*) as user_count
FROM public.users;

-- Step 6: Check if the problematic user can now be accessed
SELECT 
    'SPECIFIC USER TEST' as status,
    id,
    email,
    name,
    role,
    created_at
FROM public.users
WHERE email = 'swarajsxy@gmail.com'
LIMIT 1;

-- Step 7: If user doesn't exist, create them (this should now work)
INSERT INTO public.users (id, email, name, role, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
    'pending_player' as role,
    au.created_at
FROM auth.users au
WHERE au.email = 'swarajsxy@gmail.com'
AND NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Step 8: Final verification
SELECT 
    'FINAL VERIFICATION' as status,
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') as policy_count,
    (SELECT COUNT(*) FROM public.users WHERE email = 'swarajsxy@gmail.com') as target_user_exists;