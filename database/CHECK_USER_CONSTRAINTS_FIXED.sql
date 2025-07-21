-- CHECK USER TABLE CONSTRAINTS AND INDEXES (FIXED)
-- Let's see what's actually configured in the database

-- 1. Check all constraints on users table (fixed ambiguous column reference)
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    ccu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'users' AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 2. Check all indexes on users table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY indexname;

-- 3. Check the actual table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Simple constraint check
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass;

-- 5. Check if auth.users exists and its structure
SELECT 'Checking auth.users table...' as check_step;
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. See if there's any relationship between auth.users and public.users
SELECT 'Checking user counts...' as check_step;
SELECT COUNT(*) as auth_users_count FROM auth.users;
SELECT COUNT(*) as public_users_count FROM public.users;

-- 7. Check if the IDs match between tables (simplified)
SELECT 'ID relationship check...' as check_step;
SELECT 
  au.id as auth_id,
  pu.id as public_id,
  au.email as auth_email,
  pu.email as public_email,
  pu.role as public_role
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
LIMIT 5;

-- 8. Check what our current user looks like in both tables
SELECT 'Current user check...' as check_step;
SELECT 'Auth user:' as source, id, email FROM auth.users WHERE id = auth.uid()
UNION ALL
SELECT 'Public user:' as source, id, email FROM public.users WHERE id = auth.uid();