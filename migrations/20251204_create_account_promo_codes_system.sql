-- =====================================================
-- SECURE ACCOUNT-SPECIFIC PROMO CODE SYSTEM
-- WITH VOWEL-ONLY CODES FOR BETTER MEMORABILITY
-- =====================================================
-- Creates a secure promo code system where each code is:
-- 1. Three VOWELS only (A,E,I,O,U) for easy remembering
-- 2. Tied to a specific account number (CANNOT be shared)
-- 3. Valid for 24 hours only
-- 4. Limited to $250 discount or $1000 purchase max
-- 5. Minimum order: $100
-- 6. Examples: AIE, OUA, IEO (vs hard-to-remember XPZ)
-- =====================================================

-- Drop existing objects if they exist (for clean migration)
DROP TABLE IF EXISTS promo_usage_log CASCADE;
DROP TABLE IF EXISTS account_promo_codes CASCADE;

-- Create the secure promo codes table
CREATE TABLE account_promo_codes (
    id BIGSERIAL PRIMARY KEY,
    promo_code VARCHAR(3) UNIQUE NOT NULL,
    account_number BIGINT NOT NULL,
    account_name VARCHAR(255),
    created_for VARCHAR(100) NOT NULL DEFAULT 'PROSPECT_CONVERSION',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 25.00,
    max_discount_amount DECIMAL(10,2) DEFAULT 250.00,
    min_order_amount DECIMAL(10,2) DEFAULT 100.00,
    max_order_amount DECIMAL(10,2) DEFAULT 1000.00,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    order_id BIGINT,
    actual_discount_amount DECIMAL(10,2),
    order_total DECIMAL(10,2),
    ip_address_created VARCHAR(45),
    ip_address_used VARCHAR(45),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'))
);

-- Create indexes separately (PostgreSQL syntax)
CREATE INDEX idx_promo_code ON account_promo_codes(promo_code);
CREATE INDEX idx_promo_account_number ON account_promo_codes(account_number);
CREATE INDEX idx_promo_expires_at ON account_promo_codes(expires_at);
CREATE INDEX idx_promo_status ON account_promo_codes(status);

-- Create usage log table for analytics
CREATE TABLE promo_usage_log (
    id BIGSERIAL PRIMARY KEY,
    promo_code VARCHAR(3),
    account_number BIGINT,
    order_id BIGINT,
    order_total DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    used_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promo_usage_used_at ON promo_usage_log(used_at);

-- Function to generate a unique 3-letter VOWEL-ONLY code
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
    LOOP
        v1 := vowels[1 + FLOOR(RANDOM() * 5)::INT];
        v2 := vowels[1 + FLOOR(RANDOM() * 5)::INT];
        v3 := vowels[1 + FLOOR(RANDOM() * 5)::INT];
        new_code := v1 || v2 || v3;

        SELECT EXISTS(
            SELECT 1 FROM account_promo_codes
            WHERE promo_code = new_code
            AND (status = 'ACTIVE' OR (status = 'USED' AND expires_at > CURRENT_TIMESTAMP))
        ) INTO code_exists;

        EXIT WHEN NOT code_exists;

        attempts := attempts + 1;
        IF attempts > max_attempts THEN
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
    expires_at TIMESTAMPTZ,
    message TEXT
) AS $$
DECLARE
    v_promo_code VARCHAR(3);
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Check if account already has an active promo code
    IF EXISTS (
        SELECT 1 FROM account_promo_codes apc
        WHERE apc.account_number = p_account_number
        AND apc.status = 'ACTIVE'
        AND apc.expires_at > CURRENT_TIMESTAMP
    ) THEN
        RETURN QUERY
        SELECT
            FALSE::BOOLEAN,
            NULL::VARCHAR(3),
            NULL::TIMESTAMPTZ,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate promo code at checkout (includes $100 minimum)
CREATE OR REPLACE FUNCTION validate_account_promo_code(
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
    p_promo_code := UPPER(p_promo_code);

    SELECT * INTO v_promo
    FROM account_promo_codes
    WHERE account_promo_codes.promo_code = p_promo_code
    LIMIT 1;

    IF v_promo IS NULL THEN
        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00::DECIMAL, p_order_total,
               'Invalid promo code. Please check the code and try again.'::TEXT;
        RETURN;
    END IF;

    IF v_promo.account_number != p_account_number THEN
        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00::DECIMAL, p_order_total,
               'This promo code is not valid for your account.'::TEXT;
        RETURN;
    END IF;

    IF v_promo.used = TRUE THEN
        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00::DECIMAL, p_order_total,
               FORMAT('This promo code was already used on %s', v_promo.used_at)::TEXT;
        RETURN;
    END IF;

    IF v_promo.expires_at < CURRENT_TIMESTAMP THEN
        UPDATE account_promo_codes
        SET status = 'EXPIRED'
        WHERE id = v_promo.id;

        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00::DECIMAL, p_order_total,
               FORMAT('This promo code expired on %s', v_promo.expires_at)::TEXT;
        RETURN;
    END IF;

    -- Check minimum order amount ($100)
    IF p_order_total < v_promo.min_order_amount THEN
        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00::DECIMAL, p_order_total,
               FORMAT('Order total ($%.2f) is below the minimum of $%.2f for this promo code',
                      p_order_total, v_promo.min_order_amount)::TEXT;
        RETURN;
    END IF;

    -- Check maximum order amount ($1000)
    IF p_order_total > v_promo.max_order_amount THEN
        RETURN QUERY
        SELECT FALSE::BOOLEAN, 0.00::DECIMAL, p_order_total,
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
           FORMAT('Valid! Code "%s" applied: $%.2f off (%.0f%% discount). Min order: $%.2f. Expires in %s hours.',
                  v_promo.promo_code,
                  v_discount_amount,
                  v_promo.discount_percentage,
                  v_promo.min_order_amount,
                  EXTRACT(HOUR FROM (v_promo.expires_at - CURRENT_TIMESTAMP))::INT)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark promo code as used after successful order
CREATE OR REPLACE FUNCTION use_account_promo_code(
    p_promo_code VARCHAR(3),
    p_account_number BIGINT,
    p_order_id BIGINT,
    p_order_total DECIMAL(10,2),
    p_discount_amount DECIMAL(10,2),
    p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated INT;
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

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated > 0 THEN
        INSERT INTO promo_usage_log (
            promo_code, account_number, order_id,
            order_total, discount_amount, used_at
        ) VALUES (
            p_promo_code, p_account_number, p_order_id,
            p_order_total, p_discount_amount, CURRENT_TIMESTAMP
        );
    END IF;

    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    min_order_amount,
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
    CASE WHEN COUNT(*) > 0 THEN
        COUNT(CASE WHEN used = TRUE THEN 1 END)::DECIMAL / COUNT(*) * 100
    ELSE 0 END as usage_rate
FROM account_promo_codes
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON account_promo_codes TO authenticated;
GRANT SELECT, INSERT ON promo_usage_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE account_promo_codes_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE promo_usage_log_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION generate_unique_promo_code() TO authenticated;
GRANT EXECUTE ON FUNCTION create_account_promo_code(BIGINT, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_account_promo_code(VARCHAR, BIGINT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION use_account_promo_code(VARCHAR, BIGINT, BIGINT, DECIMAL, DECIMAL, VARCHAR) TO authenticated;

-- Enable RLS
ALTER TABLE account_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS policies: Allow all operations for authenticated users (staff)
CREATE POLICY "Allow all for authenticated" ON account_promo_codes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON promo_usage_log
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE account_promo_codes IS
'Secure account-specific promo code system using VOWEL-ONLY codes (A,E,I,O,U) for better memorability.
Each code is tied to exactly ONE account and cannot be used by any other customer.
Codes expire after 24 hours. Min order: $100, Max order: $1000, Max discount: $250 (25%).';

COMMENT ON FUNCTION create_account_promo_code(BIGINT, VARCHAR, VARCHAR, VARCHAR) IS
'Creates a 3-letter vowel-only promo code for a newly converted account.
Returns success status, the generated code, expiration time, and a message.';
