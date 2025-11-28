# Deploy Prospect Website Scraping Feature - Action Required

## ⚠️ IMMEDIATE ACTION NEEDED

You asked me to build a CRM system that scrapes prospect websites for intelligence gathering. The feature is **100% COMPLETE** but needs deployment.

## What Was Built (All Code Complete)

✅ **Database Migration** - Adds 3 columns to prospects table:
   - `scraped_data` (JSONB) - Structured intel
   - `last_scrape_date` (TIMESTAMPTZ)
   - `scrape_status` (VARCHAR)

✅ **Edge Function** - `scrape-prospect-website`
   - Calls Bright Data API
   - Parses HTML for music brands, business type, products
   - Stores structured data

✅ **UI Updates** - ProspectModal.tsx
   - "Scrape Website" button added
   - Status indicators
   - Data display panel

## Deployment Methods

### Method 1: Run Automated Script (RECOMMENDED)

```bash
node deploy-prospect-scraping.mjs
```

This will:
1. Apply the database migration
2. Deploy the edge function
3. Verify everything works

### Method 2: Manual Deployment

#### Step 1: Apply Database Migration
1. Go to Supabase Dashboard → SQL Editor
2. Copy/paste this SQL:

```sql
-- Add web scraping fields to prospects table
ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS scraped_data JSONB,
ADD COLUMN IF NOT EXISTS last_scrape_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scrape_status VARCHAR(50) DEFAULT 'not_scraped';

-- Create index for faster queries on scrape status
CREATE INDEX IF NOT EXISTS idx_prospects_scrape_status ON prospects(scrape_status);
CREATE INDEX IF NOT EXISTS idx_prospects_last_scrape_date ON prospects(last_scrape_date);

-- Add comment explaining the scraped_data structure
COMMENT ON COLUMN prospects.scraped_data IS 'Structured data from Bright Data web scraping: {brands: [], business_type: "", observations: "", scraped_at: ""}';
```

3. Click "Run"

#### Step 2: Deploy Edge Function
1. Go to Supabase Dashboard → Edge Functions
2. Click "Create new function"
3. Name it: `scrape-prospect-website`
4. Copy the contents from: `supabase/functions/scrape-prospect-website/index.ts`
5. Click "Deploy"

#### Step 3: Set Environment Variable
1. In Edge Functions, go to Settings
2. Add environment variable:
   - Name: `BRIGHT_DATA_API_KEY`
   - Value: `7bb146e7-335b-43bd-809f-884bed2c222c`
3. Save

## What It Does

When you click "Scrape Website" on a prospect:

**Detects:**
- 30+ music brands (Yamaha, Roland, Fender, Gibson, etc.)
- Business type (Music Store, School, Distributor, etc.)
- Product categories (Guitars, Keyboards, Drums, Pro Audio)
- Contact info (email, phone)
- Social media presence

**Output Example:**
```json
{
  "brands": ["Yamaha", "Roland", "Fender"],
  "business_type": "Music Store",
  "observations": [
    "Carries 3 brands: Yamaha, Roland, Fender",
    "Sells guitars",
    "Sells keyboards/pianos"
  ],
  "contact_info": {
    "email": "info@example.com",
    "phone": "(555) 123-4567"
  }
}
```

## Files Created

1. `supabase/migrations/add_prospect_scraping_fields.sql` - DB schema
2. `supabase/functions/scrape-prospect-website/index.ts` - Scraping logic
3. `src/components/ProspectModal.tsx` - UI (modified)
4. `deploy-prospect-scraping.mjs` - Deployment script
5. `PROSPECT_SCRAPING_FEATURE.md` - Full documentation
6. `DEPLOY_PROSPECT_SCRAPING_NOW.md` - This file

## Next Steps After Deployment

1. Go to `/prospects` page
2. Click on a prospect with a website URL
3. Click "Scrape Website" button
4. Wait 5-15 seconds
5. View the extracted intelligence
6. Use for sales targeting!

## Status

- ✅ Code Complete
- ⏳ Awaiting Deployment
- ⏳ Awaiting Testing

**Action Required:** Run `node deploy-prospect-scraping.mjs` or deploy manually using steps above.
