# Image Upload - 4 Hour Troubleshooting Session Summary

## The Problem
User trying to upload images from Windows local machine to AWS S3 bucket `mus86077` through a Netlify-hosted React app.

## Root Causes Discovered

### 1. **Supabase Storage Bucket Issues**
- Bucket `s3-staging` existed but had RLS disabled
- No proper upload policies configured
- **FIXED**: Ran SQL to enable public uploads and create policies

### 2. **Non-Existent Edge Function**
- Code referenced `transfer-to-s3` Edge Function that didn't exist
- **ATTEMPTED FIX**: Created new Edge Function `get-s3-upload-url`

### 3. **Netlify Hosting Limitation**
- Netlify is static hosting - no backend/server-side code
- Cannot run server-side file transfers
- **SOLUTION**: Direct browser-to-S3 upload using pre-signed URLs

### 4. **CORS Issues (ONGOING)**
- Edge Function deployed but CORS preflight failing
- Error: "Response to preflight request doesn't pass access control check"
- **ATTEMPTED FIXES**:
  - Updated CORS headers in Edge Function
  - Added `Access-Control-Allow-Methods`
  - Changed OPTIONS response to 204 status
  - Re-enabled Vite proxy to bypass CORS

## What Was Implemented

### 1. SQL Fix for s3-staging Bucket
**File**: `FIX_S3_STAGING_NOW.sql`
- Makes bucket public
- Creates upload/read/update policies
- Allows service role full access

### 2. New Edge Function
**File**: `supabase/functions/get-s3-upload-url/index.ts`
- Generates pre-signed S3 URLs
- Uses AWS SDK S3Client
- 5-minute expiration on URLs
- **STATUS**: Deployed but CORS failing

### 3. Updated Upload Code
**File**: `src/pages/ManagerPage.tsx:1688-1751`
- Step 1: Get pre-signed URL from Edge Function
- Step 2: Upload directly to S3 using fetch()
- Step 3: Update database with filename
- **STATUS**: Code ready, waiting for CORS fix

### 4. Environment Configuration
**File**: `.env.local`
- Toggled `VITE_SUPABASE_FUNCTIONS_URL` multiple times
- Currently set to `/supabase-fn` (proxy mode)

## Current Status: BLOCKED

### The Blocker
Edge Function `get-s3-upload-url` is deployed but returning non-OK status on OPTIONS preflight request, causing CORS failure.

### Error Message
```
Access to fetch at 'https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/get-s3-upload-url' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

## Possible Solutions to Try

### Option 1: Fix Edge Function CORS (Recommended)
The Edge Function needs to properly handle OPTIONS requests. Current code:
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { 
    status: 204,
    headers: corsHeaders 
  })
}
```

**Try**:
1. Check Edge Function logs in Supabase Dashboard
2. Verify function is actually deployed (not cached old version)
3. Test function directly with curl/Postman
4. Check if JWT verification is blocking OPTIONS

### Option 2: Use Netlify Functions Instead
Since you're on Netlify, create a Netlify Function instead:
```javascript
// netlify/functions/get-s3-upload-url.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

exports.handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Generate pre-signed URL logic here
  // ...
};
```

### Option 3: Direct AWS SDK in Browser (Not Recommended)
Use AWS SDK directly in browser with temporary credentials from AWS STS. Security risk - exposes AWS credentials.

### Option 4: Keep Using Supabase Storage
Forget AWS S3 entirely. Just upload to Supabase Storage `s3-staging` bucket and leave files there. Simpler, works now.

## Files Modified

1. `src/pages/ManagerPage.tsx` - Upload logic
2. `supabase/functions/get-s3-upload-url/index.ts` - New Edge Function
3. `.env.local` - Proxy configuration
4. `FIX_S3_STAGING_NOW.sql` - Bucket policies
5. `scripts/fix-s3-staging-policies.sql` - Bucket policies
6. `DIAGNOSE_IMAGE_UPLOAD.md` - Diagnostic guide

## Time Spent
- Initial diagnosis: 1 hour
- Supabase Storage setup: 30 minutes
- Edge Function creation: 1 hour
- CORS troubleshooting: 1.5 hours
- **Total**: ~4 hours

## Recommendation

**SIMPLEST SOLUTION**: Use Supabase Storage instead of AWS S3.

The `s3-staging` bucket is already configured and working. Images upload successfully. Just change the image display URL from:
```typescript
const imageUrl = `https://mus86077.s3.amazonaws.com/${fileName}`;
```

To:
```typescript
const { data: urlData } = supabase.storage.from('s3-staging').getPublicUrl(fileName);
const imageUrl = urlData.publicUrl;
```

This avoids all the CORS/Edge Function complexity and works immediately.

## Next Steps

1. **If continuing with S3**: Debug why Edge Function OPTIONS returns non-OK status
2. **If switching to Supabase Storage**: Update image URL generation code
3. **If using Netlify Functions**: Create Netlify Function for pre-signed URLs

The code is 95% complete. The only blocker is the CORS preflight response from the Edge Function.