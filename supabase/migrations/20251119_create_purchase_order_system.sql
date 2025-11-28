-- Purchase Order System Migration
-- Creates tables for managing purchase orders with vendors

-- Product LCMD (Last Cost, Min, Max, Description) table
CREATE TABLE IF NOT EXISTS product_lcmd (
  part_number TEXT PRIMARY KEY,
  vendor_part_number TEXT,
  description TEXT NOT NULL,
  vendor_name TEXT,
  unit_cost DECIMAL(10,2),
  min_qty INTEGER DEFAULT 0,
  max_qty INTEGER DEFAULT 0,
  current_inventory INTEGER DEFAULT 0,
  last_ordered_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PO Headers table
CREATE TABLE IF NOT EXISTS po_headers (
  po_number SERIAL PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  vendor_order_number TEXT,
  po_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_date TIMESTAMPTZ,
  shipper TEXT,
  ordered_by TEXT NOT NULL,
  po_status TEXT NOT NULL CHECK (po_status IN ('Open', 'Closed', 'Cancelled', 'Pending')) DEFAULT 'Open',
  special_instructions TEXT,
  po_subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  freight DECIMAL(10,2) NOT NULL DEFAULT 0,
  taxes_duties DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_fees DECIMAL(10,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  last_emailed_to TEXT,
  last_emailed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set PO number sequence to start at 888000
SELECT setval(pg_get_serial_sequence('po_headers', 'po_number'), 888000, false);

-- PO Details table
CREATE TABLE IF NOT EXISTS po_details (
  po_detail_id SERIAL PRIMARY KEY,
  po_number INTEGER NOT NULL REFERENCES po_headers(po_number) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  lcmd_part_number TEXT,
  vendor TEXT,
  description TEXT NOT NULL,
  qty_ordered INTEGER NOT NULL,
  qty_current INTEGER NOT NULL DEFAULT 0,
  min_qty INTEGER NOT NULL DEFAULT 0,
  max_inventory INTEGER NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  extended_amount DECIMAL(12,2),
  qty_received INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(po_number, line_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_po_headers_vendor_id ON po_headers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_headers_po_status ON po_headers(po_status);
CREATE INDEX IF NOT EXISTS idx_po_headers_po_date ON po_headers(po_date);
CREATE INDEX IF NOT EXISTS idx_po_details_po_number ON po_details(po_number);
CREATE INDEX IF NOT EXISTS idx_po_details_lcmd_part_number ON po_details(lcmd_part_number);
CREATE INDEX IF NOT EXISTS idx_product_lcmd_vendor_name ON product_lcmd(vendor_name);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_lcmd_updated_at BEFORE UPDATE ON product_lcmd
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_headers_updated_at BEFORE UPDATE ON po_headers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_details_updated_at BEFORE UPDATE ON po_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (staff only)
ALTER TABLE product_lcmd ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_details ENABLE ROW LEVEL SECURITY;

-- Allow staff users to manage purchase orders
CREATE POLICY "Staff can manage product_lcmd" ON product_lcmd
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff WHERE staff.username = current_user AND staff.is_active = true
    )
  );

CREATE POLICY "Staff can manage po_headers" ON po_headers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff WHERE staff.username = current_user AND staff.is_active = true
    )
  );

CREATE POLICY "Staff can manage po_details" ON po_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff WHERE staff.username = current_user AND staff.is_active = true
    )
  );
