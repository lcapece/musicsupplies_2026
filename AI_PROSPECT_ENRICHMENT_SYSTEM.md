# 🤖 AI-Powered Prospect Enrichment System

## Overview

This system revolutionizes prospect data collection by using artificial intelligence to automatically capture, analyze, and extract business intelligence from prospect websites. It combines **ApiFlash** for high-quality screenshot capture with **OpenAI's GPT-4 Vision** model for intelligent image analysis.

## 🎯 Key Features

### 1. **Automated Screenshot Capture**
- High-resolution (1920x1080) homepage screenshots
- Captured via ApiFlash API
- Cached URLs for quick access
- Visual reference for sales team

### 2. **AI-Powered Business Intelligence**
The system automatically extracts:

- **Business Description**: What the company does
- **Brands Sold**: 50+ music industry brands (Yamaha, Roland, Fender, Gibson, etc.)
- **Services Offered**: What services they provide
- **Contact Information**: Phone, email, physical address
- **Business Type**: Store, Online Retailer, School, Repair Shop, etc.
- **Key Facts**: Important business insights
- **Social Media Presence**: Facebook, Instagram, YouTube, LinkedIn
- **Technology Stack**: E-commerce platforms, payment processors
- **Confidence Score**: AI's confidence in the analysis (0-100%)

### 3. **Beautiful UI Display**
- Color-coded information cards
- Interactive screenshot with click-to-enlarge
- Confidence meter showing AI certainty
- Responsive design with smooth animations
- Emoji-enhanced sections for quick scanning

## 📊 System Architecture

```
User Action (Click "Enrich with AI")
    ↓
Frontend (ProspectModal.tsx)
    ↓
Edge Function (enrich-prospect-ai)
    ↓
┌─────────────┐         ┌──────────────┐
│  ApiFlash   │────→────│   OpenAI     │
│  Screenshot │         │   Vision API │
└─────────────┘         └──────────────┘
    ↓                         ↓
    └──────────┬──────────────┘
               ↓
        Supabase Database
        (prospects table)
               ↓
        Updated UI Display
```

## 🗄️ Database Schema

### New Fields in `prospects` Table:

```sql
screenshot_url TEXT           -- URL to captured homepage screenshot
scraped_data JSONB           -- AI-analyzed business intelligence
last_scrape_date TIMESTAMPTZ -- When analysis was performed
scrape_status VARCHAR        -- Status: 'not_scraped', 'scraping', 'completed', 'failed'
```

### Scraped Data Structure:

```json
{
  "screenshot_url": "https://...",
  "analysis": {
    "business_description": "Full-service music store...",
    "brands_sold": ["Yamaha", "Roland", "Fender", "Gibson"],
    "services_offered": ["Instrument Sales", "Repair Services", "Lessons"],
    "contact_info": {
      "phone": "(555) 123-4567",
      "email": "info@example.com",
      "address": "123 Main St, City, ST 12345"
    },
    "business_type": "Music Store",
    "key_facts": [
      "Family-owned for 30 years",
      "Largest selection in the region",
      "Offers financing options"
    ],
    "social_media": {
      "facebook": true,
      "instagram": true,
      "youtube": false,
      "linkedin": false
    },
    "technology_stack": ["Shopify", "Stripe"],
    "confidence_score": 0.92
  }
}
```

## 🚀 Deployment

### Prerequisites

1. **Supabase Account** with project access
2. **ApiFlash API Key**
   - Sign up at: https://apiflash.com/
   - Free tier: 100 screenshots/month
   - Paid plans available for higher volumes

3. **OpenAI API Key**
   - Get at: https://platform.openai.com/api-keys
   - Requires GPT-4 Vision access (gpt-4o model)
   - Cost: ~$0.01-0.03 per analysis

### Automated Deployment

```bash
node deploy-ai-enrichment.mjs
```

### Manual Deployment Steps

#### Step 1: Apply Database Migration

Run in Supabase SQL Editor:

```sql
-- Add screenshot_url column
ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prospects_screenshot 
ON prospects(screenshot_url) 
WHERE screenshot_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_scrape_status 
ON prospects(scrape_status) 
WHERE scrape_status IS NOT NULL;

-- Add view for enriched prospects
CREATE OR REPLACE VIEW enriched_prospects AS
SELECT 
  prospect_id,
  business_name,
  website,
  screenshot_url,
  scraped_data,
  last_scrape_date,
  scrape_status,
  scraped_data->'analysis'->>'business_type' as ai_business_type,
  scraped_data->'analysis'->'brands_sold' as ai_brands,
  scraped_data->'analysis'->>'confidence_score' as ai_confidence
FROM prospects
WHERE scraped_data IS NOT NULL
ORDER BY last_scrape_date DESC;
```

#### Step 2: Deploy Edge Function

**Option A: Via Supabase CLI**
```bash
npx supabase functions deploy enrich-prospect-ai --project-ref ekklokrukxmqlahtonnc
```

**Option B: Via Dashboard**
1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/functions
2. Click "Create Function"
3. Name: `enrich-prospect-ai`
4. Copy code from: `supabase/functions/enrich-prospect-ai/index.ts`
5. Click "Deploy"

#### Step 3: Configure Secrets

Set in Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
APIFLASH_KEY=your_apiflash_key_here
OPENAI_API_KEY=your_openai_key_here
```

Or via CLI:
```bash
npx supabase secrets set APIFLASH_KEY=your_apiflash_key_here
npx supabase secrets set OPENAI_API_KEY=your_openai_key_here
```

## 📱 How to Use

### For Sales Team

1. **Open Entity Search Modal**
   - Click "Search Entity" from dashboard
   - Or use the header search button

2. **Find a Prospect**
   - Search for prospect by name, city, or other criteria
   - Click on prospect ID to open ProspectModal

3. **Enrich with AI**
   - Click the purple "Enrich with AI" button
   - Wait 10-15 seconds for analysis
   - View enriched data in the modal

4. **Review Intelligence**
   - See screenshot of their homepage
   - Review detected brands
   - Check business type and services
   - View contact information
   - Note confidence score

5. **Use Intelligence for Sales**
   - Tailor pitch based on brands they carry
   - Reference specific services they offer
   - Use contact info for outreach
   - Understand their business type for approach

### For Administrators

**Monitor Enrichment Activity:**
```sql
SELECT 
  prospect_id,
  business_name,
  website,
  scrape_status,
  last_scrape_date,
  scraped_data->'analysis'->>'confidence_score' as confidence
FROM prospects
WHERE scrape_status IS NOT NULL
ORDER BY last_scrape_date DESC
LIMIT 50;
```

**View Top Enriched Prospects:**
```sql
SELECT * FROM enriched_prospects
WHERE ai_confidence::FLOAT > 0.8
ORDER BY last_scrape_date DESC;
```

**Check Enrichment Statistics:**
```sql
SELECT 
  scrape_status,
  COUNT(*) as count,
  AVG((scraped_data->'analysis'->>'confidence_score')::FLOAT) as avg_confidence
FROM prospects
WHERE scrape_status IS NOT NULL
GROUP BY scrape_status;
```

## 🎨 UI Components

### Main Sections in ProspectModal:

1. **Enrichment Button**
   - Purple gradient button
   - Shows loading state with spinner
   - Disabled if no website URL

2. **Confidence Score**
   - Green progress bar
   - Percentage display
   - Visual indicator of AI certainty

3. **Homepage Screenshot**
   - Full-width clickable image
   - Opens in new tab when clicked
   - Hover effects for interactivity

4. **Business Description**
   - Blue-themed card
   - Comprehensive business overview

5. **Business Type Badge**
   - Color-coded green badge
   - Prominent display

6. **Brands Sold**
   - Blue gradient chips
   - Count badge showing total
   - Horizontally scrollable

7. **Services Offered**
   - Purple chips
   - Clean layout

8. **Key Facts**
   - Bulleted list
   - Blue bullet points

9. **Contact Information**
   - Amber-themed card
   - Monospace font for data
   - Copyable fields

10. **Social Media**
    - Platform-specific colored badges
    - Icons for visual identification

11. **Technology Stack**
    - Gray chips
    - Tech platform identifiers

## 💡 Use Cases

### 1. **Competitive Analysis**
```
Prospect: "Joe's Music Shop"
AI Detected Brands: Yamaha, Roland, Fender
Your Brands: Yamaha, Roland, Fender, Gibson, Korg

→ Pitch: "We carry all the brands you do, PLUS Gibson and Korg"
```

### 2. **Targeted Outreach**
```
AI Analysis: "Family-owned since 1985, offers lessons and repairs"

→ Email: "Hi [Name], I noticed you've been serving musicians 
since 1985! As a family business ourselves, we'd love to 
partner on wholesale pricing for your repair and lesson programs..."
```

### 3. **Lead Qualification**
```
Confidence Score: 92%
Business Type: Music Store
Tech Stack: Shopify, Stripe
Social Media: All platforms active

→ Priority: HIGH - They're tech-savvy, active online, 
and ready for e-commerce partnerships
```

### 4. **Territory Planning**
```sql
-- Find prospects in specific region with high confidence
SELECT 
  business_name,
  city,
  state,
  scraped_data->'analysis'->'brands_sold' as brands,
  scraped_data->'analysis'->>'confidence_score' as confidence
FROM prospects
WHERE 
  state = 'CA'
  AND scraped_data->'analysis'->>'confidence_score'::FLOAT > 0.85
ORDER BY business_name;
```

## 🔧 Technical Details

### ApiFlash Configuration
- **Endpoint**: `https://api.apiflash.com/v1/urltoimage`
- **Format**: JPEG
- **Viewport**: 1920x1080
- **Full Page**: False (above-the-fold only)
- **Wait Until**: page_loaded
- **Country**: US

### OpenAI Configuration
- **Model**: `gpt-4o` (GPT-4 Optimized for Vision)
- **Max Tokens**: 1500
- **Temperature**: 0.3 (more deterministic)
- **System Prompt**: Specialized for music industry analysis

### Performance Metrics
- **Average Analysis Time**: 10-15 seconds
- **Screenshot Capture**: 2-3 seconds
- **AI Analysis**: 8-12 seconds
- **Database Update**: <500ms
- **UI Rendering**: <1 second

### Error Handling
The system gracefully handles:
- Network failures
- Invalid URLs
- Screenshot capture failures (continues with text analysis)
- OpenAI API limits
- Timeout scenarios (30-second max)
- Missing API keys (clear error messages)

## 🔒 Security & Privacy

- **API Keys**: Stored securely in Supabase Edge Function secrets
- **Data Encryption**: All data encrypted in transit and at rest
- **No PII Collection**: Only publicly available website information
- **Rate Limiting**: Prevents abuse of enrichment feature
- **Robots.txt Compliance**: Respects website crawling policies

## 📈 Cost Analysis

### Per Prospect Enrichment:
- **ApiFlash**: $0.001 - $0.005 per screenshot
- **OpenAI Vision**: $0.01 - $0.03 per analysis
- **Total**: ~$0.02 - $0.04 per prospect

### Monthly Estimates:
- 100 enrichments/month: $2-4
- 500 enrichments/month: $10-20
- 1000 enrichments/month: $20-40

### ROI Considerations:
- Time saved per prospect: 15-20 minutes of manual research
- Value of automated brand detection
- Improved lead qualification accuracy
- Better sales conversion rates

## 🐛 Troubleshooting

### Issue: "Website URL is required"
**Solution**: Ensure prospect has a website field populated

### Issue: Screenshot not displaying
**Possible Causes:**
1. Website blocks screenshot tools
2. ApiFlash rate limit reached
3. Invalid URL format

**Check**: Browser console for error messages

### Issue: Low confidence scores
**Causes:**
- Website has minimal text content
- Homepage is image-heavy
- Business uses splash page/redirect

**Note**: Still provides valuable screenshot reference

### Issue: Missing contact information
**Cause**: Contact info not visible on homepage

**Solution**: AI looks for contact pages in future enhancement

### Issue: "API keys not configured"
**Solution**: Set APIFLASH_KEY and OPENAI_API_KEY in Supabase secrets

## 🔮 Future Enhancements

Potential additions:

1. **Scheduled Re-enrichment**
   - Auto-update intel monthly
   - Track changes over time

2. **Bulk Enrichment**
   - Process multiple prospects at once
   - Background job queue

3. **Competitor Tracking**
   - Alert when competitor adds new brands
   - Price monitoring

4. **SEO Analysis**
   - Track search rankings
   - Keyword analysis

5. **Review Sentiment**
   - Analyze Google/Yelp reviews
   - Sentiment scoring

6. **Change Detection**
   - Alert when website changes
   - Track business updates

7. **Export Features**
   - PDF intelligence reports
   - Excel/CSV exports

8. **AI Summarization**
   - Executive summaries
   - Action items

## 📞 Support

### Common Questions

**Q: Can I re-enrich a prospect?**
A: Yes! Click "Enrich with AI" again to get fresh data

**Q: What if the website changed?**
A: Re-enrichment will capture current state

**Q: Does it work with non-English sites?**
A: GPT-4 Vision supports multiple languages

**Q: Can I edit AI-extracted data?**
A: Data is read-only from AI. Manual fields available separately

## 📝 Changelog

### Version 1.0 (January 2025)
- ✅ ApiFlash screenshot integration
- ✅ OpenAI Vision API analysis
- ✅ Enhanced brand detection (50+ brands)
- ✅ Beautiful UI with confidence scoring
- ✅ Database schema optimization
- ✅ Comprehensive documentation

---

**Built with:**
- 🔥 ApiFlash Screenshot API
- 🤖 OpenAI GPT-4 Vision
- ⚡ Supabase Edge Functions
- ⚛️ React/TypeScript
- 🎨 TailwindCSS

**For questions or support, contact the development team.**