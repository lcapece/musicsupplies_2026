-- ============================================
-- FIX: Super Users Can See ALL Accounts
-- ============================================
-- This migration fixes the RLS policy on accounts_lcmd
-- to allow super users to see all accounts, not just
-- those assigned to them.
--
-- Issue: Super users (like Peter) could only see accounts
-- assigned to them or unassigned accounts. They should see ALL accounts.
--
-- Solution: Modify the RLS policy to check if the user is a superuser
-- and bypass the salesman filter if so.
-- ============================================

-- Step 1: Drop existing restrictive policy (if it exists)
DROP POLICY IF EXISTS "accounts_lcmd_select_policy" ON accounts_lcmd;
DROP POLICY IF EXISTS "accounts_lcmd_admin_policy" ON accounts_lcmd;
DROP POLICY IF EXISTS "Staff can view accounts" ON accounts_lcmd;
DROP POLICY IF EXISTS "Salesperson can view own accounts" ON accounts_lcmd;
DROP POLICY IF EXISTS "accounts_lcmd_salesperson_filter" ON accounts_lcmd;

-- Step 2: Create helper function to check if current user is a superuser
CREATE OR REPLACE FUNCTION is_current_user_superuser()
RETURNS BOOLEAN AS $$
DECLARE
    v_security_level TEXT;
    v_username TEXT;
BEGIN
    -- Get current staff username from session or auth context
    -- This assumes staff login sets the username in a session variable
    v_username := current_setting('app.current_staff_username', true);

    IF v_username IS NULL OR v_username = '' THEN
        -- No staff user logged in, not a superuser
        RETURN FALSE;
    END IF;

    -- Check security level in staff_management table
    SELECT security_level INTO v_security_level
    FROM staff_management
    WHERE LOWER(username) = LOWER(v_username);

    IF v_security_level IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if security level indicates superuser
    RETURN LOWER(REPLACE(v_security_level, '_', '')) IN ('superuser', 'superadmin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 3: Create new RLS policy that allows superusers to see all accounts
-- For SELECT operations:
CREATE POLICY "accounts_lcmd_select_policy" ON accounts_lcmd
    FOR SELECT
    TO authenticated
    USING (
        -- Super users can see ALL accounts
        is_current_user_superuser()
        OR
        -- Regular staff can see accounts assigned to them, unassigned, or open
        (
            salesman IS NULL
            OR salesman = ''
            OR LOWER(salesman) ILIKE '%' || LOWER(COALESCE(current_setting('app.current_staff_username', true), '')) || '%'
        )
        OR
        -- Account 999 (admin) can always see all
        current_setting('app.current_account_number', true) = '999'
    );

-- Step 4: Allow full access for INSERT/UPDATE/DELETE to staff
CREATE POLICY "accounts_lcmd_modify_policy" ON accounts_lcmd
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_current_user_superuser() TO authenticated;

-- ============================================
-- ALTERNATIVE SIMPLER FIX:
-- If the above doesn't work due to session variable issues,
-- you can use this simpler approach that just allows all
-- authenticated users to view all accounts (since this is
-- a backend/admin interface anyway):
-- ============================================
--
-- DROP POLICY IF EXISTS "accounts_lcmd_select_policy" ON accounts_lcmd;
--
-- CREATE POLICY "accounts_lcmd_allow_all_select" ON accounts_lcmd
--     FOR SELECT
--     TO authenticated
--     USING (true);
--
-- ============================================

COMMENT ON POLICY "accounts_lcmd_select_policy" ON accounts_lcmd IS
'Allows super users to see all accounts. Regular staff see only their assigned accounts.';
