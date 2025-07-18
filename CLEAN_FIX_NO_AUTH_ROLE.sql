-- CLEAN FIX - No auth.role() dependency
-- Uses only your custom role system from public.users table

-- Step 1: Temporarily disable RLS to fix the issue
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Create missing profiles for all auth users
INSERT INTO public.users (id, email, name, role, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
    'pending_player' as role,
    au.created_at
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify all profiles are created
SELECT 
    'PROFILES CREATED' as status,
    (SELECT COUNT(*) FROM auth.users) as auth_users_count,
    (SELECT COUNT(*) FROM public.users) as public_users_count,
    (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM public.users) as remaining_missing;

-- Step 4: Drop ALL existing policies (they're causing recursion)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
END $$;

-- Step 5: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 6: Create SIMPLE policies that don't cause recursion
-- These policies ONLY use auth.uid() - no table references, no auth.role()

-- Users can view their own profile
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own profile (for registration)
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Step 7: Test the fix
SELECT 
    'FIX VERIFICATION' as status,
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') as policy_count,
    'All users should now be able to log in' as message;

-- Step 8: Check specific user
SELECT 
    'SPECIFIC USER CHECK' as status,
    id,
    email,
    name,
    role,
    created_at
FROM public.users
WHERE email = 'swarajsxy@gmail.com';

-- Step 9: Show final policies (should be very simple)
SELECT 
    'FINAL POLICIES' as status,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- Step 10: Test that basic queries work
SELECT 
    'BASIC QUERY TEST' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN role = 'player' THEN 1 END) as player_count,
    COUNT(CASE WHEN role = 'pending_player' THEN 1 END) as pending_count
FROM public.users;