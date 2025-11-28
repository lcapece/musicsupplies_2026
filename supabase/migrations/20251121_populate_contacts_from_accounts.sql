-- Populate account_contacts from existing contact field in accounts_lcmd
-- This migrates the single contact from accounts into the new contacts table

-- Insert contacts from accounts_lcmd where contact field is not empty
INSERT INTO account_contacts (
    account_number,
    contact_name,
    phone,
    mobile,
    email,
    is_primary,
    notes,
    created_at,
    updated_at
)
SELECT
    a.account_number,
    a.contact as contact_name,
    a.phone,
    a.mobile_phone as mobile,
    a.email_address as email,
    true as is_primary,  -- Mark as primary since it's the main contact
    'Migrated from account record' as notes,
    COALESCE(a.dstamp, NOW()) as created_at,
    NOW() as updated_at
FROM accounts_lcmd a
WHERE a.contact IS NOT NULL
  AND TRIM(a.contact) != ''
  AND NOT EXISTS (
    -- Don't insert if contact already exists for this account
    SELECT 1 FROM account_contacts ac
    WHERE ac.account_number = a.account_number
    AND LOWER(TRIM(ac.contact_name)) = LOWER(TRIM(a.contact))
  );

-- Report how many contacts were migrated
SELECT
    COUNT(*) as contacts_migrated,
    (SELECT COUNT(*) FROM accounts_lcmd WHERE contact IS NOT NULL AND TRIM(contact) != '') as total_accounts_with_contacts
FROM account_contacts
WHERE notes = 'Migrated from account record';
