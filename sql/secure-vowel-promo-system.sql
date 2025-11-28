-- =====================================================
-- SECURE ACCOUNT-SPECIFIC PROMO CODE SYSTEM
-- WITH VOWEL-ONLY CODES FOR BETTER MEMORABILITY
-- =====================================================
-- Creates a secure promo code system where each code is:
-- 1. Three VOWELS only (A,E,I,O,U) for easy remembering
-- 2. Tied to a specific account number (CANNOT be shared)
-- 3. Valid for 24 hours only
-- 4. Limited to $250 discount or $1000 purchase max
-- 5. Examples: AIE, OUA, IEO (vs hard-to-remember XPZ)
-- =====================================================

-- Create the secure promo codes table
CREATE TABLE IF NOT EXISTS account_promo_codes (
    id BIGSERIAL PRIMARY KEY,

    -- The 3-letter VOWEL-ONLY promo code (e.g., 'AIE', 'OUA')
    promo_code VARCHAR(3) UNIQUE NOT NULL,

    -- CRITICAL: This promo code is ONLY valid for this account
    account_number BIGINT NOT NULL,
    account_name VARCHAR(255),

    -- Security: Track who created this and why
    created_for VARCHAR(100) NOT NULL DEFAULT 'PROSPECT_CONVERSION',
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 24-hour expiration
    expires_at TIMESTAMP NOT NULL,

    -- Usage limits
    discount_percentage DECIMAL(5,2) DEFAULT 25.00,
    max_discount_amount DECIMAL(10,2) DEFAULT 250.00,  -- Max $250 off
    max_order_amount DECIMAL(10,2) DEFAULT 1000.00,     -- Max $1000 purchase

    -- Usage tracking
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    order_id BIGINT,
    actual_discount_amount DECIMAL(10,2),
    order_total DECIMAL(10,2),

    -- Audit trail
    ip_address_created VARCHAR(45),
    ip_address_used VARCHAR(45),

    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED')),

    -- Indexes for performance
    INDEX idx_promo_code (promo_code),
    INDEX idx_account_number (account_number),
    INDEX idx_expires_at (expires_at),
    INDEX idx_status (status)
);

-- Function to generate a unique 3-letter VOWEL-ONLY code
-- Uses only A, E, I, O, U for better memorability and pronunciation
CREATE OR REPLACE FUNCTION generate_unique_promo_code()
RETURNS VARCHAR(3) AS $$
DECLARE
    new_code VARCHAR(3);
    code_exists BOOLEAN;
    attempts INT := 0;
    max_attempts INT := 100;
    vowels VARCHAR[] := ARRAY['A', 'E', 'I', 'O', 'U'];
    v1 VARCHAR(1);
    v2 VARCHAR(1);
    v3 VARCHAR(1);
BEGIN
    -- We have 125 possible combinations (5^3)
    -- Since codes expire after 24 hours, this is plenty

    LOOP
        -- Generate 3 random vowels for a memorable, pronounceable code
        v1 := vowels[1 + FLOOR(RANDOM() * 5)];
        v2 := vowels[1 + FLOOR(RANDOM() * 5)];
        v3 := vowels[1 + FLOOR(RANDOM() * 5)];

        new_code := v1 || v2 || v3;

        -- Check if code already exists AND is still active
        SELECT EXISTS(
            SELECT 1 FROM account_promo_codes
            WHERE promo_code = new_code
            AND (status = 'ACTIVE' OR (status = 'USED' AND expires_at > CURRENT_TIMESTAMP))
        ) INTO code_exists;

        EXIT WHEN NOT code_exists;

        attempts := attempts + 1;
        IF attempts > max_attempts THEN
            -- This should rarely happen with 125 combinations
            RAISE EXCEPTION 'Could not generate unique promo code after % attempts', max_attempts;
        END IF;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create a promo code for a newly converted account
CREATE OR REPLACE FUNCTION create_account_promo_code(
    p_account_number BIGINT,
    p_account_name VARCHAR(255),
    p_created_by VARCHAR(100) DEFAULT 'SYSTEM',
    p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    promo_code VARCHAR(3),
    expires_at TIMESTAMP,
    message TEXT
) AS $$
DECLARE
    v_promo_code VARCHAR(3);
    v_expires_at TIMESTAMP;
BEGIN
    -- Check if account already has an active promo code
    IF EXISTS (
        SELECT 1 FROM account_promo_codes
        WHERE account_number = p_account_number
        AND status = 'ACTIVE'
        AND expires_at > CURRENT_TIMESTAMP
    ) THEN
        RETURN QUERY
        SELECT
            FALSE::BOOLEAN,
            NULL::VARCHAR(3),
            NULL::TIMESTAMP,
            'Account already has an active promo code'::TEXT;
        RETURN;
    END IF;

    -- Generate unique vowel-only code
    v_promo_code := generate_unique_promo_code();

    -- Set expiration to exactly 24 hours from now
    v_expires_at := CURRENT_TIMESTAMP + INTERVAL '24 hours';

    -- Insert the promo code
    INSERT INTO account_promo_codes (
        promo_code,
        account_number,
        account_name,
        created_by,
        expires_at,
        created_for,
        ip_address_created
    ) VALUES (
        v_promo_code,
        p_account_number,
        p_account_name,
        p_created_by,
        v_expires_at,
        'PROSPECT_CONVERSION_25_PERCENT',
        p_ip_address
    );

    RETURN QUERY
    SELECT
        TRUE::BOOLEAN,
        v_promo_code,
        v_expires_at,
        FORMAT('SUCCESS! Promo code "%s" created for account #%s. Valid for 24 hours (expires %s)',
               v_promo_code, p_account_number, v_expires_at::TEXT)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and apply promo code AT CHECKOUT
CREATE OR REPLACE FUNCTION validate_promo_code(
    p_promo_code VARCHAR(3),
    p_account_number BIGINT,
    p_order_total DECIMAL(10,2)
)
RETURNS TABLE (
    valid BOOLEAN,
    discount_amount DECIMAL(10,2),
    final_total DECIMAL(10,2),
    message TEXT
) AS $$
DECLARE
    v_promo RECORD;
    v_discount_amount DECIMAL(10,2);
    v_final_total DECIMAL(10,2);
BEGIN
    -- Normalize code to uppercase
    p_promo_code := UPPER(p_promo_code);

    -- Find the promo code
    SELECT * INTO v_promo
    FROM account_promo_codes
    WHERE promo_code = p_promo_code
    LIMIT 1;

    -- Check if code exists
    IF v_promo IS NULL THEN
        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00, p_order_total,
               'Invalid promo code. Please check the code and try again.'::TEXT;
        RETURN;
    END IF;

    -- CRITICAL SECURITY CHECK: Verify account number matches
    IF v_promo.account_number != p_account_number THEN
        -- Log potential fraud attempt
        INSERT INTO security_logs (event_type, details, account_number, timestamp)
        VALUES ('PROMO_CODE_MISMATCH',
                FORMAT('Account %s tried to use promo code %s belonging to account %s',
                       p_account_number, p_promo_code, v_promo.account_number),
                p_account_number, CURRENT_TIMESTAMP);

        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00, p_order_total,
               'This promo code is not valid for your account.'::TEXT;
        RETURN;
    END IF;

    -- Check if already used
    IF v_promo.used = TRUE THEN
        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00, p_order_total,
               FORMAT('This promo code was already used on %s', v_promo.used_at)::TEXT;
        RETURN;
    END IF;

    -- Check if expired
    IF v_promo.expires_at < CURRENT_TIMESTAMP THEN
        -- Update status
        UPDATE account_promo_codes
        SET status = 'EXPIRED'
        WHERE id = v_promo.id;

        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00, p_order_total,
               FORMAT('This promo code expired on %s', v_promo.expires_at)::TEXT;
        RETURN;
    END IF;

    -- Check if order exceeds maximum allowed amount ($1000)
    IF p_order_total > v_promo.max_order_amount THEN
        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00, p_order_total,
               FORMAT('Order total ($%.2f) exceeds maximum of $%.2f for this promo code',
                      p_order_total, v_promo.max_order_amount)::TEXT;
        RETURN;
    END IF;

    -- Calculate discount (25% of order total, max $250)
    v_discount_amount := LEAST(
        p_order_total * (v_promo.discount_percentage / 100),
        v_promo.max_discount_amount
    );

    v_final_total := p_order_total - v_discount_amount;

    RETURN QUERY
    SELECT TRUE::BOOLEAN,
           v_discount_amount,
           v_final_total,
           FORMAT('✓ Valid! Code "%s" applied: $%.2f off (%.0f%% discount, max $%.2f). Expires in %s hours.',
                  v_promo.promo_code,
                  v_discount_amount,
                  v_promo.discount_percentage,
                  v_promo.max_discount_amount,
                  EXTRACT(HOUR FROM (v_promo.expires_at - CURRENT_TIMESTAMP)))::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to mark promo code as used after successful order
CREATE OR REPLACE FUNCTION use_promo_code(
    p_promo_code VARCHAR(3),
    p_account_number BIGINT,
    p_order_id BIGINT,
    p_order_total DECIMAL(10,2),
    p_discount_amount DECIMAL(10,2),
    p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE account_promo_codes
    SET
        used = TRUE,
        used_at = CURRENT_TIMESTAMP,
        order_id = p_order_id,
        order_total = p_order_total,
        actual_discount_amount = p_discount_amount,
        ip_address_used = p_ip_address,
        status = 'USED'
    WHERE
        UPPER(promo_code) = UPPER(p_promo_code)
        AND account_number = p_account_number
        AND used = FALSE
        AND expires_at > CURRENT_TIMESTAMP;

    GET DIAGNOSTICS v_updated = ROW_COUNT > 0;

    IF v_updated THEN
        -- Log successful usage
        INSERT INTO promo_usage_log (
            promo_code, account_number, order_id,
            order_total, discount_amount, used_at
        ) VALUES (
            p_promo_code, p_account_number, p_order_id,
            p_order_total, p_discount_amount, CURRENT_TIMESTAMP
        );
    END IF;

    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Create usage log table for analytics
CREATE TABLE IF NOT EXISTS promo_usage_log (
    id BIGSERIAL PRIMARY KEY,
    promo_code VARCHAR(3),
    account_number BIGINT,
    order_id BIGINT,
    order_total DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_used_at (used_at)
);

-- Create security log table
CREATE TABLE IF NOT EXISTS security_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    details TEXT,
    account_number BIGINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
);

-- View for active promo codes (for staff dashboard)
CREATE OR REPLACE VIEW active_promo_codes AS
SELECT
    promo_code,
    account_number,
    account_name,
    expires_at,
    CASE
        WHEN expires_at < CURRENT_TIMESTAMP THEN 'EXPIRED'
        WHEN used = TRUE THEN 'USED'
        ELSE 'ACTIVE'
    END as current_status,
    GREATEST(0, EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 3600)::INT as hours_remaining,
    discount_percentage,
    max_discount_amount,
    max_order_amount,
    created_by,
    created_at
FROM account_promo_codes
WHERE status = 'ACTIVE'
ORDER BY expires_at DESC;

-- Analytics view
CREATE OR REPLACE VIEW promo_code_analytics AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as codes_created,
    COUNT(CASE WHEN used = TRUE THEN 1 END) as codes_used,
    SUM(actual_discount_amount) as total_discounts_given,
    AVG(actual_discount_amount) as avg_discount,
    COUNT(CASE WHEN used = TRUE THEN 1 END)::DECIMAL /
        NULLIF(COUNT(*), 0) * 100 as usage_rate
FROM account_promo_codes
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON account_promo_codes TO authenticated;
GRANT SELECT, INSERT ON promo_usage_log TO authenticated;
GRANT SELECT, INSERT ON security_logs TO authenticated;
GRANT EXECUTE ON FUNCTION create_account_promo_code TO authenticated;
GRANT EXECUTE ON FUNCTION validate_promo_code TO authenticated;
GRANT EXECUTE ON FUNCTION use_promo_code TO authenticated;

-- Add RLS policies for security
ALTER TABLE account_promo_codes ENABLE ROW LEVEL SECURITY;

-- Staff can see all promo codes
CREATE POLICY staff_view_all_promos ON account_promo_codes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff
            WHERE auth.uid() = id
        )
    );

-- Customers can only see their own promo codes
CREATE POLICY customers_view_own_promos ON account_promo_codes
    FOR SELECT
    TO authenticated
    USING (
        account_number IN (
            SELECT account_number
            FROM accounts_lcmd
            WHERE user_id = auth.uid()
        )
    );

-- Add helpful comments
COMMENT ON TABLE account_promo_codes IS
'Secure account-specific promo code system using VOWEL-ONLY codes (A,E,I,O,U) for better memorability.
Each code is tied to exactly ONE account and cannot be used by any other customer.
Examples: AIE, OUA, IEO are much easier to remember than XPZ or QKJ.
Codes expire after 24 hours and are limited to $250 discount or $1000 purchase maximum.';

COMMENT ON FUNCTION generate_unique_promo_code() IS
'Generates a 3-letter promo code using ONLY VOWELS (A,E,I,O,U) for better memorability.
Examples: AIE, OUA, IEO are much easier to remember and pronounce than XPZ or QKJ.
This gives us 125 possible combinations (5^3), which is sufficient since codes expire
after 24 hours and can be reused after expiration.';

-- Success message
SELECT 'Secure vowel-only promo code system created successfully!' as status,
       'Sample codes: AIE, OUA, IEO, AEU, OIE' as examples;