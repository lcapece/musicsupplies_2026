-- COMPLETE STAFF AUTHENTICATION SYSTEM MIGRATION
-- This migration creates the complete staff authentication system

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
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;
    
    -- Get the stored hash
    v_stored_hash := v_user_record.password_hash;
    
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
    
    -- Compare hashes
    IF v_stored_hash = v_computed_hash THEN
        -- Authentication successful
        RAISE NOTICE 'Authentication successful for user: %', p_username;
        
        -- Check if password change is required (password is "password")
        IF p_password = 'password' THEN
            RETURN QUERY SELECT TRUE, v_user_record.user_full_name, v_user_record.security_level, v_user_record.username, TRUE;
        ELSE
            RETURN QUERY SELECT TRUE, v_user_record.user_full_name, v_user_record.security_level, v_user_record.username, FALSE;
        END IF;
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

-- Ensure PETER exists in staff_management table
INSERT INTO staff_management (username, user_full_name, security_level, password_hash, settings, created_at, updated_at)
VALUES (
    'peter', 
    'Peter Staff User', 
    'manager', 
    '$2a$12$' || LEFT(encode(digest('860777' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    '{}',
    NOW(),
    NOW()
)
ON CONFLICT (username) 
DO UPDATE SET 
    password_hash = '$2a$12$' || LEFT(encode(digest('860777' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    updated_at = NOW();

-- Update existing staff members who are known salespeople
UPDATE staff_management
SET is_salesperson = true
WHERE username IN ('guy', 'anthony', 'julissa', 'joe', 'melissa', 'louis');

-- Create a test staff user with default password "password" for testing
INSERT INTO staff_management (username, user_full_name, security_level, password_hash, settings, created_at, updated_at)
VALUES (
    'teststaff',
    'Test Staff User',
    'staff',
    '$2a$12$' || LEFT(encode(digest('password' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    '{}',
    NOW(),
    NOW()
)
ON CONFLICT (username)
DO UPDATE SET
    password_hash = '$2a$12$' || LEFT(encode(digest('password' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    updated_at = NOW();

-- Add comment to the function
COMMENT ON FUNCTION authenticate_staff_user(TEXT, TEXT) IS 'Authenticates staff users using username and password with proper hashing';

-- Add comment to the table
COMMENT ON TABLE staff_management IS 'Staff user management table with authentication support';
COMMENT ON COLUMN staff_management.is_salesperson IS 'Indicates if this staff member is a salesperson who can be assigned to territories';