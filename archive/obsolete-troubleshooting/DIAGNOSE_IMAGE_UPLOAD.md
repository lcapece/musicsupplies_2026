# Image Upload Diagnostic Guide

## Current Issue
Image upload from Windows local machine to Supabase s3-staging bucket is failing.

## Upload Flow (2-Step Process)
1. **Step 1**: Upload file from browser → Supabase Storage bucket `s3-staging`
2. **Step 2**: Transfer file from Supabase Storage → AWS S3 bucket `mus86077`

## Common Issues & Solutions

### Issue 1: s3-staging Bucket Doesn't Exist
**Symptom**: Error "Bucket not found" or "The resource was not found"

**Solution**: Create the bucket in Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/storage/buckets
2. Click "New bucket"
3. Name: `s3-staging`
4. Make it **PUBLIC** (check the public checkbox)
5. Click "Create bucket"

### Issue 2: Bucket Exists But Upload Fails (RLS Policies)
**Symptom**: Error "new row violates row-level security policy"

**Solution**: Run the SQL policy fix
1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql/new
2. Copy and paste the content from `scripts/fix-s3-staging-policies.sql`
3. Click "Run"

The SQL will:
- Drop any existing conflicting policies
- Create public upload policy (allows anyone to upload)
- Create public read policy (allows anyone to read)
- Create service role policy (allows Edge Function to access)
- Ensure bucket is marked as public

### Issue 3: Edge Function Not Deployed
**Symptom**: Step 1 succeeds, but Step 2 fails with "Function not found"

**Solution**: Deploy the transfer function
```bash
supabase functions deploy transfer-to-s3 --project-ref ekklokrukxmqlahtonnc
```

### Issue 4: AWS Credentials Not Set
**Symptom**: Step 2 fails with "AWS credentials not configured"

**Solution**: Set AWS secrets in Supabase
1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions
2. Add these secrets:
   - `AWS_ACCESS_KEY`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - `AWS_REGION`: us-east-1

### Issue 5: CORS Issues (Browser Blocking)
**Symptom**: Network error, CORS policy error in browser console

**Solution**: Already handled by using Supabase Storage (no CORS issues)
- Supabase Storage doesn't have CORS restrictions for authenticated users
- The Edge Function handles the S3 upload server-side (no CORS)

## Testing Steps

### Test 1: Check if bucket exists
1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/storage/buckets
2. Look for `s3-staging` bucket
3. If missing, create it (see Issue 1 solution)

### Test 2: Test upload manually
1. In Supabase Dashboard, go to Storage > s3-staging bucket
2. Try uploading a test image manually
3. If it fails, run the SQL policy fix (see Issue 2 solution)

### Test 3: Test from Manager Page
1. Open your app in browser
2. Go to Manager > Products tab
3. Click on any product row
4. Click "Upload Image" button
5. Select an image file
6. Watch browser console for errors

### Test 4: Check Edge Function logs
1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/functions/transfer-to-s3/logs
2. Look for recent invocations and any errors

## Quick Fix Script

Run this in Supabase SQL Editor to fix all policies at once:

```sql
-- Fix RLS policies for s3-staging bucket
DROP POLICY IF EXISTS "Allow authenticated uploads to s3-staging" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from s3-staging" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role full access to s3-staging" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to s3-staging" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from s3-staging" ON storage.objects;

-- Allow anyone to upload to s3-staging (since bucket is public)
CREATE POLICY "Allow public uploads to s3-staging"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 's3-staging');

-- Allow anyone to read from s3-staging
CREATE POLICY "Allow public reads from s3-staging"
ON storage.objects FOR SELECT
USING (bucket_id = 's3-staging');

-- Allow service role full access (for Edge Function)
CREATE POLICY "Allow service role full access to s3-staging"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 's3-staging');

-- Make sure the bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 's3-staging';
```

## What to Tell Me

To help diagnose your specific issue, please provide:

1. **Exact error message** from browser console
2. **Which step fails**: 
   - Step 1 (upload to Supabase Storage)?
   - Step 2 (transfer to S3)?
3. **Browser console screenshot** showing the error
4. **Does the s3-staging bucket exist?** Check in Supabase Dashboard
5. **Have you run the SQL policy fix?** (scripts/fix-s3-staging-policies.sql)

## Expected Success Flow

When working correctly, you should see:
1. Browser console: "Step 1: Uploading to Supabase Storage bucket: s3-staging"
2. Browser console: "Step 1 complete: File uploaded to Supabase Storage"
3. Browser console: "Step 2: Transferring to S3..."
4. Browser console: "Step 2 complete: File transferred to S3"
5. Alert: "Image uploaded successfully to S3!"
6. Image appears in the product details panel