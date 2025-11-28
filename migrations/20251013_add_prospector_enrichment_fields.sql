-- Add enrichment fields to single-table 'prospector'
-- Safe to run multiple times (IF NOT EXISTS guards)

ALTER TABLE IF EXISTS public.prospector
  ADD COLUMN IF NOT EXISTS homepage_screenshot_url text,
  ADD COLUMN IF NOT EXISTS intelligence_status text DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS last_intelligence_gather timestamptz,
  ADD COLUMN IF NOT EXISTS tavily_research_data jsonb,
  ADD COLUMN IF NOT EXISTS ai_markdown text,
  ADD COLUMN IF NOT EXISTS icebreakers text;

-- Optional: constrain intelligence_status to known states (commented to avoid error on older PG)
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1
--     FROM pg_constraint
--     WHERE conname = 'prospector_intelligence_status_check'
--   ) THEN
--     ALTER TABLE public.prospector
--       ADD CONSTRAINT prospector_intelligence_status_check
--       CHECK (intelligence_status IN ('idle','capturing','researching','generating','complete','error'));
--   END IF;
-- END $$;

COMMENT ON COLUMN public.prospector.homepage_screenshot_url IS 'Public URL for homepage screenshot (APIFlash upload)';
COMMENT ON COLUMN public.prospector.intelligence_status IS 'idle|capturing|researching|generating|complete|error';
COMMENT ON COLUMN public.prospector.last_intelligence_gather IS 'Timestamp of last successful enrichment';
COMMENT ON COLUMN public.prospector.tavily_research_data IS 'Raw Tavily research JSON';
COMMENT ON COLUMN public.prospector.ai_markdown IS 'Final sales-ready Markdown analysis';
COMMENT ON COLUMN public.prospector.icebreakers IS 'Short icebreakers (newline-separated or JSON array)';
