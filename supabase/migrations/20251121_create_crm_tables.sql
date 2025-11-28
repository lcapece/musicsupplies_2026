-- CRM Tables Migration
-- Creates tables for customer-focused CRM with call logging and multiple contacts

-- =============================================
-- 1. ACCOUNT_CALLS - Salesperson activity log
-- =============================================
CREATE TABLE IF NOT EXISTS account_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number INTEGER NOT NULL REFERENCES accounts_lcmd(account_number) ON DELETE CASCADE,
    call_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    call_outcome TEXT CHECK (call_outcome IN ('answered', 'voicemail', 'no_answer', 'busy', 'email', 'meeting', 'other')),
    notes TEXT,
    callback_date TIMESTAMP WITH TIME ZONE,
    callback_reason TEXT,
    is_callback_complete BOOLEAN DEFAULT FALSE,
    called_by TEXT NOT NULL,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by account
CREATE INDEX IF NOT EXISTS idx_account_calls_account_number ON account_calls(account_number);
-- Index for callback queries (due today, overdue, etc)
CREATE INDEX IF NOT EXISTS idx_account_calls_callback_date ON account_calls(callback_date) WHERE callback_date IS NOT NULL AND is_callback_complete = FALSE;
-- Index for salesperson's calls
CREATE INDEX IF NOT EXISTS idx_account_calls_called_by ON account_calls(called_by);

COMMENT ON TABLE account_calls IS 'Salesperson call/activity log for CRM - tracks all customer interactions';
COMMENT ON COLUMN account_calls.call_outcome IS 'Result of the call: answered, voicemail, no_answer, busy, email, meeting, other';
COMMENT ON COLUMN account_calls.callback_date IS 'Scheduled follow-up date/time';
COMMENT ON COLUMN account_calls.is_callback_complete IS 'Whether the scheduled callback has been completed';

-- =============================================
-- 2. ACCOUNT_CONTACTS - Multiple contacts per company
-- =============================================
CREATE TABLE IF NOT EXISTS account_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number INTEGER NOT NULL REFERENCES accounts_lcmd(account_number) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    title TEXT,
    phone TEXT,
    mobile TEXT,
    email TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by account
CREATE INDEX IF NOT EXISTS idx_account_contacts_account_number ON account_contacts(account_number);

COMMENT ON TABLE account_contacts IS 'Multiple contacts per customer account';
COMMENT ON COLUMN account_contacts.is_primary IS 'Primary contact for this account';

-- =============================================
-- 3. RLS POLICIES
-- =============================================
-- Enable RLS
ALTER TABLE account_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_contacts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow authenticated read account_calls" ON account_calls
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read account_contacts" ON account_contacts
    FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert
CREATE POLICY "Allow authenticated insert account_calls" ON account_calls
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated insert account_contacts" ON account_contacts
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow all authenticated users to update
CREATE POLICY "Allow authenticated update account_calls" ON account_calls
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated update account_contacts" ON account_contacts
    FOR UPDATE TO authenticated USING (true);

-- Allow all authenticated users to delete
CREATE POLICY "Allow authenticated delete account_calls" ON account_calls
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete account_contacts" ON account_contacts
    FOR DELETE TO authenticated USING (true);

-- =============================================
-- 4. HELPER FUNCTIONS
-- =============================================

-- Get callbacks due today for a salesperson
CREATE OR REPLACE FUNCTION get_todays_callbacks(p_salesperson TEXT)
RETURNS TABLE (
    id UUID,
    account_number INTEGER,
    acct_name TEXT,
    callback_date TIMESTAMP WITH TIME ZONE,
    callback_reason TEXT,
    notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ac.id,
        ac.account_number,
        a.acct_name,
        ac.callback_date,
        ac.callback_reason,
        ac.notes
    FROM account_calls ac
    JOIN accounts_lcmd a ON a.account_number = ac.account_number
    WHERE ac.called_by = p_salesperson
      AND ac.is_callback_complete = FALSE
      AND ac.callback_date IS NOT NULL
      AND DATE(ac.callback_date) <= CURRENT_DATE
    ORDER BY ac.callback_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_todays_callbacks(TEXT) TO authenticated;

-- Get call statistics for an account
CREATE OR REPLACE FUNCTION get_account_call_stats(p_account_number INTEGER)
RETURNS TABLE (
    total_calls BIGINT,
    answered_calls BIGINT,
    last_call_date TIMESTAMP WITH TIME ZONE,
    last_call_outcome TEXT,
    pending_callbacks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_calls,
        COUNT(*) FILTER (WHERE call_outcome = 'answered')::BIGINT as answered_calls,
        MAX(call_date) as last_call_date,
        (SELECT call_outcome FROM account_calls WHERE account_number = p_account_number ORDER BY call_date DESC LIMIT 1) as last_call_outcome,
        COUNT(*) FILTER (WHERE callback_date IS NOT NULL AND is_callback_complete = FALSE)::BIGINT as pending_callbacks
    FROM account_calls
    WHERE account_number = p_account_number;
END;
$$;

GRANT EXECUTE ON FUNCTION get_account_call_stats(INTEGER) TO authenticated;

-- =============================================
-- 5. VERIFICATION
-- =============================================
SELECT 'account_calls table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_calls');
SELECT 'account_contacts table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_contacts');
