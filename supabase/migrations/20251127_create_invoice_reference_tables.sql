-- =====================================================
-- Migration: Create Invoice Reference Tables
-- Created: 2025-11-27
-- Description: Creates reference tables for invoice dropdowns:
--              - ref_payment_terms (Invoice Terms)
--              - ref_ship_methods (Ship Method / Ship Via)
--              - ref_payment_types (Payment Types for recording payments)
-- =====================================================

-- =====================================================
-- ref_payment_terms Table
-- Reference data for invoice payment terms
-- =====================================================
CREATE TABLE IF NOT EXISTS ref_payment_terms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(100) NOT NULL,
    days_until_due INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data for payment terms
INSERT INTO ref_payment_terms (code, description, days_until_due, is_active, sort_order) VALUES
    ('NET10', 'Net 10 Days', 10, true, 1),
    ('NET30', 'Net 30 Days', 30, true, 2),
    ('NET60', 'Net 60 Days', 60, true, 3),
    ('NET90', 'Net 90 Days', 90, true, 4),
    ('COD', 'Cash On Delivery', 0, true, 5),
    ('PREPAID', 'Prepaid', 0, true, 6),
    ('CIA', 'Cash In Advance', 0, true, 7),
    ('2%10NET30', '2% 10 Net 30', 30, true, 8),
    ('CREDITCARD', 'Credit Card', 0, true, 9),
    ('ACH', 'ACH/Wire Transfer', 0, true, 10)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- ref_ship_methods Table
-- Reference data for shipping methods / carriers
-- =====================================================
CREATE TABLE IF NOT EXISTS ref_ship_methods (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(100) NOT NULL,
    carrier VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data for shipping methods
INSERT INTO ref_ship_methods (code, description, carrier, is_active, sort_order) VALUES
    ('UPS_GROUND', 'UPS Ground', 'UPS', true, 1),
    ('UPS_2DAY', 'UPS 2nd Day Air', 'UPS', true, 2),
    ('UPS_NEXTDAY', 'UPS Next Day Air', 'UPS', true, 3),
    ('FEDEX_GROUND', 'FedEx Ground', 'FedEx', true, 4),
    ('FEDEX_EXPRESS', 'FedEx Express', 'FedEx', true, 5),
    ('FEDEX_2DAY', 'FedEx 2 Day', 'FedEx', true, 6),
    ('USPS_PRIORITY', 'USPS Priority Mail', 'USPS', true, 7),
    ('USPS_EXPRESS', 'USPS Express Mail', 'USPS', true, 8),
    ('LTL_FREIGHT', 'LTL Freight', 'Freight', true, 9),
    ('TRUCK_FREIGHT', 'Truck Freight', 'Freight', true, 10),
    ('CUSTOMER_PICKUP', 'Customer Pickup', 'Pickup', true, 11),
    ('WILL_CALL', 'Will Call', 'Pickup', true, 12),
    ('LOCAL_DELIVERY', 'Local Delivery', 'Local', true, 13)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- ref_payment_types Table
-- Reference data for payment types (used in RecordPaymentModal)
-- =====================================================
CREATE TABLE IF NOT EXISTS ref_payment_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data for payment types
INSERT INTO ref_payment_types (code, description, is_active, sort_order) VALUES
    ('CHECK', 'Check', true, 1),
    ('CREDIT_CARD', 'Credit Card', true, 2),
    ('ACH', 'ACH/Wire Transfer', true, 3),
    ('CASH', 'Cash', true, 4),
    ('MONEY_ORDER', 'Money Order', true, 5),
    ('STORE_CREDIT', 'Store Credit', true, 6),
    ('STRIPE_ONLINE', 'Stripe Online Payment', true, 7),
    ('PAYPAL', 'PayPal', true, 8),
    ('OTHER', 'Other', true, 99)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ref_payment_terms_active ON ref_payment_terms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ref_payment_terms_sort ON ref_payment_terms(sort_order);

CREATE INDEX IF NOT EXISTS idx_ref_ship_methods_active ON ref_ship_methods(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ref_ship_methods_carrier ON ref_ship_methods(carrier);
CREATE INDEX IF NOT EXISTS idx_ref_ship_methods_sort ON ref_ship_methods(sort_order);

CREATE INDEX IF NOT EXISTS idx_ref_payment_types_active ON ref_payment_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ref_payment_types_sort ON ref_payment_types(sort_order);

-- =====================================================
-- Trigger for updated_at timestamps
-- =====================================================
-- Trigger for ref_payment_terms
DROP TRIGGER IF EXISTS update_ref_payment_terms_updated_at ON ref_payment_terms;
CREATE TRIGGER update_ref_payment_terms_updated_at
    BEFORE UPDATE ON ref_payment_terms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ref_ship_methods
DROP TRIGGER IF EXISTS update_ref_ship_methods_updated_at ON ref_ship_methods;
CREATE TRIGGER update_ref_ship_methods_updated_at
    BEFORE UPDATE ON ref_ship_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ref_payment_types
DROP TRIGGER IF EXISTS update_ref_payment_types_updated_at ON ref_payment_types;
CREATE TRIGGER update_ref_payment_types_updated_at
    BEFORE UPDATE ON ref_payment_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE ref_payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_ship_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_payment_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to read reference data
DROP POLICY IF EXISTS "Allow authenticated users to view ref_payment_terms" ON ref_payment_terms;
CREATE POLICY "Allow authenticated users to view ref_payment_terms"
    ON ref_payment_terms FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to view ref_ship_methods" ON ref_ship_methods;
CREATE POLICY "Allow authenticated users to view ref_ship_methods"
    ON ref_ship_methods FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to view ref_payment_types" ON ref_payment_types;
CREATE POLICY "Allow authenticated users to view ref_payment_types"
    ON ref_payment_types FOR SELECT
    TO authenticated
    USING (true);

-- Allow anon users to read as well (for public forms if needed)
DROP POLICY IF EXISTS "Allow anon users to view ref_payment_terms" ON ref_payment_terms;
CREATE POLICY "Allow anon users to view ref_payment_terms"
    ON ref_payment_terms FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Allow anon users to view ref_ship_methods" ON ref_ship_methods;
CREATE POLICY "Allow anon users to view ref_ship_methods"
    ON ref_ship_methods FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Allow anon users to view ref_payment_types" ON ref_payment_types;
CREATE POLICY "Allow anon users to view ref_payment_types"
    ON ref_payment_types FOR SELECT
    TO anon
    USING (true);

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON TABLE ref_payment_terms IS 'Reference table for invoice payment terms (Net 30, COD, etc.)';
COMMENT ON TABLE ref_ship_methods IS 'Reference table for shipping methods and carriers';
COMMENT ON TABLE ref_payment_types IS 'Reference table for payment types used when recording payments';

COMMENT ON COLUMN ref_payment_terms.code IS 'Short code for the term (e.g., NET30, COD)';
COMMENT ON COLUMN ref_payment_terms.description IS 'Display description (e.g., Net 30 Days)';
COMMENT ON COLUMN ref_payment_terms.days_until_due IS 'Number of days until payment is due';

COMMENT ON COLUMN ref_ship_methods.code IS 'Unique code for the shipping method';
COMMENT ON COLUMN ref_ship_methods.description IS 'Display name for the shipping method';
COMMENT ON COLUMN ref_ship_methods.carrier IS 'Carrier category: UPS, FedEx, USPS, Freight, Pickup, Local';

COMMENT ON COLUMN ref_payment_types.code IS 'Unique code for the payment type';
COMMENT ON COLUMN ref_payment_types.description IS 'Display name for the payment type';
