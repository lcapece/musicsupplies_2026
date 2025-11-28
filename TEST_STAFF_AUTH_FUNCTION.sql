-- Test the authenticate_staff_user function
-- Run this in Supabase SQL Editor to verify the function works

-- First, check if the function exists
SELECT 
    proname as function_name,
    pronargs as num_args,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'authenticate_staff_user';

-- Test the function with peter/860777 (should work)
SELECT 'Testing peter/860777:' as test;
SELECT * FROM authenticate_staff_user('peter', '860777');

-- Test the function with teststaff/password (should require password change)
SELECT 'Testing teststaff/password:' as test;
SELECT * FROM authenticate_staff_user('teststaff', 'password');

-- Test with invalid credentials
SELECT 'Testing invalid credentials:' as test;
SELECT * FROM authenticate_staff_user('invalid', 'invalid');

-- Check staff_management table contents
SELECT 'Staff management table contents:' as info;
SELECT username, user_full_name, security_level, 
       CASE WHEN password_hash IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as password_status
FROM staff_management;