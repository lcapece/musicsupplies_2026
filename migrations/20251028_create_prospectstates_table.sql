-- Create prospectstates table for managing sales territories
-- This table stores states/provinces for US, Canada, and Mexico with assigned salespeople

CREATE TABLE IF NOT EXISTS public.prospectstates (
    country_code VARCHAR(2) NOT NULL,
    state_abbr VARCHAR(2) NOT NULL PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    salesman_assigned TEXT,
    last_change TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prospectstates_country_code ON public.prospectstates(country_code);
CREATE INDEX IF NOT EXISTS idx_prospectstates_salesman ON public.prospectstates(salesman_assigned);
CREATE INDEX IF NOT EXISTS idx_prospectstates_last_change ON public.prospectstates(last_change);

-- Add comments for documentation
COMMENT ON TABLE public.prospectstates IS 'Sales territory management table storing states/provinces for US, Canada, and Mexico';
COMMENT ON COLUMN public.prospectstates.country_code IS '2-letter ISO country code (US, CA, MX)';
COMMENT ON COLUMN public.prospectstates.state_abbr IS '2-letter state/province abbreviation (Primary Key)';
COMMENT ON COLUMN public.prospectstates.state_name IS 'Full name of the state or province';
COMMENT ON COLUMN public.prospectstates.salesman_assigned IS 'Name or ID of assigned salesperson';
COMMENT ON COLUMN public.prospectstates.last_change IS 'Timestamp of last modification';

-- Insert United States data (50 states + DC)
INSERT INTO public.prospectstates (country_code, state_abbr, state_name, salesman_assigned) VALUES
('US', 'AL', 'Alabama', NULL),
('US', 'AK', 'Alaska', NULL),
('US', 'AZ', 'Arizona', NULL),
('US', 'AR', 'Arkansas', NULL),
('US', 'CA', 'California', NULL),
('US', 'CO', 'Colorado', NULL),
('US', 'CT', 'Connecticut', NULL),
('US', 'DE', 'Delaware', NULL),
('US', 'DC', 'District of Columbia', NULL),
('US', 'FL', 'Florida', NULL),
('US', 'GA', 'Georgia', NULL),
('US', 'HI', 'Hawaii', NULL),
('US', 'ID', 'Idaho', NULL),
('US', 'IL', 'Illinois', NULL),
('US', 'IN', 'Indiana', NULL),
('US', 'IA', 'Iowa', NULL),
('US', 'KS', 'Kansas', NULL),
('US', 'KY', 'Kentucky', NULL),
('US', 'LA', 'Louisiana', NULL),
('US', 'ME', 'Maine', NULL),
('US', 'MD', 'Maryland', NULL),
('US', 'MA', 'Massachusetts', NULL),
('US', 'MI', 'Michigan', NULL),
('US', 'MN', 'Minnesota', NULL),
('US', 'MS', 'Mississippi', NULL),
('US', 'MO', 'Missouri', NULL),
('US', 'MT', 'Montana', NULL),
('US', 'NE', 'Nebraska', NULL),
('US', 'NV', 'Nevada', NULL),
('US', 'NH', 'New Hampshire', NULL),
('US', 'NJ', 'New Jersey', NULL),
('US', 'NM', 'New Mexico', NULL),
('US', 'NY', 'New York', NULL),
('US', 'NC', 'North Carolina', NULL),
('US', 'ND', 'North Dakota', NULL),
('US', 'OH', 'Ohio', NULL),
('US', 'OK', 'Oklahoma', NULL),
('US', 'OR', 'Oregon', NULL),
('US', 'PA', 'Pennsylvania', NULL),
('US', 'RI', 'Rhode Island', NULL),
('US', 'SC', 'South Carolina', NULL),
('US', 'SD', 'South Dakota', NULL),
('US', 'TN', 'Tennessee', NULL),
('US', 'TX', 'Texas', NULL),
('US', 'UT', 'Utah', NULL),
('US', 'VT', 'Vermont', NULL),
('US', 'VA', 'Virginia', NULL),
('US', 'WA', 'Washington', NULL),
('US', 'WV', 'West Virginia', NULL),
('US', 'WI', 'Wisconsin', NULL),
('US', 'WY', 'Wyoming', NULL);

-- Insert Canadian provinces and territories (13 total)
-- Note: Some abbreviations may conflict with US states, but US takes priority per requirements
INSERT INTO public.prospectstates (country_code, state_abbr, state_name, salesman_assigned) VALUES
('CA', 'AB', 'Alberta', NULL),
('CA', 'BC', 'British Columbia', NULL),
('CA', 'MB', 'Manitoba', NULL),
('CA', 'NB', 'New Brunswick', NULL),
('CA', 'NL', 'Newfoundland and Labrador', NULL),
('CA', 'NT', 'Northwest Territories', NULL),
('CA', 'NS', 'Nova Scotia', NULL),
('CA', 'NU', 'Nunavut', NULL),
('CA', 'ON', 'Ontario', NULL),
('CA', 'PE', 'Prince Edward Island', NULL),
('CA', 'QC', 'Quebec', NULL),
('CA', 'SK', 'Saskatchewan', NULL),
('CA', 'YT', 'Yukon', NULL);

-- Insert Mexican states (32 states)
-- Using standard Mexican state abbreviations
INSERT INTO public.prospectstates (country_code, state_abbr, state_name, salesman_assigned) VALUES
('MX', 'AG', 'Aguascalientes', NULL),
('MX', 'BJ', 'Baja California', NULL),
('MX', 'BS', 'Baja California Sur', NULL),
('MX', 'CM', 'Campeche', NULL),
('MX', 'CS', 'Chiapas', NULL),
('MX', 'CH', 'Chihuahua', NULL),
('MX', 'CL', 'Coahuila', NULL),
('MX', 'CR', 'Colima', NULL),
('MX', 'DF', 'Mexico City', NULL),
('MX', 'DG', 'Durango', NULL),
('MX', 'GT', 'Guanajuato', NULL),
('MX', 'GR', 'Guerrero', NULL),
('MX', 'HG', 'Hidalgo', NULL),
('MX', 'JA', 'Jalisco', NULL),
('MX', 'EM', 'Estado de Mexico', NULL),
('MX', 'MH', 'Michoacan', NULL),
('MX', 'MR', 'Morelos', NULL),
('MX', 'NA', 'Nayarit', NULL),
('MX', 'NL', 'Nuevo Leon', NULL),
('MX', 'OA', 'Oaxaca', NULL),
('MX', 'PU', 'Puebla', NULL),
('MX', 'QT', 'Queretaro', NULL),
('MX', 'QR', 'Quintana Roo', NULL),
('MX', 'SL', 'San Luis Potosi', NULL),
('MX', 'SI', 'Sinaloa', NULL),
('MX', 'SO', 'Sonora', NULL),
('MX', 'TB', 'Tabasco', NULL),
('MX', 'TM', 'Tamaulipas', NULL),
('MX', 'TL', 'Tlaxcala', NULL),
('MX', 'VE', 'Veracruz', NULL),
('MX', 'YU', 'Yucatan', NULL),
('MX', 'ZA', 'Zacatecas', NULL);

-- Handle potential conflicts by ensuring US states take priority
-- This is handled by the INSERT order and ON CONFLICT clause if needed
-- Since we're using INSERT without ON CONFLICT, duplicates will cause errors
-- which is desired behavior to identify conflicts

-- Add RLS (Row Level Security) if needed
-- ALTER TABLE public.prospectstates ENABLE ROW LEVEL SECURITY;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospectstates TO authenticated;
GRANT SELECT ON public.prospectstates TO anon;

-- Create a function to update last_change timestamp
CREATE OR REPLACE FUNCTION update_prospectstates_last_change()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_change = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_change on updates
CREATE TRIGGER trigger_update_prospectstates_last_change
    BEFORE UPDATE ON public.prospectstates
    FOR EACH ROW
    EXECUTE FUNCTION update_prospectstates_last_change();