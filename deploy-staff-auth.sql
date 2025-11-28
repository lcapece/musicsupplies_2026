-- DEPLOY STAFF AUTHENTICATION SYSTEM
-- This script creates the complete staff authentication system

-- First, ensure the staff_management table exists with all required columns
CREATE TABLE IF NOT EXISTS staff_management (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    user_full_name VARCHAR(100) NOT NULL,
    security_level VARCHAR(20) NOT NULL DEFAULT 'staff',
    password_hash TEXT,
    settings JSONB DEFAULT '{}',
    is_salesperson BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_salesperson column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_management' 
                   AND column_name = 'is_salesperson') THEN
        ALTER TABLE staff_management ADD COLUMN is_salesperson BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create the authenticate_staff_user function
CREATE OR REPLACE FUNCTION authenticate_staff_user(
    p_username TEXT,
    p_password TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    user_full_name TEXT,
    security_level TEXT,
    username TEXT,
    has_bridge_code BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_computed_hash TEXT;
    v_user_record RECORD;
    v_has_bridge_code BOOLEAN;
BEGIN
    -- Log the authentication attempt
    RAISE NOTICE 'Staff auth attempt for username: %', p_username;

    -- Get the stored password hash and user details (case insensitive)
    SELECT password_hash, staff_management.user_full_name, staff_management.security_level, staff_management.username,
           (bridge_code IS NOT NULL AND bridge_code != '') as bridge_code_exists
    INTO v_user_record
    FROM staff_management
    WHERE LOWER(staff_management.username) = LOWER(p_username);

    -- If user not found, return failure
    IF NOT FOUND THEN
        RAISE NOTICE 'User not found: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;

    -- Get the stored hash and bridge code status
    v_stored_hash := v_user_record.password_hash;
    v_has_bridge_code := COALESCE(v_user_record.bridge_code_exists, FALSE);

    -- If no password hash stored, return failure
    IF v_stored_hash IS NULL OR v_stored_hash = '' THEN
        RAISE NOTICE 'No password hash stored for user: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;

    -- Compute the hash using the same algorithm as the frontend
    -- This matches ManagerPage.tsx hashPassword function: password + 'music_supplies_salt_2025' -> SHA-256 -> '$2a$12$' + first 53 chars
    v_computed_hash := '$2a$12$' || LEFT(encode(digest(p_password || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53);

    RAISE NOTICE 'Stored hash: %', LEFT(v_stored_hash, 20) || '...';
    RAISE NOTICE 'Computed hash: %', LEFT(v_computed_hash, 20) || '...';
    RAISE NOTICE 'Has bridge code: %', v_has_bridge_code;

    -- Compare hashes
    IF v_stored_hash = v_computed_hash THEN
        -- Authentication successful
        RAISE NOTICE 'Authentication successful for user: %', p_username;
        RETURN QUERY SELECT TRUE, v_user_record.user_full_name, v_user_record.security_level, v_user_record.username, v_has_bridge_code;
    ELSE
        -- Authentication failed
        RAISE NOTICE 'Password mismatch for user: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    END IF;

    RETURN;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO anon;

-- Ensure PETER exists in staff_management table (password should be set through the admin interface)
INSERT INTO staff_management (username, user_full_name, security_level, settings, created_at, updated_at)
VALUES (
    'peter',
    'Peter Staff User',
    'manager',
    '{}',
    NOW(),
    NOW()
)
ON CONFLICT (username)
DO NOTHING;

-- Update existing staff members who are known salespeople
UPDATE staff_management 
SET is_salesperson = true 
WHERE username IN ('guy', 'anthony', 'julissa', 'joe', 'melissa', 'louis');

-- Test the authentication function (use the actual password set for the user)
-- SELECT * FROM authenticate_staff_user('peter', '<password>');

-- Show PETER's record
SELECT 'PETER staff record:' as info;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Password Set' ELSE 'No Password' END as password_status,
       is_salesperson,
       created_at, updated_at
FROM staff_management 
WHERE LOWER(username) = 'peter';

-- Show all staff records
SELECT 'All staff records:' as info;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Password Set' ELSE 'No Password' END as password_status,
       is_salesperson
FROM staff_management 
ORDER BY username;