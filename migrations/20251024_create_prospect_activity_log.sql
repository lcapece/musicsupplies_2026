-- Create prospect activity log table
CREATE TABLE IF NOT EXISTS public.prospect_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_website TEXT NOT NULL REFERENCES public.prospector(website) ON DELETE CASCADE,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activity_type TEXT NOT NULL,
  comments TEXT,
  follow_up_date DATE,
  logged_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on prospect_website for fast lookups
CREATE INDEX IF NOT EXISTS idx_prospect_activity_log_website
  ON public.prospect_activity_log(prospect_website);

-- Create index on follow_up_date for finding upcoming follow-ups
CREATE INDEX IF NOT EXISTS idx_prospect_activity_log_follow_up
  ON public.prospect_activity_log(follow_up_date)
  WHERE follow_up_date IS NOT NULL;

-- Create index on activity_date for sorting
CREATE INDEX IF NOT EXISTS idx_prospect_activity_log_date
  ON public.prospect_activity_log(activity_date DESC);

-- Add RLS policies
ALTER TABLE public.prospect_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all activity logs
CREATE POLICY "Users can view prospect activity logs"
  ON public.prospect_activity_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own activity logs
CREATE POLICY "Users can insert prospect activity logs"
  ON public.prospect_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update their own activity logs
CREATE POLICY "Users can update prospect activity logs"
  ON public.prospect_activity_log
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Users can delete their own activity logs
CREATE POLICY "Users can delete prospect activity logs"
  ON public.prospect_activity_log
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prospect_activity_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prospect_activity_log_updated_at
  BEFORE UPDATE ON public.prospect_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_activity_log_updated_at();

-- Add phone number to prospector table if it doesn't exist
ALTER TABLE public.prospector ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add index on phone for searching
CREATE INDEX IF NOT EXISTS idx_prospector_phone
  ON public.prospector(phone)
  WHERE phone IS NOT NULL;
