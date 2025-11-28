# Edge Function Deployment Guide

## Deploying `fetch-phone-from-places` Function

This guide will help you deploy the `fetch-phone-from-places` Edge Function to your hosted Supabase instance.

---

## Quick Start (3 Steps)

### Step 1: Get Your Supabase Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Give it a name (e.g., "CLI Deploy Token")
4. Copy the token (you won't be able to see it again!)

### Step 2: Deploy the Function

**Option A: Using the Batch Script (Recommended for Windows)**

```bash
# Set your access token
set SUPABASE_ACCESS_TOKEN=your_token_here

# Run the deployment script
deploy-with-token.bat
```

**Option B: Using PowerShell Script**

```powershell
# Deploy with token as parameter
.\deploy-function-api.ps1 -AccessToken "your_token_here"

# OR set environment variable first
$env:SUPABASE_ACCESS_TOKEN = "your_token_here"
.\deploy-function-api.ps1
```

**Option C: Direct Command**

```bash
set SUPABASE_ACCESS_TOKEN=your_token_here
npx supabase functions deploy fetch-phone-from-places --project-ref ekklokrukxmqlahtonnc --no-verify-jwt
```

### Step 3: Set the Google Maps API Key Secret

After deployment, you need to set the Google Maps API key:

1. Go to https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions
2. Click on **"Edge Function Secrets"**
3. Add a new secret:
   - **Name**: `GOOGLE_MAPS_API_KEY`
   - **Value**: Your Google Maps API key

---

## Testing the Deployed Function

Once deployed, test your function:

```bash
curl -X POST https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/fetch-phone-from-places \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "business_name": "Test Business",
    "city": "New York",
    "state": "NY",
    "website": "https://example.com"
  }'
```

---

## Function Details

- **Function Name**: `fetch-phone-from-places`
- **Project Reference**: `ekklokrukxmqlahtonnc`
- **Function URL**: `https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/fetch-phone-from-places`
- **Method**: POST
- **Required Secrets**: `GOOGLE_MAPS_API_KEY`

---

## Required Parameters

The function expects a JSON payload with:

```json
{
  "business_name": "string",
  "city": "string",
  "state": "string",
  "website": "string"
}
```

---

## Troubleshooting

### Issue: "Access token not provided"
**Solution**: Make sure you've set the `SUPABASE_ACCESS_TOKEN` environment variable before running the deployment.

### Issue: "Google Maps API key not configured"
**Solution**: Set the `GOOGLE_MAPS_API_KEY` secret in the Supabase Dashboard (see Step 3 above).

### Issue: "No business found in Google Places"
**Solution**: Check that the business name, city, and state are correct and the business exists in Google Maps.

---

## Alternative Deployment Methods

### Using Supabase Dashboard (No CLI needed)

1. Go to https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/functions
2. Click **"Deploy a new function"** or **"Create function"**
3. Set the function name: `fetch-phone-from-places`
4. Copy and paste the code from `supabase/functions/fetch-phone-from-places/index.ts`
5. Click **"Deploy"**
6. Set the `GOOGLE_MAPS_API_KEY` secret

---

## Files Created

- `deploy-with-token.bat` - Simple batch script for deployment
- `deploy-function-api.ps1` - PowerShell script with error handling
- `deploy-phone-function.bat` - Original deployment script
- `DEPLOYMENT_GUIDE.md` - This guide

---

## Need Help?

- Supabase Documentation: https://supabase.com/docs/guides/functions
- Edge Functions Guide: https://supabase.com/docs/guides/functions/deploy
- Supabase Dashboard: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc
