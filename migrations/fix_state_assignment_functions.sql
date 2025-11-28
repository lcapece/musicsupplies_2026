-- Fix state assignment functions to use correct table and case-insensitive matching
-- The previous migration referenced 'prospectstates' table which doesn't exist
-- The correct table is 'state_xref'

-- Function to get assigned states for a specific user (FIXED VERSION)
CREATE OR REPLACE FUNCTION get_user_assigned_states(p_username TEXT)
RETURNS TABLE(
    state_abbr VARCHAR(10),
    state_name VARCHAR(100),
    country_code VARCHAR(10)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return states assigned to the specific user
    -- CRITICAL: Use CASE-INSENSITIVE matching because username might be "GUY" but database has "Guy"
    RETURN QUERY
    SELECT
        sx.state_code::VARCHAR(10) as state_abbr,
        sx.state_name::VARCHAR(100),
        'US'::VARCHAR(10) as country_code  -- state_xref doesn't have country_code, default to US
    FROM state_xref sx
    WHERE LOWER(sx.assigned_staff) = LOWER(p_username)
    ORDER BY sx.state_code;
END;
$$;

-- Function to get all states (for super admins) - FIXED VERSION
CREATE OR REPLACE FUNCTION get_all_states()
RETURNS TABLE(
    state_abbr VARCHAR(10),
    state_name VARCHAR(100),
    country_code VARCHAR(10)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return all states for super admin users
    RETURN QUERY
    SELECT
        sx.state_code::VARCHAR(10) as state_abbr,
        sx.state_name::VARCHAR(100),
        'US'::VARCHAR(10) as country_code  -- state_xref doesn't have country_code, default to US
    FROM state_xref sx
    ORDER BY sx.state_code;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_assigned_states(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_assigned_states(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_all_states() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_states() TO anon;

-- Add comments
COMMENT ON FUNCTION get_user_assigned_states(TEXT) IS 'Returns states assigned to a specific salesperson (case-insensitive)';
COMMENT ON FUNCTION get_all_states() IS 'Returns all states for super admin users';
