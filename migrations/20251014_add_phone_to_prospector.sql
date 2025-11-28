-- Add phone column to single-table 'prospector' so enrichment can persist discovered phones
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE IF EXISTS public.prospector
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.prospector.phone IS 'Primary phone number for the business (normalized as ###-###-#### when possible)';
