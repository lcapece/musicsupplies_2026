-- Add extension column to account_contacts table
-- This allows storing phone extensions separately for contacts

-- Add the extension column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'account_contacts' AND column_name = 'extension'
    ) THEN
        ALTER TABLE account_contacts ADD COLUMN extension TEXT;
        COMMENT ON COLUMN account_contacts.extension IS 'Phone extension for the contact';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'account_contacts' AND column_name = 'extension';
