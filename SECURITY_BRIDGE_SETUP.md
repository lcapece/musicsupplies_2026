# Security Bridge System - Setup Guide

## Overview
The Security Bridge system provides enhanced authentication for superusers by requiring a 6-digit security code after successful password authentication.

## Database Setup

### 1. Apply the Migration
Run the combined SQL file in Supabase SQL Editor:
```sql
-- Location: apply-security-bridge-migrations-combined.sql
```

This will:
- Add a `bridge_code` column to the `staff_management` table
- Create the `validate_security_bridge_code()` function
- Set Peter's default bridge code to '860777'

### 2. Verify Installation
```sql
-- Check if column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'staff_management' AND column_name = 'bridge_code';

-- Check if function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'validate_security_bridge_code';
```

## Adding Bridge Codes for Other Superusers

### Example: Add bridge code for a user named "guy"
```sql
UPDATE staff_management
SET bridge_code = '123456'
WHERE LOWER(username) = 'guy';
```

### Example: Add bridge code for "anthony"
```sql
UPDATE staff_management
SET bridge_code = '789012'
WHERE LOWER(username) = 'anthony';
```

### Bulk Update Multiple Users
```sql
UPDATE staff_management
SET bridge_code = CASE
    WHEN LOWER(username) = 'guy' THEN '123456'
    WHEN LOWER(username) = 'anthony' THEN '789012'
    WHEN LOWER(username) = 'julissa' THEN '345678'
    WHEN LOWER(username) = 'joe' THEN '567890'
    ELSE bridge_code
END
WHERE LOWER(username) IN ('guy', 'anthony', 'julissa', 'joe');
```

## How It Works

### Frontend (SecurityBridgeModal.tsx)
1. Modal displays with 6 password-masked input boxes
2. User enters their unique 6-digit code
3. Code is validated against database via `validate_security_bridge_code()` function
4. Success: User completes login
5. Failure: User gets 3 attempts before being logged out

### Backend (Supabase Function)
```sql
validate_security_bridge_code(
    p_username TEXT,    -- Staff username (case insensitive)
    p_bridge_code TEXT  -- 6-digit code to validate
)
```

Returns:
- `success`: TRUE if code matches, FALSE otherwise
- `user_full_name`: Staff member's full name
- `security_level`: Their security level (e.g., 'super_admin')

## Testing

### Test the function manually:
```sql
-- Test with correct code (should return success = true)
SELECT * FROM validate_security_bridge_code('peter', '860777');

-- Test with wrong code (should return success = false)
SELECT * FROM validate_security_bridge_code('peter', '999999');

-- Test with non-existent user (should return success = false)
SELECT * FROM validate_security_bridge_code('nonexistent', '123456');
```

### Test in the UI:
1. Log in as a staff user with `security_level = 'super_admin'`
2. Security Bridge modal should appear
3. Enter the correct 6-digit code
4. Should successfully complete login

## Security Features
- Codes are stored in plain text (6-digit codes are low entropy)
- Each superuser can have their own unique code
- Modal masks digits as password dots
- Maximum 3 attempts before logout
- Failed attempts are logged to `login_activity_log`
- Successful authentication logs include "SECURITY BRIDGE" notation

## Removing/Disabling Bridge Code
To disable the security bridge for a user, set their code to NULL:
```sql
UPDATE staff_management
SET bridge_code = NULL
WHERE LOWER(username) = 'username_here';
```

## Current Users with Bridge Codes
- **peter**: 860777 (default)
- Add more users as needed...

## Modal Display
The modal shows:
- Title: "Security Bridge"
- Subtitle: "Enhanced authentication for SUPERUSERS"
- 6 password-masked input boxes
- Clear and Verify buttons
- Error messages with remaining attempts
- Professional dark gradient design
