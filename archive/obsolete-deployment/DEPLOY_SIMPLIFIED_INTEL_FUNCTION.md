# Deploy Simplified Intel Gathering Function

## Overview

The new simplified intel gathering system uses:
1. **ApiFlash.com** - To capture website screenshots
2. **OpenAI GPT-4 Vision** - To analyze screenshots and extract business intelligence

This replaces the previous BrightData approach with a simpler, more reliable solution.

## Prerequisites

### 1. ApiFlash API Key
- **Already configured in the function**: `470934d4dd6545a68a43afd8ff6124e3`
- No additional setup needed

### 2. OpenAI API Key
- You need to add your OpenAI API key to Supabase Edge Function secrets
- Go to: [Supabase Edge Function Settings](https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions)
- Add secret: `OPENAI_API_KEY` with your OpenAI API key value

## Deployment Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to [Supabase Functions](https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/functions)

2. Click "Create a new function" or edit if `scrape-prospect-website-simple` already exists

3. Name the function: `scrape-prospect-website-simple`

4. Copy the entire content from: `supabase/functions/scrape-prospect-website-simple/index.ts`

5. Paste it into the function editor

6. Click "Deploy"

7. Wait for deployment (1-2 minutes)

### Option 2: Via Supabase CLI

```bash
# Navigate to project directory
cd c:/Users/ryanh/rc10/musicsupplies_launch-prod

# Deploy the function
supabase functions deploy scrape-prospect-website-simple

# Set the OpenAI API key secret
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

## How It Works

### Workflow

1. **User clicks "Gather Intel" button** in Prospect Modal
2. **ApiFlash captures screenshot** of the prospect's website
   - Full page screenshot
   - Scrolls through entire page
   - Extracts text content
   - Returns screenshot URL

3. **OpenAI GPT-4 Vision analyzes** the screenshot
   - Identifies business type
   - Detects music brands mentioned
   - Extracts contact information
   - Notes key observations
   - Provides structured analysis

4. **Results saved to database**
   - Stored in `prospects.scraped_data` field
   - Analysis text in `prospects.web_intelligence` field
   - Timestamp in `prospects.last_scrape_date`
   - Screenshot date in `prospects.website_screenshot_taken`

### What Gets Analyzed

The AI provides:
- **Business Type**: Music Store, Online Retailer, School, Studio, etc.
- **Products/Services**: What they offer
- **Music Brands**: Yamaha, Fender, Roland, Gibson, Shure, etc.
- **Key Observations**: Notable features, specializations
- **Contact Info**: Visible phone, email, social media
- **Geographic Focus**: Service areas, locations

## Testing

1. Open a prospect in the Prospect Modal
2. Ensure the prospect has a website URL
3. Click "Gather Intel" button
4. Wait 10-30 seconds for processing
5. Review the AI analysis in the Web Intelligence section

## Troubleshooting

### "OPENAI_API_KEY not set" Error
- Add the secret in Supabase dashboard or via CLI
- Redeploy the function after adding the secret

### "ApiFlash failed" Error
- Check if the website URL is valid
- Ensure the website is accessible (not blocked)
- Verify ApiFlash API key is correct in the function code

### "Failed to gather intelligence" Error
- Check Supabase function logs for details
- Go to: Functions > scrape-prospect-website-simple > Logs

### CORS Errors
- The function already has proper CORS headers
- Clear browser cache (Ctrl+Shift+R)
- Check if function is deployed successfully

## Cost Considerations

### ApiFlash
- 470934d4dd6545a68a43afd8ff6124e3 API key plan includes free tier
- Check usage at: https://apiflash.com/dashboard

### OpenAI GPT-4 Vision
- Approximately $0.01 - $0.03 per analysis
- Monitor usage in OpenAI dashboard
- Consider implementing rate limiting for high-volume usage

## Benefits Over Previous System

1. **Simpler**: Only 2 API calls instead of complex scraping
2. **More Reliable**: ApiFlash handles all browser rendering
3. **Better Analysis**: GPT-4 Vision provides intelligent insights
4. **Lower Maintenance**: No custom parsing logic needed
5. **Comprehensive**: Full-page screenshots with AI analysis

## Next Steps

After deployment:
1. Test with a few prospects
2. Review the quality of AI analysis
3. Adjust the AI prompt if needed (in function code)
4. Monitor costs and adjust usage as needed
