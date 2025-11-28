-- Fix the teststaff user to ensure password change modal works

-- First, check if teststaff exists
SELECT 'Current teststaff user:' as info;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as password_status,
       LEFT(password_hash, 20) || '...' as hash_preview
FROM staff_management 
WHERE LOWER(username) = 'teststaff';

-- Update or insert teststaff with the correct password hash for "password"
INSERT INTO staff_management (username, user_full_name, security_level, password_hash, settings, created_at, updated_at)
VALUES (
    'teststaff', 
    'Test Staff User', 
    'user', 
    '$2a$12$' || LEFT(encode(digest('password' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    '{}',
    NOW(),
    NOW()
)
ON CONFLICT (username) 
DO UPDATE SET 
    password_hash = '$2a$12$' || LEFT(encode(digest('password' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    updated_at = NOW();

-- Verify the teststaff user was created/updated correctly
SELECT 'Updated teststaff user:' as info;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as password_status,
       LEFT(password_hash, 20) || '...' as hash_preview
FROM staff_management 
WHERE LOWER(username) = 'teststaff';

-- Test the hash computation to make sure it matches
SELECT 'Expected hash for password "password":' as test;
SELECT '$2a$12$' || LEFT(encode(digest('password' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53) as expected_hash;