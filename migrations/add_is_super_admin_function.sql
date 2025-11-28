-- Create is_user_super_admin function
-- This function checks if a user is a super admin
-- Super admins can see ALL states, regular users only see assigned states

CREATE OR REPLACE FUNCTION is_user_super_admin(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user exists in staff table with super_admin = true
    -- Adjust this query based on your actual staff/users table structure

    -- OPTION 1: If you have a staff table with super_admin column
    -- RETURN (SELECT super_admin FROM staff WHERE LOWER(username) = LOWER(p_username) LIMIT 1);

    -- OPTION 2: If you have a specific list of super admin usernames
    -- Hardcode your super admin usernames here:
    RETURN LOWER(p_username) IN ('admin', 'administrator', 'superadmin');

    -- OPTION 3: Check against a staff_roles table
    -- RETURN EXISTS (
    --     SELECT 1 FROM staff_roles
    --     WHERE LOWER(username) = LOWER(p_username)
    --     AND role = 'super_admin'
    -- );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION is_user_super_admin(TEXT) IS 'Returns true if user is a super admin who can view all states';
