-- Find PETER's current password hash and update it to 860777
-- The user said login was working with the browser-saved password, so we need to see what's currently stored

-- First, let's see what's currently in the database for PETER
SELECT 'Current PETER record:' as info;
SELECT username, user_full_name, security_level, password_hash
FROM staff_management 
WHERE LOWER(username) = 'peter';

-- Let's also check all variations of peter/PETER
SELECT 'All peter variations:' as info;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as status
FROM staff_management 
WHERE LOWER(username) LIKE '%peter%';

-- Now let's test what hash the authenticate_staff_user function expects for password '860777'
-- This will show us the exact hash that should be stored
SELECT 'Hash that should be stored for password 860777:' as info;
SELECT '$2a$12$' || LEFT(encode(digest('860777music_supplies_salt_2025', 'sha256'), 'hex'), 53) as expected_hash_for_860777;

-- Update PETER's password to 860777 using the correct hash
UPDATE staff_management 
SET password_hash = '$2a$12$' || LEFT(encode(digest('860777music_supplies_salt_2025', 'sha256'), 'hex'), 53)
WHERE LOWER(username) = 'peter';

-- Verify the update
SELECT 'After update:' as info;
SELECT username, user_full_name, security_level, password_hash
FROM staff_management 
WHERE LOWER(username) = 'peter';

-- Test the authentication function if it exists
DO $$
BEGIN
    -- Check if the function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'authenticate_staff_user') THEN
        RAISE NOTICE 'Testing authentication function...';
        -- We can't directly SELECT from a function in a DO block, so we'll just notify
        RAISE NOTICE 'Function exists - test it manually: SELECT * FROM authenticate_staff_user(''peter'', ''860777'');';
    ELSE
        RAISE NOTICE 'authenticate_staff_user function does not exist - this might be the problem!';
    END IF;
END $$;

-- Manual test query (run this separately if the function exists)
-- SELECT 'Authentication test:' as test;
-- SELECT * FROM authenticate_staff_user('peter', '860777');