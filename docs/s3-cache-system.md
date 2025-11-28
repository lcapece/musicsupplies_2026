# S3 Image Cache System

**Last Updated:** November 2025
**Status:** Active

## Overview

The Music Supplies application uses an S3-backed image caching system to serve product images efficiently. Images are stored in AWS S3 bucket `mus86077` and cached in a Supabase database table for fast lookups.

## Architecture

### Components
1. **AWS S3 Bucket** (`s3://mus86077`) - Primary image storage
2. **Supabase `s3_image_cache` Table** - Database cache of available images
3. **Edge Function** (`s3-image-service`) - Rebuilds cache from S3 listings
4. **Edge Function** (`upload-to-s3`) - Handles image uploads to S3
5. **Manager UI** - Interface for cache management and image uploads

### How It Works
- Images are stored in S3 with filenames matching product IDs (e.g., `14000.jpg`)
- Database cache table maintains a list of available images for quick lookups
- When images are uploaded to S3, the cache must be updated to make them visible
- The cache can be updated incrementally (single file) or rebuilt completely

## Setup Instructions

### Prerequisites
- AWS Access Key with S3 read/write permissions for `mus86077` bucket
- Supabase project access with Edge Function deployment permissions

### Step 1: Run SQL Migration

This creates the `s3_image_cache` table and helper functions.

1. Go to Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql/new
   ```

2. Copy and paste the entire content from:
   ```
   supabase/migrations/20251002_manual_s3_cache.sql
   ```

3. Click "Run" to execute the SQL

### Step 2: Configure AWS Secrets

The Edge Functions require AWS credentials to access S3.

#### Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions

2. Scroll to "Function secrets" section

3. Add these secrets (exact names required):

| Secret Name | Value | Notes |
|------------|--------|-------|
| `AWS_ACCESS_KEY` | Your AWS Access Key ID | e.g., AKIAIOSFODNN7EXAMPLE |
| `AWS_SECRET_ACCESS_KEY` | Your AWS Secret Access Key | Keep secure! |
| `AWS_REGION` | `us-east-1` | Optional, defaults to us-east-1 |

4. Click "Save" after adding each secret

#### Via Supabase CLI

```bash
npx supabase login

npx supabase secrets set AWS_ACCESS_KEY="your-access-key-id" --project-ref ekklokrukxmqlahtonnc
npx supabase secrets set AWS_SECRET_ACCESS_KEY="your-secret-key" --project-ref ekklokrukxmqlahtonnc
npx supabase secrets set AWS_REGION="us-east-1" --project-ref ekklokrukxmqlahtonnc
```

### Step 3: Deploy Edge Functions

#### Deploy S3 Image Service (for cache rebuilding)

```bash
npx supabase functions deploy s3-image-service --project-ref ekklokrukxmqlahtonnc
```

#### Deploy Upload to S3 (for image uploads)

```bash
npx supabase functions deploy upload-to-s3 --project-ref ekklokrukxmqlahtonnc
```

Or use the deployment script:
```bash
./deploy-s3-function.sh
```

## Common Operations

### Adding a Single Image to Cache (Quick Method)

**No deployment needed for this approach!**

#### Option A: Via Manager UI (Recommended)

1. Go to your app: Manager > Systems Settings
2. Scroll to "S3 Image Cache Management" section
3. In "Quick Add File to Cache", enter filename: `14000.jpg`
4. Click "Add File"
5. ✅ Done! The image appears immediately

#### Option B: Via SQL

```sql
SELECT add_file_to_s3_cache('14000.jpg');
```

### Rebuilding the Entire Cache

Use this when you've added many images to S3 or want to ensure the cache is synchronized.

1. Open your app and go to: Manager > Systems Settings

2. Scroll to "S3 Image Cache Management" section

3. Click "Rebuild S3 Cache"

4. Wait for completion (progress shown in UI)

5. Verify cache was updated in the "Cache Statistics" section

### Uploading Images via Manager UI

The Manager page has been updated to upload directly to AWS S3 (not Supabase Storage).

1. Navigate to Manager page

2. Click on a product row to select it

3. Click "Upload Image" or "Replace Image" button

4. Select an image file from your computer

5. The image is uploaded to S3 and the cache is automatically updated

**Technical Details:**
- Images are uploaded via the `upload-to-s3` Edge Function
- Edge Function uses AWS SDK S3Client with PutObjectCommand
- Successfully uploaded images automatically update the database
- Image display refreshes immediately after upload

## Troubleshooting

### Image Doesn't Appear After Upload

**Problem:** Image was uploaded to S3 but doesn't show in the app.

**Solution:**
1. Check if image is in cache:
   ```sql
   SELECT * FROM s3_image_cache WHERE filename = 'your-filename.jpg';
   ```

2. If not in cache, add it:
   ```sql
   SELECT add_file_to_s3_cache('your-filename.jpg');
   ```

3. If still not appearing, rebuild entire cache (see above)

### Edge Function Returns "Bucket not found"

**Problem:** Edge Function can't access S3 bucket.

**Causes:**
- AWS credentials not set or incorrect
- AWS credentials don't have S3 access permissions
- Wrong AWS region configured

**Solution:**
1. Verify secrets are set in Supabase Dashboard:
   https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions

2. Ensure AWS Access Key has S3 permissions for bucket `mus86077`

3. Redeploy Edge Function after updating secrets:
   ```bash
   npx supabase functions deploy s3-image-service --project-ref ekklokrukxmqlahtonnc
   ```

### Cache Rebuild Fails or Times Out

**Problem:** Full cache rebuild doesn't complete.

**Possible Causes:**
- Too many files in S3 bucket
- Edge Function timeout (default 60 seconds)
- Network connectivity issues

**Solutions:**
1. Use incremental cache updates instead of full rebuild when possible

2. For large buckets, rebuild cache in batches using SQL:
   ```sql
   -- Get list of all files from S3 (via Edge Function call)
   -- Then insert in batches
   INSERT INTO s3_image_cache (filename)
   VALUES ('file1.jpg'), ('file2.jpg'), ('file3.jpg')
   ON CONFLICT (filename) DO NOTHING;
   ```

3. Consider increasing Edge Function timeout in Supabase settings

## Database Schema

### Table: `s3_image_cache`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `filename` | VARCHAR(255) | Image filename (e.g., "14000.jpg") |
| `created_at` | TIMESTAMP | When cache entry was created |
| `updated_at` | TIMESTAMP | When cache entry was last updated |

### Indexes
- `UNIQUE INDEX` on `filename` - Ensures no duplicate entries
- `INDEX` on `created_at` - For cache expiry queries (if implemented)

### Functions

#### `add_file_to_s3_cache(filename VARCHAR)`
Adds a single file to the cache.

```sql
SELECT add_file_to_s3_cache('14000.jpg');
```

Returns: SUCCESS or error message

## Edge Functions

### `s3-image-service`

**Purpose:** Rebuild S3 image cache from bucket listing

**Location:** `supabase/functions/s3-image-service/index.ts`

**How It Works:**
1. Receives request from Manager UI
2. Uses AWS SDK to list all files in S3 bucket
3. Clears existing cache (truncate table)
4. Inserts all files from S3 into cache table
5. Returns count of files cached

**Environment Variables:**
- `AWS_ACCESS_KEY` (from Edge Function secrets)
- `AWS_SECRET_ACCESS_KEY` (from Edge Function secrets)
- `AWS_REGION` (from Edge Function secrets, defaults to us-east-1)

### `upload-to-s3`

**Purpose:** Upload images directly to S3 bucket

**Location:** `supabase/functions/upload-to-s3/index.ts`

**How It Works:**
1. Receives file upload via FormData
2. Validates file type and size
3. Uses AWS SDK S3Client PutObjectCommand to upload to S3
4. Returns success/error status

**Accepted Methods:** POST

**Request Format:** FormData with `file` and `filename` fields

**Environment Variables:**
- `AWS_ACCESS_KEY` (from Edge Function secrets)
- `AWS_SECRET_ACCESS_KEY` (from Edge Function secrets)
- `AWS_REGION` (from Edge Function secrets)

## Maintenance

### Regular Maintenance Tasks

1. **Monitor Cache Size**
   ```sql
   SELECT COUNT(*) FROM s3_image_cache;
   ```

2. **Check for Orphaned Cache Entries**
   Entries in cache that don't exist in S3 (requires manual verification)

3. **Rebuild Cache After Bulk S3 Operations**
   If you upload/delete many files directly in S3, rebuild the cache

### Cache Cleanup (if needed)

```sql
-- Remove specific file
DELETE FROM s3_image_cache WHERE filename = 'obsolete-file.jpg';

-- Clear entire cache (will be rebuilt on next cache rebuild operation)
TRUNCATE TABLE s3_image_cache;
```

## Security Considerations

1. **AWS Credentials**
   - Store only in Edge Function secrets (never in client code)
   - Use IAM credentials with minimal required permissions
   - Rotate credentials periodically

2. **S3 Bucket Permissions**
   - Ensure bucket is not publicly writable
   - Use signed URLs if implementing direct browser uploads in future
   - Enable S3 bucket logging for audit trail

3. **File Upload Validation**
   - Validate file types (images only)
   - Implement file size limits
   - Scan for malicious content if uploading user-generated images

## Related Documentation

- [Image Upload System](./image-upload-system.md) - Complete image upload workflow
- [Deployment Guide](./deployment.md) - Deploying Edge Functions
- [Supabase Setup](./supabase-setup.md) - General Supabase configuration

## Historical Notes

This system replaced an earlier attempt to use Supabase Storage bucket 'mus86077', which didn't exist. The current architecture uses AWS S3 directly, which is the source of truth for image storage, with Supabase providing the caching layer for performance.

**Previous Issues:**
- Images uploaded to S3 didn't appear immediately (cache not updated)
- Manager page tried to upload to non-existent Supabase Storage bucket
- No UI for cache management

**Current Status:** All issues resolved as of November 2025.
