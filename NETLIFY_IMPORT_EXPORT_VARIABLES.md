# 🚨 NETLIFY IMPORT/EXPORT ENVIRONMENT VARIABLES - FASTEST METHOD

## METHOD 1: EXPORT FROM ANOTHER SITE (If you have one)
1. **Go to another Netlify site** that has the variables set
2. **Go to Site Settings → Environment Variables**
3. **Click "Export variables"** (usually a download/export button)
4. **Download the .env file**
5. **Go back to your current site**
6. **Click "Import variables"** or "Upload .env file"
7. **Upload the downloaded file**

## METHOD 2: CREATE IMPORT FILE (Fastest for your situation)
Create a file called `netlify-env.txt` with this content:

```
VITE_SUPABASE_URL=https://ekklokrukxmqlahtonnc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k
VITE_APP_VERSION=1.0.0
VITE_AWS_S3_BUCKET=mus86077
```

Then:
1. **Look for "Import" or "Upload" button** in your Netlify environment variables page
2. **Upload this file**
3. **All variables will be set at once**

## METHOD 3: NETLIFY CLI (If you have it installed)
```bash
netlify env:import netlify-env.txt
```

## METHOD 4: BULK PASTE (Some Netlify interfaces support this)
Look for a "Bulk edit" or "Raw editor" option and paste:
```
VITE_SUPABASE_URL=https://ekklokrukxmqlahtonnc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k
VITE_APP_VERSION=1.0.0
VITE_AWS_S3_BUCKET=mus86077
```

## LOOK FOR THESE BUTTONS IN YOUR NETLIFY DASHBOARD:
- "Import variables"
- "Upload .env file"
- "Bulk edit"
- "Import from file"
- "Raw editor"

## FASTEST SOLUTION
**Look for an "Import" or "Upload" button** on your current environment variables page - this will let you upload all variables at once instead of setting them individually!

If you don't see import options, the individual clicking method is still fastest - just the 2 critical Supabase variables will fix your site.