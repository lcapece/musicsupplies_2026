# Deploy Scrape Function - CORS Fix

## Issue
The `scrape-prospect-website` edge function has CORS errors preventing the "Gather Intel" button from working.

## Solution
The edge function code already has proper CORS headers, but it needs to be redeployed to Supabase.

## Manual Deployment Steps

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/functions)

2. Click on the `scrape-prospect-website` function (or create it if it doesn't exist)

3. Copy the entire content from: `supabase/functions/scrape-prospect-website/index.ts`

4. Paste it into the function editor in the dashboard

5. Click "Deploy" button

6. Wait for deployment to complete (should take 1-2 minutes)

7. Test the "Gather Intel" button in the Prospect Modal

### Option 2: Via Supabase CLI (If you have it installed)

```bash
cd c:/Users/ryanh/rc10/musicsupplies_launch-prod
supabase functions deploy scrape-prospect-website
```

## What Was Fixed

The edge function already has proper CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

And handles OPTIONS preflight requests:
```typescript
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}
```

## After Deployment

1. Refresh your browser (clear cache if needed: Ctrl+Shift+R)
2. Open a prospect in the Prospect Modal
3. Click "Gather Intel" button
4. The function should now work without CORS errors

## Verification

Check browser console - you should no longer see:
- `Access to fetch at ... has been blocked by CORS policy`
- `ERR_FAILED` errors

Instead, you should see successful API calls or proper error messages from the scraping function.
