-- EMERGENCY DEBUG: Check what staff users actually exist and their password hashes
SELECT 'ALL STAFF USERS IN DATABASE:' as debug_info;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'HAS PASSWORD' ELSE 'NO PASSWORD' END as password_status,
       LEFT(password_hash, 30) || '...' as hash_preview
FROM staff_management
ORDER BY username;

-- Check if guy exists specifically
SELECT 'CHECKING USER: guy' as debug_info;
SELECT username, user_full_name, security_level, password_hash
FROM staff_management 
WHERE LOWER(username) = 'guy';

-- Check if linda exists specifically  
SELECT 'CHECKING USER: linda' as debug_info;
SELECT username, user_full_name, security_level, password_hash
FROM staff_management 
WHERE LOWER(username) = 'linda';

-- Test the exact hash that should be generated for "password"
SELECT 'EXPECTED HASH FOR PASSWORD "password":' as debug_info;
SELECT '$2a$12$' || LEFT(encode(digest('password' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53) as expected_hash;

-- Test authentication function directly
SELECT 'TESTING AUTHENTICATION FUNCTION FOR guy:' as debug_info;
SELECT * FROM authenticate_staff_user('guy', 'password');

SELECT 'TESTING AUTHENTICATION FUNCTION FOR linda:' as debug_info;
SELECT * FROM authenticate_staff_user('linda', 'password');