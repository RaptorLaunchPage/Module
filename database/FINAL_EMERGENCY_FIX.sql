-- FINAL EMERGENCY FIX FOR USER ROLE UPDATES
-- This script creates a bulletproof user update function that bypasses all ON CONFLICT issues

-- Drop any existing problematic functions
DROP FUNCTION IF EXISTS super_simple_user_update(uuid, text);
DROP FUNCTION IF EXISTS emergency_user_update(uuid, text, text);
DROP FUNCTION IF EXISTS simple_user_update(uuid, text, uuid);
DROP FUNCTION IF EXISTS update_user_role_raw(uuid, text, uuid);

-- Create a completely different approach using dynamic SQL
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
    v_sql text;
    v_team_clause text := '';
BEGIN
    -- Input validation
    IF p_user_id IS NULL OR p_role IS NULL THEN
        RETURN jsonb_build_object('error', 'User ID and role are required');
    END IF;

    -- Validate role
    IF p_role NOT IN ('admin', 'manager', 'coach', 'analyst', 'player', 'pending_player') THEN
        RETURN jsonb_build_object('error', 'Invalid role');
    END IF;

    -- Build team assignment logic
    IF p_role IN ('admin', 'manager') THEN
        v_team_clause := ', team_id = NULL';
    ELSIF p_team_id IS NOT NULL THEN
        v_team_clause := format(', team_id = %L', p_team_id);
    END IF;

    -- Build and execute dynamic SQL to avoid any constraint issues
    v_sql := format(
        'UPDATE users SET role = %L, updated_at = NOW()%s WHERE id = %L',
        p_role,
        v_team_clause,
        p_user_id
    );

    -- Execute the update
    EXECUTE v_sql;

    -- Check if update was successful
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;

    -- Return success with updated user data
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
            'error', 'Update failed: ' || SQLERRM,
            'detail', SQLSTATE
        );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION bulletproof_user_update(uuid, text, uuid) TO authenticated;

-- Test the function (should work without any conflicts)
DO $$
DECLARE
    test_result jsonb;
BEGIN
    -- Test with a non-existent user (should return error gracefully)
    SELECT bulletproof_user_update('00000000-0000-0000-0000-000000000000', 'admin') INTO test_result;
    RAISE NOTICE 'Test result: %', test_result;
END;
$$;

-- Create a simple backup function that just updates role (minimal approach)
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
    -- Simple update without any constraints or conflicts
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION minimal_user_update(uuid, text) TO authenticated;

COMMIT;