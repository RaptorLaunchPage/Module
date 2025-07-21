-- Recreate functions with simplified approach
-- Run this as postgres superuser

-- Drop any existing functions first
DROP FUNCTION IF EXISTS bulletproof_user_update(uuid, text, uuid);
DROP FUNCTION IF EXISTS minimal_user_update(uuid, text);

-- Create the simplest possible user update function
CREATE OR REPLACE FUNCTION minimal_user_update(
    p_user_id uuid,
    p_role text
)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Simple update
    UPDATE users 
    SET role = p_role, updated_at = NOW()
    WHERE id = p_user_id;

    IF FOUND THEN
        RETURN 'SUCCESS';
    ELSE
        RETURN 'USER_NOT_FOUND';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Create bulletproof function that returns jsonb
CREATE OR REPLACE FUNCTION bulletproof_user_update(
    p_user_id uuid,
    p_role text,
    p_team_id uuid DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Update the user
    UPDATE users 
    SET 
        role = p_role,
        team_id = CASE 
            WHEN p_role IN ('admin', 'manager') THEN NULL
            ELSE COALESCE(p_team_id, team_id)
        END,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Check if update worked
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;

    -- Return success with user data
    SELECT jsonb_build_object(
        'success', true,
        'id', id,
        'role', role,
        'team_id', team_id,
        'updated_at', updated_at
    )
    INTO v_result
    FROM users
    WHERE id = p_user_id;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION minimal_user_update(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION bulletproof_user_update(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION minimal_user_update(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION bulletproof_user_update(uuid, text, uuid) TO anon;

-- Test the functions
DO $$
DECLARE
    test_result text;
    test_json jsonb;
BEGIN
    -- Test minimal function
    SELECT minimal_user_update('00000000-0000-0000-0000-000000000000', 'admin') INTO test_result;
    RAISE NOTICE 'Minimal function test result: %', test_result;
    
    -- Test bulletproof function  
    SELECT bulletproof_user_update('00000000-0000-0000-0000-000000000000', 'admin', NULL) INTO test_json;
    RAISE NOTICE 'Bulletproof function test result: %', test_json;
    
    RAISE NOTICE 'Both functions created successfully!';
END;
$$;