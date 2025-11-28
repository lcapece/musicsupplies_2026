-- EMERGENCY FIX: Set all staff users (except peter) to have password "password"
-- This will trigger the password change modal as expected

-- First, let's see what staff users currently exist
SELECT 'Current staff users:' as info;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as password_status
FROM staff_management
ORDER BY username;

-- Update all staff users (except peter) to have password "password"
-- This uses the exact same hashing algorithm as the frontend
UPDATE staff_management
SET password_hash = '$2a$12$' || LEFT(encode(digest('password' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    updated_at = NOW()
WHERE username != 'peter';

-- Verify the update
SELECT 'After update - all staff users should now have password "password":' as info;
SELECT username, user_full_name, security_level,
       LEFT(password_hash, 20) || '...' as password_hash_preview
FROM staff_management
ORDER BY username;

-- Test hash for "password" (should match what we just set)
SELECT 'Expected hash for password "password":' as info,
       '$2a$12$' || LEFT(encode(digest('password' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53) as expected_hash;