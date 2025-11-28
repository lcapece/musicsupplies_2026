# FIX S3 CACHE - IMMEDIATE ACTION REQUIRED

## The Problem
The edge function `list-s3-files` is returning 500 errors because AWS credentials are missing from Supabase Edge Function secrets.

## The Solution - Set AWS Credentials

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project: `ekklokrukxmqlahtonnc`
3. Go to **Project Settings** > **Edge Functions** > **Manage Secrets**

### Step 2: Add These Secrets

Add the following secrets (click "+ New secret" for each):

1. **AWS_ACCESS_KEY_ID**
   - Value: Your AWS access key for the mus86077 S3 bucket

2. **AWS_SECRET_ACCESS_KEY**
   - Value: Your AWS secret key for the mus86077 S3 bucket

3. **AWS_REGION** (optional, defaults to us-east-1)
   - Value: `us-east-1` (or whatever region your bucket is in)

### Step 3: Verify the Function Works

After adding the secrets, test the function:

1. Go to: https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/list-s3-files
2. You should see a JSON response with your S3 files
3. If you still get an error, check the function logs in Supabase Dashboard

### Step 4: Rebuild the Cache

Once the edge function works:
1. Go to your app's /manager page
2. Go to the "S3 Image Cache" tab
3. Click "Rebuild Cache from S3"
4. It should now work!

---

## Alternative: If You Don't Have AWS Credentials

If you don't have AWS credentials or can't set them, you can:

1. Manually populate the cache using the populate-s3-cache.html tool
2. Or remove the RLS restriction (run the SQL from fix-s3-cache-permissions.html)
3. Then manually insert file records

---

## Why This Happened

The S3 cache rebuild feature calls the `list-s3-files` edge function, which needs AWS credentials to access your S3 bucket. These credentials must be stored as Supabase Edge Function secrets, not environment variables.
