-- ============================================
-- FIX s3-staging BUCKET - RUN THIS NOW
-- ============================================
-- This fixes the s3-staging bucket that has RLS disabled
-- by creating the necessary policies for uploads

-- Step 1: Enable RLS on the bucket (required for policies to work)
-- Note: This is done at the storage.buckets level, not storage.objects

-- Step 2: Make the bucket public (easiest solution)
UPDATE storage.buckets 
SET public = true 
WHERE id = 's3-staging';

-- Step 3: Drop any existing conflicting policies
DROP POLICY IF EXISTS "Allow authenticated uploads to s3-staging" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from s3-staging" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role full access to s3-staging" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to s3-staging" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from s3-staging" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads to s3-staging" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon reads from s3-staging" ON storage.objects;

-- Step 4: Create policies that work with public bucket
-- Allow anyone (authenticated or anonymous) to upload
CREATE POLICY "Allow public uploads to s3-staging"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 's3-staging');

-- Allow anyone to read
CREATE POLICY "Allow public reads from s3-staging"
ON storage.objects FOR SELECT
USING (bucket_id = 's3-staging');

-- Allow anyone to update (for upsert operations)
CREATE POLICY "Allow public updates to s3-staging"
ON storage.objects FOR UPDATE
USING (bucket_id = 's3-staging')
WITH CHECK (bucket_id = 's3-staging');

-- Allow service role full access (for Edge Function)
CREATE POLICY "Allow service role full access to s3-staging"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 's3-staging')
WITH CHECK (bucket_id = 's3-staging');

-- Verify the changes
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 's3-staging';

-- Show all policies for this bucket
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%s3-staging%';