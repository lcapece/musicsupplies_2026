-- =====================================================
-- Migration: Create INVOICE_HEADERS and INVOICE_DETAILS Tables
-- Created: 2025-11-25
-- Description: Creates parent/child tables for invoice management
--              Based on InvoicingPage.tsx UI fields
-- =====================================================

-- =====================================================
-- INVOICE_HEADERS Table
-- Parent table for invoice/order header information
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_headers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Invoice Identification
    invoice_number VARCHAR(20) NOT NULL UNIQUE,
    invoice_type VARCHAR(10) NOT NULL DEFAULT 'Invoice' CHECK (invoice_type IN ('Invoice', 'Quote')),

    -- Account & Customer Info
    account_number VARCHAR(20),
    customer_po VARCHAR(50),

    -- Dates
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shipped_date DATE,

    -- Shipping
    ship_via VARCHAR(50),

    -- Terms & Sales
    terms VARCHAR(20) DEFAULT 'Net 10',
    salesperson VARCHAR(50),

    -- Bill To Address
    bill_to_name VARCHAR(100),
    bill_to_address VARCHAR(200),
    bill_to_city VARCHAR(50),
    bill_to_state VARCHAR(10),
    bill_to_zip VARCHAR(20),
    bill_to_attn VARCHAR(100),
    bill_to_email VARCHAR(100),

    -- Ship To Address
    ship_to_name VARCHAR(100),
    ship_to_address VARCHAR(200),
    ship_to_city VARCHAR(50),
    ship_to_state VARCHAR(10),
    ship_to_zip VARCHAR(20),
    ship_to_attn VARCHAR(100),
    ship_to_phone VARCHAR(30),

    -- Financial Totals
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    interest_amount DECIMAL(10, 2) DEFAULT 0,
    credit_card_fees DECIMAL(10, 2) DEFAULT 0,
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_payments DECIMAL(12, 2) DEFAULT 0,
    amount_owed DECIMAL(12, 2) GENERATED ALWAYS AS (grand_total - total_payments) STORED,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Canc', 'Wait', 'Return', 'Shipped')),
    is_locked BOOLEAN DEFAULT FALSE,
    disable_owes_check BOOLEAN DEFAULT FALSE,
    disable_owes_money BOOLEAN DEFAULT FALSE,
    print_comments BOOLEAN DEFAULT FALSE,

    -- Comments
    comments TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- =====================================================
-- INVOICE_DETAILS Table
-- Child table for invoice line items
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_details (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Key to Header
    invoice_header_id UUID NOT NULL REFERENCES invoice_headers(id) ON DELETE CASCADE,

    -- Line Item Identification
    line_number INTEGER NOT NULL,
    stock_number VARCHAR(50) NOT NULL,
    description VARCHAR(500),

    -- Quantities
    qty_ordered INTEGER NOT NULL DEFAULT 0,
    qty_shipped INTEGER DEFAULT 0,
    back_order INTEGER GENERATED ALWAYS AS (GREATEST(qty_ordered - COALESCE(qty_shipped, 0), 0)) STORED,
    available INTEGER DEFAULT 0,

    -- Pricing
    unit_cost DECIMAL(10, 2) DEFAULT 0,
    min_price DECIMAL(10, 2) DEFAULT 0,
    unit_net DECIMAL(10, 2) NOT NULL DEFAULT 0,
    std_net DECIMAL(10, 2) DEFAULT 0,
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (unit_cost * COALESCE(qty_shipped, qty_ordered)) STORED,
    total_net DECIMAL(12, 2) GENERATED ALWAYS AS (unit_net * COALESCE(qty_shipped, qty_ordered)) STORED,
    total DECIMAL(12, 2) GENERATED ALWAYS AS ((unit_net - unit_cost) * COALESCE(qty_shipped, qty_ordered)) STORED,

    -- Margin
    gpm DECIMAL(5, 2) DEFAULT 0, -- Gross Profit Margin percentage

    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one line number per invoice
    UNIQUE(invoice_header_id, line_number)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Invoice Headers Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_headers_invoice_number ON invoice_headers(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_account_number ON invoice_headers(account_number);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_order_date ON invoice_headers(order_date);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_status ON invoice_headers(status);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_customer_po ON invoice_headers(customer_po);

-- Invoice Details Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_details_header_id ON invoice_details(invoice_header_id);
CREATE INDEX IF NOT EXISTS idx_invoice_details_stock_number ON invoice_details(stock_number);

-- =====================================================
-- Triggers for Updated Timestamps
-- =====================================================

-- Create function for updating timestamps if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for invoice_headers
DROP TRIGGER IF EXISTS update_invoice_headers_updated_at ON invoice_headers;
CREATE TRIGGER update_invoice_headers_updated_at
    BEFORE UPDATE ON invoice_headers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for invoice_details
DROP TRIGGER IF EXISTS update_invoice_details_updated_at ON invoice_details;
CREATE TRIGGER update_invoice_details_updated_at
    BEFORE UPDATE ON invoice_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Enable Row Level Security
-- =====================================================

ALTER TABLE invoice_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_headers
DROP POLICY IF EXISTS "Allow authenticated users to view invoice_headers" ON invoice_headers;
CREATE POLICY "Allow authenticated users to view invoice_headers"
    ON invoice_headers FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert invoice_headers" ON invoice_headers;
CREATE POLICY "Allow authenticated users to insert invoice_headers"
    ON invoice_headers FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update invoice_headers" ON invoice_headers;
CREATE POLICY "Allow authenticated users to update invoice_headers"
    ON invoice_headers FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete invoice_headers" ON invoice_headers;
CREATE POLICY "Allow authenticated users to delete invoice_headers"
    ON invoice_headers FOR DELETE
    TO authenticated
    USING (true);

-- RLS Policies for invoice_details
DROP POLICY IF EXISTS "Allow authenticated users to view invoice_details" ON invoice_details;
CREATE POLICY "Allow authenticated users to view invoice_details"
    ON invoice_details FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert invoice_details" ON invoice_details;
CREATE POLICY "Allow authenticated users to insert invoice_details"
    ON invoice_details FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update invoice_details" ON invoice_details;
CREATE POLICY "Allow authenticated users to update invoice_details"
    ON invoice_details FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete invoice_details" ON invoice_details;
CREATE POLICY "Allow authenticated users to delete invoice_details"
    ON invoice_details FOR DELETE
    TO authenticated
    USING (true);

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE invoice_headers IS 'Parent table for invoice/quote header information - correlates to InvoicingPage.tsx UI';
COMMENT ON TABLE invoice_details IS 'Child table for invoice line items - correlates to InvoiceLineItem interface';

COMMENT ON COLUMN invoice_headers.invoice_type IS 'Invoice or Quote';
COMMENT ON COLUMN invoice_headers.terms IS 'Payment terms: Net 10, Net 30, COD, Prepaid';
COMMENT ON COLUMN invoice_headers.ship_via IS 'Shipping carrier: Fedex Ground, UPS Ground, USPS Priority, Will Call';
COMMENT ON COLUMN invoice_headers.status IS 'Invoice status: Open, Canc (Cancelled), Wait, Return, Shipped';
COMMENT ON COLUMN invoice_headers.amount_owed IS 'Computed field: grand_total - total_payments';

COMMENT ON COLUMN invoice_details.back_order IS 'Computed field: qty_ordered - qty_shipped';
COMMENT ON COLUMN invoice_details.total_cost IS 'Computed field: unit_cost * qty_shipped';
COMMENT ON COLUMN invoice_details.total_net IS 'Computed field: unit_net * qty_shipped';
COMMENT ON COLUMN invoice_details.total IS 'Computed field: profit = (unit_net - unit_cost) * qty_shipped';
COMMENT ON COLUMN invoice_details.gpm IS 'Gross Profit Margin percentage';