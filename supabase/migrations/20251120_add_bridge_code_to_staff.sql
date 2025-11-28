-- Add bridge_code column to staff_management table for Security Bridge authentication
-- Each superuser can have their own unique 6-digit security bridge code

-- Add bridge_code column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'staff_management'
                   AND column_name = 'bridge_code') THEN
        ALTER TABLE staff_management ADD COLUMN bridge_code VARCHAR(6);
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN staff_management.bridge_code IS 'Optional 6-digit security bridge code for enhanced authentication. Each superuser can have their own code.';

-- Bridge codes should be set via the admin interface, not hardcoded in migrations
-- To set a bridge code for a user, use:
-- UPDATE staff_management SET bridge_code = '<6-digit-code>' WHERE LOWER(username) = '<username>';
