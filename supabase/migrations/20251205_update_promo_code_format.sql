-- =====================================================
-- UPDATE PROMO CODE FORMAT
-- New format: 2 LETTERS (A-Z, excluding O) + 1 NUMERAL (1-9)
-- Examples: EA8, AA6, XZ3
-- IMPORTANT: No zeros (0) or letter O allowed!
-- =====================================================

-- Drop and recreate the generate function with new format
CREATE OR REPLACE FUNCTION generate_unique_promo_code()
RETURNS VARCHAR(3) AS $$
DECLARE
    new_code VARCHAR(3);
    code_exists BOOLEAN;
    attempts INT := 0;
    max_attempts INT := 100;
    -- Letters A-Z excluding O (no letter O allowed)
    letters VARCHAR[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    -- Numbers 1-9 only (no zero allowed)
    numbers VARCHAR[] := ARRAY['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    char1 VARCHAR(1);
    char2 VARCHAR(1);
    num1 VARCHAR(1);
BEGIN
    LOOP
        -- Generate 2 random letters (from 25 letters, excluding O)
        char1 := letters[1 + FLOOR(RANDOM() * 25)::INT];
        char2 := letters[1 + FLOOR(RANDOM() * 25)::INT];
        -- Generate 1 random number (1-9, no zero)
        num1 := numbers[1 + FLOOR(RANDOM() * 9)::INT];

        new_code := char1 || char2 || num1;

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

-- Update the comment on the table to reflect new format
COMMENT ON TABLE account_promo_codes IS
'Secure account-specific promo code system using 2 LETTERS + 1 NUMERAL format (e.g., EA8, XZ3).
Letters A-Z (excluding O) and numbers 1-9 (no zeros) for clarity.
Each code is tied to exactly ONE account and cannot be used by any other customer.
Codes expire after 24 hours. Min order: $100, Max order: $1000, Max discount: $250 (25%).';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_unique_promo_code() TO authenticated;
