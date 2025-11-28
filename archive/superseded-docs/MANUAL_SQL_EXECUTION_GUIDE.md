# Manual SQL Execution Guide

## Overview
Execute these 3 SQL files against your Supabase database in the exact order shown:

1. **EMERGENCY_AUTH_FIX_FINAL.sql** - Fixes authentication system
2. **2FA_SETUP.sql** - Sets up 2FA system for account 999  
3. **ADD_2FA_PHONES.sql** - Adds phone numbers for 2FA SMS

## Method 1: Using Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc
2. Navigate to **SQL Editor** in the left sidebar
3. For each SQL file:
   - Open the file content from your local directory
   - Copy the entire SQL content 
   - Paste into the SQL Editor
   - Click **Run** button
   - Verify no errors occurred

## Method 2: Using Command Line (if available)

### Option A: Supabase CLI
```bash
npx supabase db push --file EMERGENCY_AUTH_FIX_FINAL.sql --db-url "postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
npx supabase db push --file 2FA_SETUP.sql --db-url "postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
npx supabase db push --file ADD_2FA_PHONES.sql --db-url "postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

### Option B: PostgreSQL Client
```bash
psql "postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -f EMERGENCY_AUTH_FIX_FINAL.sql
psql "postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -f 2FA_SETUP.sql
psql "postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -f ADD_2FA_PHONES.sql
```

## Method 3: Using Created Batch File

Run one of the batch files created in your directory:
- `execute-requested-sql-files.bat`
- `execute-with-psql.bat`

## What Each File Does

### EMERGENCY_AUTH_FIX_FINAL.sql
- Drops all old authentication function versions
- Creates a single, secure `authenticate_user` function
- Blocks "Music123" password attacks
- Implements ZIP code authentication for new accounts
- Adds proper logging and security checks

### 2FA_SETUP.sql  
- Creates `2fa` table for phone numbers
- Creates `two_factor_codes` table for SMS codes
- Adds `generate_2fa_code()` function
- Adds `validate_2fa_code()` function
- Updates `authenticate_user()` to support 2FA for account 999

### ADD_2FA_PHONES.sql
- Inserts phone numbers: +15164107455, +18003215584
- These numbers will receive 2FA SMS codes when account 999 logs in

## Verification Steps

After executing all files, verify by running this in SQL Editor:
```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%2fa%' OR proname = 'authenticate_user';

-- Check if tables exist
SELECT tablename FROM pg_tables WHERE tablename IN ('2fa', 'two_factor_codes');

-- Check if phone numbers were added
SELECT * FROM public."2fa";
```

## Expected Results

✅ **authenticate_user** function exists  
✅ **generate_2fa_code** function exists  
✅ **validate_2fa_code** function exists  
✅ **2fa** table exists with phone numbers  
✅ **two_factor_codes** table exists  
✅ Account 999 now requires 2FA to login  
✅ SMS codes will be sent to registered phone numbers  

## Troubleshooting

If you get permission errors:
- Make sure you're using the **Service Role Key** (not anon key)
- Verify you're logged into the correct Supabase project

If functions already exist:
- The scripts use `DROP FUNCTION IF EXISTS` so they're safe to re-run

If you need help:
- Check the Supabase logs in the dashboard
- The `app_events` table will log authentication attempts and 2FA events