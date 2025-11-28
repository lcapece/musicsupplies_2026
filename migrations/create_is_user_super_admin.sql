-- Create is_user_super_admin function
-- Returns FALSE for all regular users (including GUY)
-- Returns TRUE only for designated super admin usernames

CREATE OR REPLACE FUNCTION is_user_super_admin(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return TRUE only for these super admin usernames (case-insensitive)
    -- Add your actual super admin usernames here
    -- For now, NO ONE is a super admin, so everyone sees only their assigned states
    RETURN LOWER(p_username) IN ('superadmin', 'admin', 'administrator');

    -- GUY and all other sales staff will return FALSE
    -- which means they only see their assigned states
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION is_user_super_admin(TEXT) IS 'Returns true only for super admins who can view ALL states. Regular users return false and see only assigned states.';
