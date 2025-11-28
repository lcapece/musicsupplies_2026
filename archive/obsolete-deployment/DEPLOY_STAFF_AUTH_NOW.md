# DEPLOY STAFF AUTH - MANUAL INSTRUCTIONS

## The Problem
The staff authentication system code is complete, but the database migration hasn't been deployed. That's why `peter` login fails - the `authenticate_staff_user` function doesn't exist in your database yet.

## IMMEDIATE FIX - 2 MINUTES

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**

### Step 2: Copy and Paste This SQL
Copy the ENTIRE contents of `migrations/20251023_complete_staff_auth_system.sql` and paste it into the SQL editor, then click **RUN**.

Or copy this directly:

```sql
CREATE TABLE IF NOT EXISTS staff_management (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    user_full_name VARCHAR(100) NOT NULL,
    security_level VARCHAR(20) NOT NULL DEFAULT 'user',
    password_hash TEXT,
    settings JSONB DEFAULT '{}',
    is_salesperson BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_management' 
                   AND column_name = 'is_salesperson') THEN
        ALTER TABLE staff_management ADD COLUMN is_salesperson BOOLEAN DEFAULT false;
    END IF;
END $$;

DROP FUNCTION IF EXISTS authenticate_staff_user(TEXT, TEXT);

CREATE OR REPLACE FUNCTION authenticate_staff_user(
    p_username TEXT,
    p_password TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    user_full_name TEXT,
    security_level TEXT,
    username TEXT,
    requires_password_change BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_computed_hash TEXT;
    v_user_record RECORD;
BEGIN
    RAISE NOTICE 'Staff auth attempt for username: %', p_username;
    
    SELECT password_hash, user_full_name, security_level, username
    INTO v_user_record
    FROM staff_management 
    WHERE LOWER(staff_management.username) = LOWER(p_username);
    
    IF NOT FOUND THEN
        RAISE NOTICE 'User not found: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;
    
    v_stored_hash := v_user_record.password_hash;
    
    IF v_stored_hash IS NULL OR v_stored_hash = '' THEN
        RAISE NOTICE 'No password hash stored for user: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;
    
    v_computed_hash := '$2a$12$' || LEFT(encode(digest(p_password || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53);
    
    RAISE NOTICE 'Stored hash: %', LEFT(v_stored_hash, 20) || '...';
    RAISE NOTICE 'Computed hash: %', LEFT(v_computed_hash, 20) || '...';
    
    IF v_stored_hash = v_computed_hash THEN
        RAISE NOTICE 'Authentication successful for user: %', p_username;
        
        IF p_password = 'password' THEN
            RETURN QUERY SELECT TRUE, v_user_record.user_full_name, v_user_record.security_level, v_user_record.username, TRUE;
        ELSE
            RETURN QUERY SELECT TRUE, v_user_record.user_full_name, v_user_record.security_level, v_user_record.username, FALSE;
        END IF;
    ELSE
        RAISE NOTICE 'Password mismatch for user: %', p_username;
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    END IF;
    
    RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_staff_user(TEXT, TEXT) TO anon;

INSERT INTO staff_management (username, user_full_name, security_level, password_hash, settings, created_at, updated_at)
VALUES (
    'peter', 
    'Peter Staff User', 
    'manager', 
    '$2a$12$' || LEFT(encode(digest('860777' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    '{}',
    NOW(),
    NOW()
)
ON CONFLICT (username) 
DO UPDATE SET 
    password_hash = '$2a$12$' || LEFT(encode(digest('860777' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    updated_at = NOW();

UPDATE staff_management 
SET is_salesperson = true 
WHERE username IN ('guy', 'anthony', 'julissa', 'joe', 'melissa', 'louis');

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

```

### Step 3: Test Immediately
After running the SQL:

1. **Clear browser cache** (Ctrl+Shift+R)
2. **Test login with:**
   - Username: `peter`
   - Password: `860777`
   - **Should work normally now**

3. **Test password change modal:**
   - Username: `teststaff`
   - Password: `password`
   - **Should trigger password change modal**

## What This Does
- Creates the missing `authenticate_staff_user` function
- Creates `peter` user with password `860777`
- Creates `teststaff` user with password `password` (triggers modal)
- Enables staff authentication system

## That's It
Once you run that SQL, the staff authentication will work immediately. No more scripts, no more complexity.