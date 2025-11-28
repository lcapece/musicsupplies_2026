# Deploy S3 Image Cache System

## Prerequisites

You need your AWS credentials that have read access to the `mus86077` S3 bucket.

## Step 1: Set Edge Function Secrets in Supabase

1. Go to your Supabase dashboard:
   https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions

2. Click "Add new secret" and add the following:

   **Secret Name:** `AWS_ACCESS_KEY`
   **Value:** Your AWS Access Key ID (e.g., AKIA...)

   **Secret Name:** `AWS_SECRET_ACCESS_KEY`
   **Value:** Your AWS Secret Access Key

   **Secret Name:** `AWS_REGION` (optional)
   **Value:** `us-east-1`

3. Click "Save" for each secret

## Step 2: Deploy the Edge Function

Run this command from the project root:

```bash
npx supabase functions deploy s3-image-service --project-ref ekklokrukxmqlahtonnc --no-verify-jwt
```

If you get an auth error, first login:

```bash
npx supabase login
# Follow the prompts to authenticate
```

Then try deploying again.

## Step 3: Test the Deployment

Test that the edge function can list S3 files:

```bash
curl "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/s3-image-service?action=list"
```

You should see a JSON response with a list of image files.

## Step 4: Rebuild Cache in the App

1. Open your app and go to: **Manager > Systems Settings**
2. Scroll to **S3 Image Cache Management**
3. Click **"Rebuild Cache from S3"**
4. Wait for it to complete (should show "Found X image files")
5. Done! All images are now cached

## Troubleshooting

### Error: "AWS credentials not configured"
- Make sure you added the secrets in Step 1
- Secret names must be exact: `AWS_ACCESS_KEY` and `AWS_SECRET_ACCESS_KEY`
- Redeploy the function after adding secrets

### Error: "Access token not provided"
- Run `npx supabase login` first
- Or set: `export SUPABASE_ACCESS_TOKEN="your-token"`

### Edge function returns empty list
- Check that your AWS credentials have S3 read permissions
- Verify the bucket name is `mus86077`
- Check CloudWatch logs in Supabase dashboard

## Quick Add Single File (No Deployment Needed)

If you just need to add one file like `14000.jpg`:

1. First run the SQL migration (see S3_CACHE_SETUP.md)
2. Go to Manager > Systems Settings > S3 Image Cache
3. Type the filename in "Quick Add" box: `14000.jpg`
4. Click "Add File"

This bypasses the need to deploy the edge function entirely.
