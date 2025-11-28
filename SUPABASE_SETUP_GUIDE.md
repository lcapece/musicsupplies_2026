# Supabase Setup Guide for Music Supplies

## Quick Setup Steps

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Settings** (gear icon) → **API**
4. Copy these two values:
   - **Project URL**: `https://ekklokrukxmqlahtonnc.supabase.co` (or similar)
   - **Anon/Public Key**: Long string starting with `eyJ...`

### 2. Run Setup Script

```bash
setup_supabase_credentials.bat
```

This script will:
- Ask for your Supabase URL and Key
- Create a `.env` file with the credentials
- Create a `netlify_env_vars.txt` file for Netlify
- Test the build to make sure everything works

### 3. Add to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site Settings** → **Environment Variables**
4. Click **Add a variable**
5. Add these variables:
   ```
   VITE_SUPABASE_URL = [your-supabase-url]
   VITE_SUPABASE_ANON_KEY = [your-anon-key]
   VITE_ELEVENLABS_API_KEY = [optional-for-voice-chat]
   ```

### 4. Deploy

```bash
# Build locally first
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

## Troubleshooting

### If deployment doesn't update:

1. **Clear Netlify cache:**
   ```bash
   netlify deploy --prod --dir=dist --clear
   ```

2. **Check build logs in Netlify:**
   - Go to Netlify Dashboard
   - Click on "Deploys"
   - Check for any build errors

3. **Verify environment variables:**
   ```bash
   node verify_supabase_connection.js
   ```

### Common Issues:

- **Build fails locally**: Check `.env` file has correct values
- **Build succeeds but site doesn't work**: Check Netlify environment variables
- **"Supabase URL required" error**: Environment variables not set in Netlify

## Your Supabase Project Info

Based on previous configurations, your project appears to be:
- **Database**: PostgreSQL at Supabase
- **Auth**: Using custom authentication with account numbers
- **Password**: Account 999 uses "2750grove"

## Important Files

- `.env` - Local environment variables (DO NOT COMMIT)
- `.env.example` - Template for environment variables
- `netlify.toml` - Netlify configuration
- `src/lib/supabase.ts` - Supabase client initialization

## Security Notes

- Never commit `.env` file to git
- Keep your Anon Key secure (though it's meant for public use)
- Use Row Level Security (RLS) in Supabase for data protection