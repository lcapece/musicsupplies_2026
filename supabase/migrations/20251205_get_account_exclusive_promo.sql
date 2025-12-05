-- =====================================================
-- GET ACTIVE EXCLUSIVE PROMO CODE FOR ACCOUNT
-- Used by PromotionsLoginModal to show one-time offer
-- =====================================================

-- Function to get the active exclusive promo code for an account
-- Returns NULL if no active promo exists
CREATE OR REPLACE FUNCTION get_account_exclusive_promo(
    p_account_number BIGINT
)
RETURNS TABLE (
    promo_code VARCHAR(3),
    discount_percentage DECIMAL(5,2),
    min_order_amount DECIMAL(10,2),
    max_order_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    expires_at TIMESTAMPTZ,
    hours_remaining INT,
    minutes_remaining INT,
    account_name VARCHAR(255),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        apc.promo_code,
        apc.discount_percentage,
        apc.min_order_amount,
        apc.max_order_amount,
        apc.max_discount_amount,
        apc.expires_at,
        GREATEST(0, EXTRACT(HOUR FROM (apc.expires_at - CURRENT_TIMESTAMP)))::INT as hours_remaining,
        GREATEST(0, EXTRACT(MINUTE FROM (apc.expires_at - CURRENT_TIMESTAMP)))::INT as minutes_remaining,
        apc.account_name,
        apc.created_at
    FROM account_promo_codes apc
    WHERE apc.account_number = p_account_number
      AND apc.status = 'ACTIVE'
      AND apc.used = FALSE
      AND apc.expires_at > CURRENT_TIMESTAMP
    ORDER BY apc.expires_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_account_exclusive_promo(BIGINT) TO authenticated;

COMMENT ON FUNCTION get_account_exclusive_promo(BIGINT) IS
'Returns the active exclusive promo code for a given account number.
Used by the login modal to show the one-time 25% discount offer.
Returns NULL if no active promo exists for the account.';
