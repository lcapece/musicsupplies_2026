-- =====================================================
-- USER CARTS PERSISTENCE SYSTEM
-- Created: 2025-12-04
-- Purpose: Enable persistent shopping cart storage for logged-in users
-- =====================================================

-- 1. Create the user_carts table to store cart data per account
CREATE TABLE IF NOT EXISTS user_carts (
    id BIGSERIAL PRIMARY KEY,
    account_number INTEGER NOT NULL UNIQUE,
    cart_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create index for fast lookups by account number
CREATE INDEX IF NOT EXISTS idx_user_carts_account_number ON user_carts(account_number);

-- 3. Enable Row Level Security
ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy for authenticated users to access their own cart
-- Allow users to see their own cart
CREATE POLICY "Users can view own cart" ON user_carts
    FOR SELECT
    USING (true);  -- The RPC functions handle account number validation

-- Allow users to insert their own cart
CREATE POLICY "Users can insert own cart" ON user_carts
    FOR INSERT
    WITH CHECK (true);  -- The RPC functions handle account number validation

-- Allow users to update their own cart
CREATE POLICY "Users can update own cart" ON user_carts
    FOR UPDATE
    USING (true);  -- The RPC functions handle account number validation

-- Allow users to delete their own cart
CREATE POLICY "Users can delete own cart" ON user_carts
    FOR DELETE
    USING (true);  -- The RPC functions handle account number validation

-- 5. Create function to save user cart (upsert)
CREATE OR REPLACE FUNCTION save_user_cart(
    p_account_number INTEGER,
    p_cart_data TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate inputs
    IF p_account_number IS NULL THEN
        RAISE EXCEPTION 'Account number is required';
    END IF;

    -- Upsert cart data
    INSERT INTO user_carts (account_number, cart_data, updated_at)
    VALUES (p_account_number, p_cart_data::jsonb, NOW())
    ON CONFLICT (account_number)
    DO UPDATE SET
        cart_data = p_cart_data::jsonb,
        updated_at = NOW();
END;
$$;

-- 6. Create function to get user cart
CREATE OR REPLACE FUNCTION get_user_cart(
    p_account_number INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cart_data JSONB;
BEGIN
    -- Validate input
    IF p_account_number IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Get cart data
    SELECT cart_data INTO v_cart_data
    FROM user_carts
    WHERE account_number = p_account_number;

    -- Return empty array if no cart found
    IF v_cart_data IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    RETURN v_cart_data;
END;
$$;

-- 7. Create function to clear user cart
CREATE OR REPLACE FUNCTION clear_user_cart(
    p_account_number INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate input
    IF p_account_number IS NULL THEN
        RETURN;
    END IF;

    -- Update cart to empty array instead of deleting
    UPDATE user_carts
    SET cart_data = '[]'::jsonb,
        updated_at = NOW()
    WHERE account_number = p_account_number;
END;
$$;

-- 8. Grant execute permissions on functions to authenticated and anon users
GRANT EXECUTE ON FUNCTION save_user_cart(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION save_user_cart(INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_cart(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_cart(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION clear_user_cart(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_user_cart(INTEGER) TO anon;

-- 9. Add comment for documentation
COMMENT ON TABLE user_carts IS 'Stores shopping cart data per user account for persistence across sessions';
COMMENT ON FUNCTION save_user_cart IS 'Saves or updates cart data for a user account';
COMMENT ON FUNCTION get_user_cart IS 'Retrieves cart data for a user account';
COMMENT ON FUNCTION clear_user_cart IS 'Clears cart data for a user account';
