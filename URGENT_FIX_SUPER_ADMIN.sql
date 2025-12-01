-- URGENT FIX: Update is_user_super_admin function to check staff_management table
-- Run this in Supabase SQL Editor immediately!

CREATE OR REPLACE FUNCTION is_user_super_admin(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_security_level TEXT;
BEGIN
    -- Get the user's security level from staff_management
    SELECT security_level
    INTO v_security_level
    FROM staff_management
    WHERE LOWER(username) = LOWER(p_username);

    -- Return true if user has super admin privileges
    -- Checks for multiple possible super admin security level values
    RETURN (
        v_security_level = 'super_admin' OR
        v_security_level = 'superuser' OR
        v_security_level = 'superadmin' OR
        v_security_level = 'admin'
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO anon;

-- Verify Peter's security level
SELECT username, security_level FROM staff_management WHERE LOWER(username) = 'peter';

-- If Peter's security level is wrong, fix it:
-- UPDATE staff_management SET security_level = 'super_admin' WHERE LOWER(username) = 'peter';

-- Also check what security levels exist
SELECT DISTINCT security_level FROM staff_management ORDER BY security_level;

-- ============================================================
-- FIX #2: Past Due Invoice Payment Matching
-- The tbl_inv_payments table may have a different column name for invoice reference
-- ============================================================

-- Check the actual column names in tbl_inv_payments
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tbl_inv_payments'
ORDER BY ordinal_position;

-- If payments use 'invoice_id' instead of 'invid', we need to check both
-- Run this to see if there are payments with mismatched references:
SELECT
    p.*,
    h.ivd as header_ivd,
    h.invoice_date
FROM tbl_inv_payments p
LEFT JOIN tbl_inv_headers h ON p.invid = h.ivd
WHERE h.ivd IS NULL
LIMIT 20;
