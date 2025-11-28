# Image Upload S3 Fix - Complete

## Problem
The Manager page's image upload functionality was trying to upload to a non-existent Supabase Storage bucket named 'mus86077', causing "Bucket not found" errors. Images should be uploaded to AWS S3 bucket s3://mus86077 instead.

## Solution
Created a new Supabase Edge Function to handle direct uploads to AWS S3, and updated the Manager page to use it.

## Changes Made

### 1. Created New Edge Function: `upload-to-s3`
**File:** `supabase/functions/upload-to-s3/index.ts`

This Edge Function:
- Accepts file uploads via FormData
- Uses AWS SDK S3Client with PutObjectCommand
- Uploads directly to S3 bucket 'mus86077'
- Uses AWS credentials from Edge Function secrets (AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY)
- Returns success/error status

### 2. Updated Manager Page Image Upload
**File:** `src/pages/ManagerPage.tsx` (lines 1688-1722)

Changed `handleImageUpload` function from:
- ❌ `supabase.storage.from('mus86077').upload()` (Supabase Storage - doesn't exist)

To:
- ✅ `supabase.functions.invoke('upload-to-s3')` (Edge Function → AWS S3)

The function now:
1. Creates FormData with file and filename
2. Calls the Edge Function to upload to S3
3. Updates the database image field on success
4. Refreshes the image display with the S3 URL

## Testing Required
1. Deploy the new Edge Function: `supabase functions deploy upload-to-s3`
2. Ensure AWS credentials are set in Supabase Edge Function secrets
3. Test image upload on Manager page:
   - Click on a product row
   - Click "Upload Image" or "Replace Image"
   - Select an image file
   - Verify upload succeeds and image displays

## AWS Credentials Setup
The Edge Function requires these secrets to be set in Supabase:
- `AWS_ACCESS_KEY` - AWS access key with S3 write permissions
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key
- `AWS_REGION` - AWS region (defaults to 'us-east-1')

Set via Supabase CLI:
```bash
supabase secrets set AWS_ACCESS_KEY=your_key_here
supabase secrets set AWS_SECRET_ACCESS_KEY=your_secret_here
supabase secrets set AWS_REGION=us-east-1
```

## Related Files
- Edge Function: `supabase/functions/upload-to-s3/index.ts`
- Manager Page: `src/pages/ManagerPage.tsx`
- S3 Bucket: s3://mus86077 (AWS)

## Status
✅ Code changes complete
⏳ Awaiting deployment and testing