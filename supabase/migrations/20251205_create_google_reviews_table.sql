-- Create table for storing Google Maps reviews scraped via Apify
-- Reviews are linked to prospects via google_places_id

CREATE TABLE IF NOT EXISTS public.prospect_google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to prospector table
  google_places_id TEXT NOT NULL,
  prospect_website TEXT,

  -- Review data from Apify
  review_id TEXT,
  reviewer_name TEXT,
  reviewer_url TEXT,
  reviewer_photo_url TEXT,
  reviewer_reviews_count INTEGER,

  -- Review content
  review_text TEXT,
  review_rating INTEGER CHECK (review_rating >= 1 AND review_rating <= 5),
  review_published_at TIMESTAMPTZ,
  review_response_text TEXT,
  review_response_at TIMESTAMPTZ,

  -- Review metadata
  review_likes_count INTEGER DEFAULT 0,
  review_is_local_guide BOOLEAN DEFAULT FALSE,
  review_url TEXT,

  -- Scrape metadata
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_review_per_place UNIQUE (google_places_id, review_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_google_reviews_places_id
  ON public.prospect_google_reviews(google_places_id);

CREATE INDEX IF NOT EXISTS idx_google_reviews_prospect_website
  ON public.prospect_google_reviews(prospect_website);

CREATE INDEX IF NOT EXISTS idx_google_reviews_published_at
  ON public.prospect_google_reviews(review_published_at DESC);

CREATE INDEX IF NOT EXISTS idx_google_reviews_rating
  ON public.prospect_google_reviews(review_rating);

-- Create table for storing AI analysis of reviews
CREATE TABLE IF NOT EXISTS public.prospect_review_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to prospector
  google_places_id TEXT NOT NULL UNIQUE,
  prospect_website TEXT,

  -- Analysis metadata
  reviews_analyzed_count INTEGER DEFAULT 0,
  analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Extracted intelligence (from Anthropic Opus)
  owner_names JSONB, -- Array of detected owner/key person names
  standout_stories JSONB, -- Array of exceptional customer stories
  reputation_themes JSONB, -- Ranked themes customers praise
  quotable_phrases JSONB, -- Short punchy quotes for conversations
  business_intel JSONB, -- Clues about specialties, side businesses, etc.
  suggested_icebreakers JSONB, -- Natural opening lines for calls

  -- Full markdown analysis
  full_analysis_markdown TEXT,

  -- Status tracking
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'complete', 'error', 'no_reviews')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for querying analysis
CREATE INDEX IF NOT EXISTS idx_review_analysis_places_id
  ON public.prospect_review_analysis(google_places_id);

CREATE INDEX IF NOT EXISTS idx_review_analysis_prospect_website
  ON public.prospect_review_analysis(prospect_website);

CREATE INDEX IF NOT EXISTS idx_review_analysis_status
  ON public.prospect_review_analysis(analysis_status);

-- Add columns to prospector table for review intelligence
ALTER TABLE public.prospector
  ADD COLUMN IF NOT EXISTS google_reviews_last_scraped TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_reviews_analysis_status TEXT DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS google_reviews_count_scraped INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_review_summary TEXT,
  ADD COLUMN IF NOT EXISTS google_review_summary_updated_at TIMESTAMPTZ;

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_google_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prospect_google_reviews_updated_at
  BEFORE UPDATE ON public.prospect_google_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_google_reviews_updated_at();

CREATE TRIGGER update_prospect_review_analysis_updated_at
  BEFORE UPDATE ON public.prospect_review_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_google_reviews_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.prospect_google_reviews IS 'Google Maps reviews scraped via Apify for prospect intelligence';
COMMENT ON TABLE public.prospect_review_analysis IS 'AI-generated analysis of Google reviews using Anthropic Opus';
COMMENT ON COLUMN public.prospector.google_reviews_last_scraped IS 'Timestamp of last Apify review scrape';
COMMENT ON COLUMN public.prospector.google_reviews_analysis_status IS 'Status of review analysis: idle|scraping|analyzing|complete|error';
COMMENT ON COLUMN public.prospector.google_reviews_count_scraped IS 'Number of reviews scraped from Google Maps';
COMMENT ON COLUMN public.prospector.google_review_summary IS 'AI-generated markdown summary of Google reviews for sales intelligence';
COMMENT ON COLUMN public.prospector.google_review_summary_updated_at IS 'Timestamp when the review summary was last updated';

-- Enable RLS
ALTER TABLE public.prospect_google_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_review_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated read access to google reviews"
  ON public.prospect_google_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access to google reviews"
  ON public.prospect_google_reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read access to review analysis"
  ON public.prospect_review_analysis
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access to review analysis"
  ON public.prospect_review_analysis
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
