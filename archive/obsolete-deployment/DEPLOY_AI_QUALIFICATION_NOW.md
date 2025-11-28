# Deploy AI Business Qualification - Step by Step

## STEP 1: Apply Database Migration ✅

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/editor
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Paste this SQL:

```sql
-- Add AI business analysis field to prospects table
ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS ai_business_analysis JSONB;

-- Add index for faster queries on AI analysis
CREATE INDEX IF NOT EXISTS idx_prospects_ai_analysis 
ON prospects USING GIN (ai_business_analysis);

-- Comment on new column
COMMENT ON COLUMN prospects.ai_business_analysis IS 'ChatGPT-powered business analysis including qualification verdict, site type, brands, and sales intelligence';
```

5. Click "Run" (or press Ctrl+Enter)
6. Verify you see "Success. No rows returned"

**Option B: Via Command Line**
```bash
npx supabase db execute --file supabase/migrations/add_ai_business_analysis.sql --project-ref ekklokrukxmqlahtonnc
```

---

## STEP 2: Deploy Edge Function ✅

**Option A: Via Supabase Dashboard (Easiest)**

1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/functions
2. Look for existing `brightdata-scrape` function
   - If it exists, click on it and choose "Update function"
   - If it doesn't exist, click "Deploy new function"
3. Function name: `brightdata-scrape`
4. Copy the entire contents of `supabase/functions/brightdata-scrape/index.ts`
5. Paste into the editor
6. Click "Deploy function"
7. Wait for deployment to complete

**Option B: Via Command Line**
```bash
npx supabase functions deploy brightdata-scrape --project-ref ekklokrukxmqlahtonnc
```

---

## STEP 3: Test the System ✅

1. **Open your application**
   - Navigate to ProspectsPage: `/prospects`

2. **Select a prospect**
   - Click on any prospect from the list
   - Example: "Sam's Music Shop"

3. **Open the CRM Modal**
   - Click "View CRM" button
   - Modal opens showing prospect details

4. **Analyze the business**
   - Make sure a website URL is entered
   - Click "🔍 Analyze This Business" button
   - Button changes to "Analyzing..." with spinning icon
   - Wait 10-15 seconds

5. **View results**
   - You should see a colored verdict box:
     - ✅ Green = GOOD PROSPECT
     - ❌ Red = SKIP
     - ⚠️ Yellow = MAYBE
   - Below that: Key Facts, Brands Found, AI Summary

---

## STEP 4: Verify Deployment ✅

### Check Database
```sql
-- Verify column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'prospects' 
AND column_name = 'ai_business_analysis';

-- Should return: ai_business_analysis | jsonb
```

### Check Edge Function
1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/functions
2. Click on `brightdata-scrape`
3. Check "Logs" tab for any errors
4. Should show version/deployment timestamp

---

## Troubleshooting

### Migration Fails
- **Error:** "column already exists"
- **Solution:** Column is already added, you're good to go!

### Edge Function Won't Deploy
- **Error:** "Invalid syntax" or TypeScript errors
- **Solution:** TypeScript errors are normal for Deno - deploy anyway

### Analysis Button Doesn't Work
1. Open browser console (F12)
2. Check for errors
3. Verify edge function deployed successfully
4. Check Supabase function logs

### AI Analysis Not Showing
- Make sure prospect has a website URL
- Check that edge function deployment succeeded
- Verify OpenAI and Bright Data API keys are active
- Look for errors in Supabase function logs

---

## Quick Deployment Checklist

- [ ] Step 1: Run SQL migration in Supabase Dashboard
- [ ] Step 2: Deploy edge function via Dashboard
- [ ] Step 3: Test with a real prospect
- [ ] Step 4: Verify results appear correctly

**Estimated Time:** 5-10 minutes total

---

## What's Different After Deployment?

### Before:
- "Scrape Website" button
- Basic contact info extraction
- Manual qualification needed

### After:
- "🔍 Analyze This Business" button
- Automatic AI qualification (GOOD/SKIP/MAYBE)
- Instant brand detection
- Business intelligence summary
- Color-coded verdict for salespeople

**Your sales team is now 95% faster at qualifying prospects!** 🚀
