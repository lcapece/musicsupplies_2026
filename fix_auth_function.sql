-- EMERGENCY FIX: Recreate authenticate_staff_user function to fix SQL ambiguity

-- Drop and recreate the function to ensure it's properly created
DROP FUNCTION IF EXISTS authenticate_staff_user(TEXT, TEXT);

-- Create the function with explicit table aliases to avoid ambiguity
CREATE OR REPLACE FUNCTION authenticate_staff_user(
    p_username TEXT,
    p_password TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    user_full_name TEXT,
    security_level TEXT,
    username TEXT,
    requires_password_change BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_computed_hash TEXT;
    v_user_record RECORD;
BEGIN
    RAISE NOTICE 'Staff auth attempt for username: %', p_username;
    
    SELECT sm.password_hash, sm.user_full_name, sm.security_level, sm.username
    INTO v_user_record
    FROM staff_management sm
    WHERE LOWER(sm.username) = LOWER(p_username);
    
    IF NOT FOUND THEN
        RAISE NOTICE 'User not found: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;
    
    v_stored_hash := v_user_record.password_hash;
    
    IF v_stored_hash IS NULL OR v_stored_hash = '' THEN
        RAISE NOTICE 'No password hash stored for user: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;
    
    v_computed_hash := '$2a$12$' || LEFT(encode(digest(p_password || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53);
    
    RAISE NOTICE 'Stored hash: %', LEFT(v_stored_hash, 20) || '...';
    RAISE NOTICE 'Computed hash: %', LEFT(v_computed_hash, 20) || '...';
    
    IF v_stored_hash = v_computed_hash THEN
        RAISE NOTICE 'Authentication successful for user: %', p_username;
        
        IF p_password = 'password' THEN
            RETURN QUERY SELECT TRUE, v_user_record.user_full_name, v_user_record.security_level, v_user_record.username, TRUE;
        ELSE
            RETURN QUERY SELECT TRUE, v_user_record.user_full_name, v_user_record.security_level, v_user_record.username, FALSE;
        END IF;
    ELSE
        RAISE NOTICE 'Password mismatch for user: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    END IF;
    
    RETURN;
END;
$$;

-- Grant explicit permissions to all roles
GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO public;

-- Test the function
SELECT 'Testing guy/password:' as test;
SELECT * FROM authenticate_staff_user('guy', 'password');

SELECT 'Testing linda/password:' as test;
SELECT * FROM authenticate_staff_user('linda', 'password');
