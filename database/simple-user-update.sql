-- Simple User Update Function - Raw SQL Approach
-- This function bypasses any potential ON CONFLICT issues

CREATE OR REPLACE FUNCTION update_user_role_raw(
  p_user_id UUID,
  p_role TEXT,
  p_team_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_json JSON;
  updated_record RECORD;
BEGIN
  -- Simple direct update with minimal complexity
  EXECUTE format('
    UPDATE users 
    SET 
      role = %L,
      team_id = %L,
      updated_at = NOW()
    WHERE id = %L
  ', p_role, 
     CASE WHEN p_role IN (''admin'', ''manager'') THEN NULL ELSE p_team_id END,
     p_user_id);
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with ID % not found', p_user_id;
  END IF;
  
  -- Fetch the updated record
  EXECUTE format('
    SELECT 
      id, email, name, role, team_id, avatar_url, created_at, updated_at
    FROM users 
    WHERE id = %L
  ', p_user_id) INTO updated_record;
  
  -- Convert to JSON
  SELECT row_to_json(updated_record) INTO result_json;
  
  RETURN result_json;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_role_raw(UUID, TEXT, UUID) TO authenticated;

-- Test the function (uncomment to test)
-- SELECT update_user_role_raw('some-uuid'::uuid, 'admin', NULL);