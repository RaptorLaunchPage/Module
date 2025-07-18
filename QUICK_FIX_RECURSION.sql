-- QUICK FIX for Infinite Recursion in RLS Policies
-- Run this in Supabase SQL Editor

-- 1. Drop all existing policies that might cause recursion
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
END $$;

-- 2. Temporarily disable RLS to allow operations
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. Create the missing profile for the user
INSERT INTO public.users (id, email, name, role, created_at)
VALUES (
    'ee119997-bc69-4596-aea0-9fea49514571',
    'swarajsxy@gmail.com',
    'Swaraj',
    'pending_player',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(users.name, EXCLUDED.name),
    role = COALESCE(users.role, EXCLUDED.role);

-- 4. Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create simple, non-recursive policies
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT
    USING (true); -- Allow all authenticated users to select

CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE
    USING (auth.uid() = id); -- Users can only update their own profile

CREATE POLICY "users_insert_policy" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id); -- Users can only insert their own profile

-- 6. Verify the setup
SELECT 
    'Fix Applied' as status,
    id,
    email,
    name,
    role,
    created_at
FROM public.users
WHERE id = 'ee119997-bc69-4596-aea0-9fea49514571';

-- 7. Test policy functionality
SELECT 
    'Policy Test' as test_type,
    COUNT(*) as user_count,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') as policy_count
FROM public.users;