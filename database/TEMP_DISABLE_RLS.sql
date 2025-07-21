-- Temporarily disable RLS to test if that's blocking user updates
-- RUN THIS ONLY FOR TESTING

-- Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- Disable RLS temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Test a simple update to see if it works without RLS
UPDATE public.users 
SET updated_at = NOW() 
WHERE id = 'b26b7eff-fa27-4a66-89c3-cd3858083c2a';

-- Check if the update worked
SELECT 
    id, 
    email, 
    name, 
    role, 
    updated_at 
FROM public.users 
WHERE id = 'b26b7eff-fa27-4a66-89c3-cd3858083c2a';

COMMIT;