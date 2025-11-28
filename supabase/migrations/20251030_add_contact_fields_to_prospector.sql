-- Add email, facebook_page, and instagram_page fields to prospector table
-- These fields will be populated by the intelligence gathering Edge Function

ALTER TABLE prospector
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS facebook_page TEXT,
ADD COLUMN IF NOT EXISTS instagram_page TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prospector_email ON prospector(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospector_facebook ON prospector(facebook_page) WHERE facebook_page IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospector_instagram ON prospector(instagram_page) WHERE instagram_page IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN prospector.email IS 'Email address extracted from Tavily data or screenshot OCR';
COMMENT ON COLUMN prospector.facebook_page IS 'Facebook page URL extracted from Tavily data or screenshot OCR';
COMMENT ON COLUMN prospector.instagram_page IS 'Instagram page URL extracted from Tavily data or screenshot OCR';
