# DEPLOYMENT INSTRUCTIONS - Version RC813.1000

## Your build is ready! The cache-busting system is now integrated.

### What's New:
✅ Version display in bottom-left corner (v RC813.1000)
✅ Automatic refresh when new versions are deployed
✅ PWA service worker for cache management
✅ Hash-based filenames for all assets
✅ Version checking every 30 seconds

### Files Ready for Deployment:
The `dist` folder contains your production-ready build with:
- Cache-busted assets (unique hash filenames)
- Version tracking system
- Auto-refresh functionality

## Deploy via Netlify Dashboard (Easiest):

1. **Open Netlify Dashboard**
   - Go to https://app.netlify.com
   - Select your site (musicsupplies)

2. **Deploy the dist folder**
   - Drag and drop the entire `dist` folder onto the Netlify dashboard
   - OR use "Deploys" tab → "Deploy manually" → Upload folder

## Deploy via Command Line:

```bash
# If not already logged in
netlify login

# Deploy to production
netlify deploy --prod --dir=dist

# Or for preview first
netlify deploy --dir=dist
```

## Deploy via Git (If connected):

```bash
git add .
git commit -m "Add cache busting and version RC813.1000"
git push origin main
```

## After Deployment:

Users will immediately see:
- Version "v RC813.1000" in bottom-left corner
- Automatic updates within 30 seconds of future deployments
- No more cache issues!

## Important Notes:

1. The version.json file is crucial for version checking
2. Service worker will manage all caching automatically
3. Users on old versions will see a red banner and auto-refresh

## Testing:
1. Visit your live site
2. Check bottom-left corner for "v RC813.1000"
3. Open another tab with the site
4. Deploy a new version with updated version number
5. Within 30 seconds, you'll see the update notification

Your customers will never be stuck on stale versions again!