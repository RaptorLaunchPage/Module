-- Fix the missing unique constraint on profiles.user_id
-- This is causing the ON CONFLICT specification error

-- 1. Check if profiles table exists and its structure
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 2. Check current constraints on profiles table
SELECT 
    constraint_name,
    constraint_type,
    column_name
FROM information_schema.constraint_column_usage 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY constraint_name;

-- 3. Check if user_id column exists in profiles
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Add the missing unique constraint on user_id
-- This will fix the ON CONFLICT specification error
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- 5. Check the trigger that's causing the issue
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'public';

COMMIT;