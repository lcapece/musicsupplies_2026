-- Create the missing authenticate_staff_user RPC function that the frontend expects
-- This function is called by AuthContext.tsx line 517

CREATE OR REPLACE FUNCTION authenticate_staff_user(
    p_username TEXT,
    p_password TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    user_full_name TEXT,
    security_level TEXT,
    username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_computed_hash TEXT;
    v_user_record RECORD;
BEGIN
    -- Get the stored password hash and user details
    SELECT password_hash, user_full_name, security_level, username
    INTO v_user_record
    FROM staff_management 
    WHERE LOWER(staff_management.username) = LOWER(p_username);
    
    -- If user not found, return failure
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Get the stored hash
    v_stored_hash := v_user_record.password_hash;
    
    -- If no password hash stored, return failure
    IF v_stored_hash IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Compute the hash using the same algorithm as the frontend
    -- This matches ManagerPage.tsx hashPassword function: password + 'music_supplies_salt_2025' -> SHA-256 -> '$2a$12$' + first 53 chars
    v_computed_hash := '$2a$12$' || LEFT(encode(digest(p_password || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53);
    
    -- Compare hashes
    IF v_stored_hash = v_computed_hash THEN
        -- Authentication successful
        RETURN QUERY SELECT TRUE, v_user_record.user_full_name, v_user_record.security_level, v_user_record.username;
    ELSE
        -- Authentication failed
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    END IF;
    
    RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO anon;

-- Test the function by setting PETER's password and testing authentication
-- First, ensure PETER exists in staff_management
INSERT INTO staff_management (username, user_full_name, security_level, password_hash, settings)
VALUES ('peter', 'Peter Staff', 'user', NULL, '{}')
ON CONFLICT (username) DO NOTHING;

-- Set PETER's password using the exact same hashing algorithm
UPDATE staff_management 
SET password_hash = '$2a$12$' || LEFT(encode(digest('860777music_supplies_salt_2025', 'sha256'), 'hex'), 53)
WHERE LOWER(username) = 'peter';

-- Test the authentication function
SELECT 'Testing authentication for peter with password 860777:' as test_info;
SELECT * FROM authenticate_staff_user('peter', '860777');

-- Verify the password was set correctly
SELECT 'PETER user details:' as info;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Password Set' ELSE 'No Password' END as password_status,
       LEFT(password_hash, 20) || '...' as hash_preview
FROM staff_management 
WHERE LOWER(username) = 'peter';