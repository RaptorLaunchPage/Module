-- Simple function test without JSON parsing issues
-- Run this in Supabase SQL Editor

-- 1. Check if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('bulletproof_user_update', 'minimal_user_update')
ORDER BY routine_name;

-- 2. Test functions exist by calling them (will show if they exist)
DO $$
BEGIN
    -- Just check if functions can be called (don't store results)
    PERFORM bulletproof_user_update('00000000-0000-0000-0000-000000000000', 'admin', NULL);
    RAISE NOTICE 'bulletproof_user_update function EXISTS';
EXCEPTION
    WHEN undefined_function THEN
        RAISE NOTICE 'bulletproof_user_update function MISSING';
    WHEN OTHERS THEN
        RAISE NOTICE 'bulletproof_user_update function EXISTS but returned error: %', SQLERRM;
END;
$$;

DO $$
BEGIN
    -- Just check if functions can be called (don't store results)  
    PERFORM minimal_user_update('00000000-0000-0000-0000-000000000000', 'admin');
    RAISE NOTICE 'minimal_user_update function EXISTS';
EXCEPTION
    WHEN undefined_function THEN
        RAISE NOTICE 'minimal_user_update function MISSING';
    WHEN OTHERS THEN
        RAISE NOTICE 'minimal_user_update function EXISTS but returned error: %', SQLERRM;
END;
$$;

-- 3. Check current user and permissions
SELECT current_user, current_setting('role'), session_user;