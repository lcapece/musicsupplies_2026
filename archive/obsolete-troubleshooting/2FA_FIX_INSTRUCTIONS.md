# 2FA System Fix for Account 999

This document provides instructions for fixing the 2FA system for account 999 using the created migration file.

## Migration File Created
`supabase/migrations/20250824_fix_2fa_system_for_999.sql`

This migration file contains all the necessary SQL commands to:

1. **Populate sms_admins table** with admin phone numbers:
   - +15164550980 (Primary admin)
   - +15164107455 (Secondary admin)
   - +15167650816 (Tertiary admin)

2. **Verify sms_admins table** is populated correctly

3. **Test 2FA code generation function** for account 999

4. **Check admin_logins table** for the generated codes

## How to Run the Migration

### Option 1: Using Supabase CLI (Recommended)
```bash
npx supabase db push
```

### Option 2: Manual execution via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc
2. Navigate to SQL Editor
3. Copy and paste the contents of the migration file
4. Execute the SQL

### Option 3: Using psql directly (if you have database URL)
```bash
psql "postgresql://[connection-string]" -f supabase/migrations/20250824_fix_2fa_system_for_999.sql
```

## Expected Results

After running the migration, you should see:

1. **SMS Admins populated**: 3 active phone numbers in the sms_admins table
2. **2FA code generated**: A successful response from the generate_2fa_code function
3. **Admin login entry**: A new entry in the admin_logins table with a 6-digit code
4. **Backward compatibility**: An entry in the two_factor_codes table (if it exists)

## Verification

The migration includes verification queries that will show:
- Status messages for each step
- The populated sms_admins records
- The result of the 2FA code generation
- Recent entries in both admin_logins and two_factor_codes tables

## Files Modified/Created

1. **New Migration**: `supabase/migrations/20250824_fix_2fa_system_for_999.sql`
2. **Instructions**: `2FA_FIX_INSTRUCTIONS.md` (this file)

## Related System Components

The 2FA system uses these components:
- **Database Functions**: `generate_2fa_code()`, `validate_2fa_code()`
- **Tables**: `sms_admins`, `admin_logins`, `two_factor_codes`
- **Edge Function**: `supabase/functions/admin-2fa-handler/index.ts`

## Notes

- The system is designed for account 999 specifically
- Codes have a 90-second expiry time
- The system supports both new (admin_logins) and legacy (two_factor_codes) tables
- SMS delivery is handled by the Edge function using ClickSend API