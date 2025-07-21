-- CHECK USER TABLE CONSTRAINTS AND INDEXES
-- Let's see what's actually configured in the database

-- 1. Check all constraints on users table
SELECT 
    constraint_name,
    constraint_type,
    column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'users'
ORDER BY constraint_type, constraint_name;

-- 2. Check all indexes on users table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'users'
ORDER BY indexname;

-- 3. Check the actual table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 4. Check if there are any foreign key relationships
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'users';

-- 5. Check if auth.users exists and its structure
SELECT 'Checking auth.users table...' as check_step;
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. See if there's any relationship between auth.users and public.users
SELECT 'Checking for auth.users relationship...' as check_step;
SELECT COUNT(*) as auth_users_count FROM auth.users;
SELECT COUNT(*) as public_users_count FROM public.users;