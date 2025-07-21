-- Test if our bulletproof functions exist and work
-- Run this in Supabase SQL Editor to diagnose the issue

-- Check if functions exist
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('bulletproof_user_update', 'minimal_user_update')
ORDER BY routine_name;

-- Test bulletproof function with a real user
DO $$
DECLARE
    test_user_id uuid;
    test_result jsonb;
BEGIN
    -- Get the first user from the users table
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user ID: %', test_user_id;
        
        -- Test the bulletproof function (same role, safe test)
        SELECT bulletproof_user_update(test_user_id, 'admin', NULL) INTO test_result;
        RAISE NOTICE 'Bulletproof function result: %', test_result;
        
        -- Test the minimal function
        SELECT minimal_user_update(test_user_id, 'admin') INTO test_result;
        RAISE NOTICE 'Minimal function result: %', test_result;
    ELSE
        RAISE NOTICE 'No users found in table for testing';
    END IF;
END;
$$;