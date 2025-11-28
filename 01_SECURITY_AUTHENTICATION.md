# Security & Authentication System

## Overview
The Music Supplies application uses a dual-layer authentication system with strict security controls to prevent unauthorized access.

## Authentication Flow

### User Authentication Process
1. **Password Record Check**: System first checks if user has a password record in `user_passwords` table
2. **Authentication Method Selection**:
   - **IF password record EXISTS**: User MUST authenticate with password only
   - **IF password record DOES NOT exist**: User can authenticate with ZIP code for initial setup

### Critical Security Rule
> **FUNDAMENTAL SECURITY PRINCIPLE**: If a user has ANY record in the `user_passwords` table, ZIP code authentication is PERMANENTLY DISABLED for that account.

## Database Functions

### authenticate_account(account_number, password_input)
**Current Implementation** (Fixed as of 2025-08-11):
```sql
CREATE OR REPLACE FUNCTION public.authenticate_account(p_account_number integer, p_password text)
 RETURNS TABLE(account_number integer, acct_name text, address text, city text, state text, zip text, email_address text, phone text, mobile_phone text, authenticated boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- CRITICAL SECURITY CHECK: If password record exists, ONLY allow password authentication
  IF EXISTS (SELECT 1 FROM user_passwords WHERE user_passwords.account_number = p_account_number) THEN
    -- Password record exists - ONLY allow password verification, ZIP code authentication is DISABLED
    IF EXISTS (
      SELECT 1 FROM user_passwords 
      WHERE user_passwords.account_number = p_account_number 
      AND password_hash = crypt(p_password, password_hash)
    ) THEN
      -- Password verified successfully
      RETURN QUERY SELECT a.account_number, a.acct_name, a.address, a.city, a.state, a.zip, a.email_address, a.phone, a.mobile_phone, TRUE as authenticated
      FROM accounts_lcmd a WHERE a.account_number = p_account_number;
      RETURN;
    ELSE
      -- Password verification failed - NO ZIP CODE FALLBACK ALLOWED
      RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE as authenticated;
      RETURN;
    END IF;
  END IF;

  -- No password record exists - allow ZIP code authentication for first-time setup
  IF EXISTS (SELECT 1 FROM accounts_lcmd WHERE accounts_lcmd.account_number = p_account_number AND accounts_lcmd.zip = p_password) THEN
    RETURN QUERY SELECT a.account_number, a.acct_name, a.address, a.city, a.state, a.zip, a.email_address, a.phone, a.mobile_phone, TRUE as authenticated
    FROM accounts_lcmd a WHERE a.account_number = p_account_number;
    RETURN;
  END IF;

  -- All authentication methods failed
  RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE as authenticated;
END;
$function$
```

### Master Password System
- **Master Password**: "MusicSupplies2024!" (Admin override capability)
- **Function**: `authenticate_with_master_password(account_number, master_password)`
- **Purpose**: Administrative access for account management

## Password Security

### Password Hashing
- **Method**: bcrypt with salt (crypt function)
- **Storage**: `user_passwords` table with `password_hash` column
- **Verification**: Uses `crypt(input_password, stored_hash)` comparison

### Password Requirements
- Minimum 8 characters
- Mix of letters, numbers, and special characters recommended
- Stored as secure hash, never plain text

## Frontend Authentication

### Login Component
- **File**: `src/components/Login.tsx`
- **Functionality**: Handles both password and ZIP code authentication
- **Session Management**: Uses `AuthContext` and `sessionManager`

### Session Management
- **File**: `src/utils/sessionManager.ts`
- **Storage**: Browser localStorage
- **Timeout**: Configurable session expiration

## Security Vulnerabilities Fixed

### Critical Fix (2025-08-11): ZIP Code Bypass Prevention
**Problem**: Users with password records could still authenticate using ZIP codes
**Solution**: Modified `authenticate_account()` function to strictly enforce password-only authentication when password record exists
**Impact**: Prevents unauthorized access via easily discoverable ZIP codes

## Authentication States

### First-Time Users (No Password Record)
- Can authenticate with account number + ZIP code
- Prompted to set password after login
- ZIP code authentication disabled after password creation

### Existing Users (Have Password Record)
- MUST authenticate with account number + password
- ZIP code authentication permanently disabled
- Password reset available through secure process

## Admin Authentication
- Uses same `authenticate_account()` function
- Special handling for account 999 (main admin)
- Master password override capability for emergency access

## Security Best Practices

### For Users
1. Set strong passwords immediately after first login
2. Never share account credentials
3. Use unique passwords not used elsewhere
4. Report suspicious activity immediately

### For Developers
1. Never bypass authentication checks
2. Always use prepared statements/parameterized queries
3. Implement proper session management
4. Regular security audits of authentication logic
5. Never log passwords or sensitive data

## Current Status
- **Authentication System**: ✅ SECURE (as of 2025-08-11)
- **ZIP Code Bypass**: ✅ FIXED
- **Password Hashing**: ✅ SECURE
- **Session Management**: ✅ FUNCTIONAL
- **Master Password**: ✅ ACTIVE

## Related Files
- `src/components/Login.tsx`
- `src/context/AuthContext.tsx`
- `src/utils/sessionManager.ts`
- `supabase/functions/authenticate-with-master-password/index.ts`
- Database tables: `user_passwords`, `accounts_lcmd`
