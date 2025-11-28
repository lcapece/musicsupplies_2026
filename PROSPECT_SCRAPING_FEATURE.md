# Prospect Website Scraping Feature

## Overview
This feature adds automated website intelligence gathering to the CRM Prospects system. It uses Bright Data's web scraping API to extract business information from prospect websites.

## What Was Built

### 1. Database Changes
**File:** `supabase/migrations/add_prospect_scraping_fields.sql`

Added three new columns to the `prospects` table:
- `scraped_data` (JSONB) - Stores structured intel about the business
- `last_scrape_date` (TIMESTAMPTZ) - When the site was last scraped
- `scrape_status` (VARCHAR) - Status: 'not_scraped', 'scraping', 'completed', 'failed'

### 2. Edge Function
**File:** `supabase/functions/scrape-prospect-website/index.ts`

Serverless function that:
- Accepts a website URL and prospect ID
- Calls Bright Data Web Scraper API
- Parses the HTML to extract business intelligence
- Stores structured data in the database

### 3. UI Updates
**File:** `src/components/ProspectModal.tsx`

Added to the Prospect detail view:
- **"Scrape Website" button** with globe icon
- **Scraping status indicator** 
- **Display of scraped data**
- **Re-scrape capability**

## Deployment Instructions

Run the automated deployment script:
```bash
node deploy-prospect-scraping.mjs
```

## Intelligence Gathered

The system automatically detects:

**Music Brands (30+):**
- Keyboards: Yamaha, Roland, Korg, Casio, Kawai
- Guitars: Fender, Gibson, Ibanez, Martin, Taylor
- Drums: Ludwig, Pearl, Mapex, DW, Tama, Remo
- Pro Audio: Shure, Sennheiser, Behringer, Mackie
- Synthesizers: Moog, Arturia, Novation, Native Instruments
- Strings: D'addario, Ernie Ball
- Cymbals: Zildjian, Sabian, Paiste
- Effects: Boss, TC Electronic, Electro-Harmonix, Dunlop

**Business Types:**
- Music Store
- Online Retailer
- School/Academy
- Manufacturer
- Distributor
- Repair Shop
- Recording Studio

**Product Categories:**
- Guitars
- Keyboards/Pianos
- Drums/Percussion
- Pro Audio
- DJ/Lighting
- Lessons/Education

**Contact Information:**
- Email addresses
- Phone numbers
- Social media presence (Facebook, Instagram, YouTube)

## Usage

1. Go to Prospects page (`/prospects`)
2. Click any prospect with a website URL
3. Click "Scrape Website" button in the modal
4. Wait 5-15 seconds for results
5. View extracted business intelligence

## Data Structure

```json
{
  "url": "https://example.com",
  "scraped_at": "2025-01-09T20:00:00Z",
  "brands": ["Yamaha", "Roland", "Fender"],
  "business_type": "Music Store",
  "observations": [
    "Carries 3 brands: Yamaha, Roland, Fender",
    "Business type: Music Store",
    "Sells guitars",
    "Sells keyboards/pianos"
  ],
  "contact_info": {
    "email": "info@example.com",
    "phone": "(555) 123-4567"
  },
  "social_media": {
    "facebook": true,
    "instagram": true
  }
}
```

## Environment Requirements

**Supabase Edge Function Secret:**
```
BRIGHT_DATA_API_KEY=7bb146e7-335b-43bd-809f-884bed2c222c
```

## Next Steps

After deployment:
1. Test on a few prospects with websites
2. Review the quality of extracted data
3. Adjust parsing logic if needed
4. Use the intelligence for sales targeting
