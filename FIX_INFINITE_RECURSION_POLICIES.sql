-- Fix Infinite Recursion in RLS Policies
-- This script fixes the circular dependency issue in users table policies

-- 1. First, drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Drop any other existing policies that might cause conflicts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
END $$;

-- 2. Disable RLS temporarily to avoid issues
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Create simple, non-recursive policies

-- Allow users to view their own profile (using direct auth.uid() comparison)
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to update their own profile (using direct auth.uid() comparison)
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Allow users to insert their own profile (for profile creation)
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow authenticated users to view basic user info (needed for team operations)
-- This is a simplified policy that doesn't cause recursion
CREATE POLICY "authenticated_users_basic_select" ON public.users
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 5. Create a separate admin table for admin operations (recommended approach)
-- This avoids the recursion issue entirely
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert known admin users (replace with actual admin user IDs)
-- You'll need to get the actual admin user IDs from your auth.users table
INSERT INTO public.admin_users (user_id) VALUES 
    -- Add your admin user IDs here
    -- ('admin-user-id-1'),
    -- ('admin-user-id-2')
ON CONFLICT (user_id) DO NOTHING;

-- Admin policies using the separate admin table (no recursion)
CREATE POLICY "admin_users_all_select" ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "admin_users_all_update" ON public.users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "admin_users_all_insert" ON public.users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- 6. Enable RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin table
CREATE POLICY "admin_users_select" ON public.admin_users
    FOR SELECT
    USING (user_id = auth.uid());

-- 7. Create a function to safely check if user is admin (alternative approach)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE admin_users.user_id = $1
    );
$$;

-- 8. Grant necessary permissions
GRANT SELECT ON public.admin_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- 9. Test the setup
SELECT 
    'Policy Fix Complete' as status,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') as user_policies_count,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as rls_enabled,
    auth.uid() as current_user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- 10. Show current policies for verification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;