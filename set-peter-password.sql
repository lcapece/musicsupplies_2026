-- Set password for staff user PETER to 860777
-- This script updates the password in the staff_management table using the EXACT same hashing method as the application

-- CRITICAL: This must match the hashPassword function in ManagerPage.tsx lines 517-526
-- The application uses: password + 'music_supplies_salt_2025' -> SHA-256 -> '$2a$12$' + first 53 chars

-- First, check if PETER exists in staff_management
SELECT 'Checking if PETER exists...' as status;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as current_status
FROM staff_management 
WHERE UPPER(username) = 'PETER';

-- Update PETER's password using the EXACT same algorithm as the frontend
-- This matches the hashPassword function in ManagerPage.tsx
UPDATE staff_management 
SET password_hash = '$2a$12$' || LEFT(encode(digest('860777music_supplies_salt_2025', 'sha256'), 'hex'), 53)
WHERE UPPER(username) = 'PETER';

-- Verify the update was successful
SELECT 'Password update completed!' as status;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Password Set Successfully' ELSE 'ERROR: No Password' END as password_status,
       LEFT(password_hash, 20) || '...' as password_hash_preview
FROM staff_management 
WHERE UPPER(username) = 'PETER';

-- Show the exact hash that was generated for verification
SELECT 'Generated hash for verification:' as info;
SELECT '$2a$12$' || LEFT(encode(digest('860777music_supplies_salt_2025', 'sha256'), 'hex'), 53) as generated_hash;

-- Final verification: Check if any staff user named PETER exists (case insensitive)
SELECT 'Final check - all PETER variations:' as info;
SELECT username, user_full_name, 
       CASE WHEN password_hash IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as status
FROM staff_management 
WHERE LOWER(username) LIKE '%peter%';