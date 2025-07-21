-- SIMPLE DIAGNOSTIC - Run these queries one by one

-- Step 1: Check what constraints exist on public.users
SELECT 'Step 1: Constraints on public.users' as info;
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass;

-- Step 2: Check if users table has a primary key
SELECT 'Step 2: Primary key check' as info;
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' AND schemaname = 'public' AND indexname LIKE '%pkey%';

-- Step 3: Check table structure
SELECT 'Step 3: Table structure' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 4: Check user counts
SELECT 'Step 4: User counts' as info;
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count;

-- Step 5: Check current user in public.users
SELECT 'Step 5: Current user in public.users' as info;
SELECT id, email, role FROM public.users WHERE id = auth.uid();

-- Step 6: Check current user in auth.users  
SELECT 'Step 6: Current user in auth.users' as info;
SELECT id, email FROM auth.users WHERE id = auth.uid();