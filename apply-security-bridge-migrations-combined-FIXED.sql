-- COMBINED SECURITY BRIDGE CODE MIGRATION (FIXED)
-- This migration adds bridge_code support to staff_management and creates the validation function

-- ========================================
-- PART 1: Add bridge_code column
-- ========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'staff_management'
                   AND column_name = 'bridge_code') THEN
        ALTER TABLE staff_management ADD COLUMN bridge_code VARCHAR(6);
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN staff_management.bridge_code IS 'Optional 6-digit security bridge code for enhanced authentication. Each superuser can have their own code.';

-- Set default bridge code for PETER (existing hardcoded value)
UPDATE staff_management
SET bridge_code = '860777'
WHERE LOWER(username) = 'peter';

-- ========================================
-- PART 2: Create validation function (FIXED - no ambiguous columns)
-- ========================================
CREATE OR REPLACE FUNCTION validate_security_bridge_code(
    p_username TEXT,
    p_bridge_code TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    user_full_name TEXT,
    security_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bridge_code VARCHAR(6);
    v_full_name TEXT;
    v_sec_level TEXT;
    v_username TEXT;
BEGIN
    RAISE NOTICE 'Security bridge validation attempt for username: %', p_username;

    -- Fetch user data using fully qualified column names
    SELECT
        staff_management.bridge_code,
        staff_management.user_full_name,
        staff_management.security_level,
        staff_management.username
    INTO
        v_bridge_code,
        v_full_name,
        v_sec_level,
        v_username
    FROM staff_management
    WHERE LOWER(staff_management.username) = LOWER(p_username);

    -- If user not found, return failure
    IF NOT FOUND THEN
        RAISE NOTICE 'User not found: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- If no bridge code stored, return failure
    IF v_bridge_code IS NULL OR v_bridge_code = '' THEN
        RAISE NOTICE 'No bridge code stored for user: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    RAISE NOTICE 'Stored bridge code: %', v_bridge_code;
    RAISE NOTICE 'Provided bridge code: %', p_bridge_code;

    -- Compare bridge codes (exact match)
    IF v_bridge_code = p_bridge_code THEN
        RAISE NOTICE 'Security bridge validation successful for user: %', p_username;
        RETURN QUERY SELECT TRUE, v_full_name, v_sec_level;
    ELSE
        RAISE NOTICE 'Bridge code mismatch for user: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
    END IF;

    RETURN;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION validate_security_bridge_code(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_security_bridge_code(TEXT, TEXT) TO anon;

-- Add comment to the function
COMMENT ON FUNCTION validate_security_bridge_code(TEXT, TEXT) IS 'Validates security bridge code for enhanced superuser authentication';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these to verify the migration worked:

-- Check if bridge_code column was added
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'staff_management' AND column_name = 'bridge_code';

-- Check Peter's bridge code
SELECT username, user_full_name, security_level, bridge_code
FROM staff_management
WHERE LOWER(username) = 'peter';

-- Test the validation function with correct code
SELECT * FROM validate_security_bridge_code('peter', '860777');

-- Test the validation function with wrong code
SELECT * FROM validate_security_bridge_code('peter', '000000');
