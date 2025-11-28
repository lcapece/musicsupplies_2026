# S3 Image Cache Setup Instructions

## Problem
Images uploaded to S3 don't appear immediately because the database cache hasn't been updated.

## Quick Solution (for single files like 14000.jpg)

### Step 1: Run the SQL Migration

1. Go to Supabase SQL Editor:
   https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql/new

2. Copy and paste the entire content from:
   `supabase/migrations/20251002_manual_s3_cache.sql`

3. Click "Run" to execute the SQL

### Step 2: Add Your Image to Cache

**Option A: Use the Manager Interface (Recommended)**
1. Go to your app: Manager > Systems Settings
2. Scroll to "S3 Image Cache Management" section
3. In "Quick Add File to Cache", type: `14000.jpg`
4. Click "Add File"
5. Done! The image should now appear

**Option B: Use SQL directly**
```sql
SELECT add_file_to_s3_cache('14000.jpg');
```

## Full Cache Rebuild (for all images)

This requires deploying the S3 edge function with AWS credentials.

### Step 1: Set AWS Secrets in Supabase Edge Functions

1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions
2. Click "Add new secret" and add these secrets:
   - `AWS_ACCESS_KEY`: your AWS access key ID
   - `AWS_SECRET_ACCESS_KEY`: your AWS secret access key
   - `AWS_REGION`: us-east-1 (optional, defaults to us-east-1)

### Step 2: Deploy the Edge Function

```bash
npx supabase functions deploy s3-image-service --project-ref ekklokrukxmqlahtonnc
```

### Step 3: Rebuild Cache

1. Go to Manager > Systems Settings
2. Click "Rebuild Cache from S3"
3. Wait for it to fetch all files from your S3 bucket
4. All images will now be cached!

## How It Works

The cache stores image filenames in the database for fast lookup:
- **Without cache**: Every product image requires an HTTP request to S3
- **With cache**: Instant filename lookup from database (1000x faster)

The cache is case-insensitive, so `14000.jpg`, `14000.JPG`, and `14000.Jpg` all match.
