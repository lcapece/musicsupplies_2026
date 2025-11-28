-- COMPLETE STAFF AUTHENTICATION SYSTEM
-- This creates the missing authenticate_staff_user function that AuthContext.tsx expects

-- First, create the authenticate_staff_user function that the frontend calls
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
    -- Log the authentication attempt
    RAISE NOTICE 'Staff auth attempt for username: %', p_username;
    
    -- Get the stored password hash and user details (case insensitive)
    SELECT password_hash, user_full_name, security_level, username
    INTO v_user_record
    FROM staff_management 
    WHERE LOWER(staff_management.username) = LOWER(p_username);
    
    -- If user not found, return failure
    IF NOT FOUND THEN
        RAISE NOTICE 'User not found: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Get the stored hash
    v_stored_hash := v_user_record.password_hash;
    
    -- If no password hash stored, return failure
    IF v_stored_hash IS NULL OR v_stored_hash = '' THEN
        RAISE NOTICE 'No password hash stored for user: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Compute the hash using the same algorithm as the frontend
    -- This matches ManagerPage.tsx hashPassword function: password + 'music_supplies_salt_2025' -> SHA-256 -> '$2a$12$' + first 53 chars
    v_computed_hash := '$2a$12$' || LEFT(encode(digest(p_password || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53);
    
    RAISE NOTICE 'Stored hash: %', LEFT(v_stored_hash, 20) || '...';
    RAISE NOTICE 'Computed hash: %', LEFT(v_computed_hash, 20) || '...';
    
    -- Compare hashes
    IF v_stored_hash = v_computed_hash THEN
        -- Authentication successful
        RAISE NOTICE 'Authentication successful for user: %', p_username;
        RETURN QUERY SELECT TRUE, v_user_record.user_full_name, v_user_record.security_level, v_user_record.username;
    ELSE
        -- Authentication failed
        RAISE NOTICE 'Password mismatch for user: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    END IF;
    
    RETURN;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO anon;

-- Ensure PETER exists in staff_management table
INSERT INTO staff_management (username, user_full_name, security_level, password_hash, settings, created_at, updated_at)
VALUES (
    'peter', 
    'Peter Staff User', 
    'manager', 
    '$2a$12$' || LEFT(encode(digest('860777music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    '{}',
    NOW(),
    NOW()
)
ON CONFLICT (username) 
DO UPDATE SET 
    password_hash = '$2a$12$' || LEFT(encode(digest('860777music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    updated_at = NOW();

-- Test the authentication function
SELECT 'Testing staff authentication for peter with password 860777:' as test_info;
SELECT * FROM authenticate_staff_user('peter', '860777');

-- Show PETER's record
SELECT 'PETER staff record:' as info;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Password Set' ELSE 'No Password' END as password_status,
       created_at, updated_at
FROM staff_management 
WHERE LOWER(username) = 'peter';

-- Show the exact hash for verification
SELECT 'Expected hash for password 860777:' as info;
SELECT '$2a$12$' || LEFT(encode(digest('860777music_supplies_salt_2025', 'sha256'), 'hex'), 53) as expected_hash;