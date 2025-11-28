# S3 Image Cache System - Complete Guide

## Quick Fix for Single Image (14000.jpg)

**Just need to add one image? Do this:**

1. **Run SQL Migration**
   - Open: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql/new
   - Paste contents of: `supabase/migrations/20251002_manual_s3_cache.sql`
   - Click "Run"

2. **Add File to Cache**
   - Go to: Manager > Systems Settings > S3 Image Cache Management
   - Enter filename: `14000.jpg`
   - Click "Add File"
   - ✅ Done! Image appears immediately

**No deployment needed for this approach!**

---

## Full Cache Rebuild (All Images)

### Prerequisites
- AWS Access Key with S3 read permissions for `mus86077` bucket

### Step 1: Set Supabase Edge Function Secrets

Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/settings/functions

Add these secrets (exact names):
- [ ] `AWS_ACCESS_KEY` = Your AWS Access Key ID
- [ ] `AWS_SECRET_ACCESS_KEY` = Your AWS Secret Access Key
- [ ] `AWS_REGION` = `us-east-1` (optional)

### Step 2: Deploy Edge Function

Run from project root:
```bash
./deploy-s3-function.sh
```

Or manually:
```bash
npx supabase functions deploy s3-image-service --project-ref ekklokrukxmqlahtonnc
```

### Step 3: Rebuild Cache

1. Open your app
2. Go to: Manager > Systems Settings
3. Scroll to: S3 Image Cache Management
4. Click: "Rebuild Cache from S3"
5. Wait for completion (shows file count)

✅ All images cached!

---

## Files Created

| File | Purpose |
|------|---------|
| `S3_SECRETS_SETUP.md` | Detailed secret configuration guide |
| `S3_CACHE_SETUP.md` | Quick setup instructions |
| `deploy-s3-cache.md` | Deployment troubleshooting |
| `deploy-s3-function.sh` | Automated deployment script |
| `supabase/migrations/20251002_manual_s3_cache.sql` | Database functions |
| `supabase/functions/s3-image-service/index.ts` | Edge function (updated) |

---

## Edge Function Details

### Endpoints

**List all files:**
```
GET https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/s3-image-service?action=list
```

**Find image for part number:**
```
GET https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/s3-image-service?action=find&file=14000
```

**Serve image:**
```
GET https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/s3-image-service?action=serve&file=14000.jpg
```

### Secret Names (Must be exact!)

✅ **Correct:** `AWS_ACCESS_KEY`
❌ **Wrong:** `AWS_ACCESS_KEY_ID`

✅ **Correct:** `AWS_SECRET_ACCESS_KEY`

The edge function specifically looks for these exact names in `Deno.env.get()`.

---

## Database Functions

After running the migration, you have access to:

```sql
-- Add single file
SELECT add_file_to_s3_cache('14000.jpg');

-- Clear entire cache
SELECT clear_s3_cache();

-- Look up file (case-insensitive)
SELECT get_s3_image_filename('14000.jpg');
SELECT get_s3_image_filename('14000.JPG'); -- Also works
```

---

## Troubleshooting

### "No image files found"
- Edge function not deployed with AWS secrets
- Use "Quick Add" instead, or deploy the function

### "AWS credentials not configured"
- Check secret names are exactly: `AWS_ACCESS_KEY` and `AWS_SECRET_ACCESS_KEY`
- Redeploy function after setting secrets
- View function logs: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/functions

### "Function not found" error
- Deploy the function first: `./deploy-s3-function.sh`

### Image still doesn't show after adding to cache
- Clear browser cache
- Check that S3 file name matches exactly (including .jpg extension)
- Verify file exists in S3: https://s3.amazonaws.com/mus86077/14000.jpg

---

## How It Works

### Without Cache
```
Product Display → Check if image exists → HTTP HEAD request to S3 → Show/Hide image
(Slow: 100-500ms per image, 3000+ products = very slow)
```

### With Cache
```
Product Display → Look up in database cache → Show/Hide image
(Fast: <1ms per image, instant for all products)
```

The cache stores filenames in lowercase for case-insensitive matching:
- Database: `14000.jpg` stored as `14000.jpg` (filename) and `14000.jpg` (filename_lower)
- Search for: `14000.JPG` → Matches `14000.jpg`

---

## Maintenance

**When you upload new images to S3:**

Option 1 (Quick): Use "Quick Add File" in Manager interface
Option 2 (Bulk): Click "Rebuild Cache from S3" to refresh all files

**Cache stays valid until you:**
- Upload new images to S3
- Delete images from S3
- Rename images in S3

---

## Support

Issues? Check:
1. S3 file exists: `https://s3.amazonaws.com/mus86077/[filename]`
2. Edge function works: `curl https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/s3-image-service?action=list`
3. Secrets set: Supabase dashboard > Project Settings > Edge Functions
4. Migration applied: Query `s3_image_cache` table

For detailed logs:
- Supabase Dashboard > Edge Functions > s3-image-service > Logs
- Browser Console > Check for errors
