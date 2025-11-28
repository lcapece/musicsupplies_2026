-- Add functions to support user-based state visibility restrictions
-- This migration creates functions to get assigned states for users

-- Function to get assigned states for a specific user
CREATE OR REPLACE FUNCTION get_user_assigned_states(p_username TEXT)
RETURNS TABLE(
    state_abbr VARCHAR(2),
    state_name VARCHAR(100),
    country_code VARCHAR(2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return states assigned to the specific user
    RETURN QUERY
    SELECT 
        ps.state_abbr,
        ps.state_name,
        ps.country_code
    FROM prospectstates ps
    WHERE ps.salesman_assigned = p_username
    ORDER BY ps.country_code, ps.state_abbr;
END;
$$;

-- Function to check if a user has super admin privileges
CREATE OR REPLACE FUNCTION is_user_super_admin(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_security_level TEXT;
BEGIN
    -- Get the user's security level
    SELECT security_level
    INTO v_security_level
    FROM staff_management
    WHERE LOWER(username) = LOWER(p_username);
    
    -- Return true if user has super admin privileges
    RETURN (v_security_level = 'super_admin' OR v_security_level = 'superuser');
END;
$$;

-- Function to get all states (for super admins)
CREATE OR REPLACE FUNCTION get_all_states()
RETURNS TABLE(
    state_abbr VARCHAR(2),
    state_name VARCHAR(100),
    country_code VARCHAR(2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return all states for super admin users
    RETURN QUERY
    SELECT 
        ps.state_abbr,
        ps.state_name,
        ps.country_code
    FROM prospectstates ps
    ORDER BY ps.country_code, ps.state_abbr;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_assigned_states(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_assigned_states(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_all_states() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_states() TO anon;

-- Add some sample state assignments for testing
-- Assign Guy to NY and NJ as mentioned in the requirements
UPDATE prospectstates 
SET salesman_assigned = 'guy', last_change = NOW()
WHERE state_abbr IN ('NY', 'NJ');

-- Assign some other states to other salespeople for testing
UPDATE prospectstates 
SET salesman_assigned = 'anthony', last_change = NOW()
WHERE state_abbr IN ('CA', 'NV');

UPDATE prospectstates 
SET salesman_assigned = 'julissa', last_change = NOW()
WHERE state_abbr IN ('FL', 'GA');

UPDATE prospectstates 
SET salesman_assigned = 'joe', last_change = NOW()
WHERE state_abbr IN ('TX', 'OK');

UPDATE prospectstates 
SET salesman_assigned = 'melissa', last_change = NOW()
WHERE state_abbr IN ('IL', 'IN', 'WI');

-- Add comments
COMMENT ON FUNCTION get_user_assigned_states(TEXT) IS 'Returns states assigned to a specific salesperson';
COMMENT ON FUNCTION is_user_super_admin(TEXT) IS 'Checks if a user has super admin privileges for full state access';
COMMENT ON FUNCTION get_all_states() IS 'Returns all states for super admin users';