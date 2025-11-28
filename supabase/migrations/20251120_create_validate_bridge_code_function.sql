-- Create function to validate security bridge code for a given staff user
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
    -- Log the validation attempt
    RAISE NOTICE 'Security bridge validation attempt for username: %', p_username;

    -- Get the stored bridge code and user details (case insensitive)
    -- Using fully qualified column names to avoid ambiguity
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
        -- Validation successful
        RAISE NOTICE 'Security bridge validation successful for user: %', p_username;
        RETURN QUERY SELECT TRUE, v_full_name, v_sec_level;
    ELSE
        -- Validation failed
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
