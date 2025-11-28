-- EMERGENCY FIX: Get PETER logged in NOW
-- Run this EXACT query in Supabase SQL editor:

UPDATE staff_management 
SET password_hash = '$2a$12$a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
WHERE username = 'peter' OR username = 'PETER' OR username = 'Peter';

-- Verify it worked:
SELECT username, 'Password Updated' as status FROM staff_management WHERE username ILIKE '%peter%';