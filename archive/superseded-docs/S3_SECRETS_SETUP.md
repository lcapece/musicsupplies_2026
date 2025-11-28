# S3 Image Cache - Secret Configuration

## Required Edge Function Secrets

The S3 image cache rebuild functionality requires these **exact secret names** to be set in your Supabase project:

### Secret Names (MUST BE EXACT):

1. **`AWS_ACCESS_KEY`**
   - Your AWS Access Key ID
   - Example: `AKIAIOSFODNN7EXAMPLE`

2. **`AWS_SECRET_ACCESS_KEY`**
   - Your AWS Secret Access Key
   - Example: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

3. **`AWS_REGION`** (optional)
   - AWS region for S3 bucket
   - Default: `us-east-1`
   - Example: `us-east-1`

## How to Set Secrets

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions

2. Scroll to **"Function secrets"** section

3. Click **"Add new secret"** for each secret:

   | Secret Name | Value |
   |------------|--------|
   | `AWS_ACCESS_KEY` | Your AWS Access Key ID |
   | `AWS_SECRET_ACCESS_KEY` | Your AWS Secret Access Key |
   | `AWS_REGION` | `us-east-1` |

4. Click **"Save"** after adding each secret

### Option 2: Via Supabase CLI

```bash
# Login to Supabase
npx supabase login

# Set secrets
npx supabase secrets set AWS_ACCESS_KEY="your-access-key-id" --project-ref ekklokrukxmqlahtonnc
npx supabase secrets set AWS_SECRET_ACCESS_KEY="your-secret-key" --project-ref ekklokrukxmqlahtonnc
npx supabase secrets set AWS_REGION="us-east-1" --project-ref ekklokrukxmqlahtonnc
```

## Verify Secrets Are Set

List all secrets to verify:

```bash
npx supabase secrets list --project-ref ekklokrukxmqlahtonnc
```

You should see:
- `AWS_ACCESS_KEY`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (if you set it)

## Deploy the Edge Function

After setting secrets, deploy the function:

```bash
./deploy-s3-function.sh
```

Or manually:

```bash
npx supabase functions deploy s3-image-service --project-ref ekklokrukxmqlahtonnc --no-verify-jwt
```

## Test the Function

```bash
curl "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/s3-image-service?action=list"
```

Expected response:
```json
{
  "files": ["14000.jpg", "14000-0.jpg", ...],
  "cached": false,
  "lastUpdated": 1696284000000,
  "count": 3847
}
```

## Troubleshooting

### Error: "AWS credentials not configured"
- Check that secret names are **exactly** as shown above (case-sensitive)
- `AWS_ACCESS_KEY` (not `AWS_ACCESS_KEY_ID`)
- Redeploy the function after setting secrets

### Error: "Invalid credentials"
- Verify your AWS credentials have S3 read permissions
- Test credentials with AWS CLI: `aws s3 ls s3://mus86077`

### Function returns empty array
- Check that the bucket name is correct (`mus86077`)
- Verify AWS credentials have `s3:ListBucket` permission
- Check edge function logs in Supabase dashboard

## AWS IAM Policy (Minimum Required)

Your AWS credentials should have at least this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::mus86077",
        "arn:aws:s3:::mus86077/*"
      ]
    }
  ]
}
```

## Quick Reference

| Action | Command |
|--------|---------|
| Set secrets | Use Supabase dashboard or CLI |
| Deploy function | `./deploy-s3-function.sh` |
| Test function | `curl "https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/s3-image-service?action=list"` |
| Rebuild cache | Manager > Systems Settings > "Rebuild Cache from S3" |

## No Deployment Needed (Quick Add)

If you just need to add individual files without deploying the edge function:

1. Run SQL migration (see `S3_CACHE_SETUP.md`)
2. Use "Quick Add File" in Manager > Systems Settings
3. Type filename (e.g., `14000.jpg`) and click "Add File"
