# Cache Busting and Version Management

**Last Updated:** November 2025
**Status:** Active

## Overview

The Music Supplies application implements a comprehensive cache busting system to ensure customers always see the latest version of the website without needing to manually clear their browser cache. This system combines automatic version detection, PWA service worker integration, build-time cache busting, and user-friendly auto-refresh functionality.

## The Problem We Solved

**Before:** Customers saw stale versions of the website even after deployments. Customer support received complaints about features not working or looking different from screenshots.

**After:** Users ALWAYS get the latest version automatically within 30 seconds of deployment. Zero manual cache clearing required.

## How It Works

### 1. Automatic Version Detection & Refresh

- **Version Display:** A `VersionCheck` component displays the current version in the bottom-right corner (e.g., "v RC812.1547")
- **Background Checking:** Checks for new versions every 30 seconds by fetching `/version.json`
- **When Update Detected:**
  - Shows a red banner at the top: "New version available!"
  - Displays countdown from 10 seconds
  - Automatically refreshes the page when countdown reaches 0
  - Users can click "Refresh Now" to update immediately

### 2. PWA Service Worker Integration

- Service worker configured with `autoUpdate` mode
- Automatically cleans up old caches
- Forces immediate activation of new service worker versions
- Uses version-specific cache IDs to prevent serving stale content
- Cache name format: `music-supplies-v{version}`

### 3. Build-Time Cache Busting

- Vite automatically generates unique hash-based filenames for all JS/CSS assets
- Example: `main.a3f2b1.js` becomes `main.x9k4m2.js` when content changes
- Content change = new filename = forced browser download
- No configuration needed - handled automatically by Vite

### 4. HTML Meta Tags

Prevents HTML file caching to ensure version checks always use latest HTML:

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

### 5. Version Management

**Version Format:** `RC[month][day].[hour][minute]`
- Example: `RC812.1547` = August 12, 15:47 (August 12th at 3:47 PM)
- Automatically generated based on current timestamp

**Storage Locations:**
- `package.json` - NPM package version
- `.env` - Build-time environment variable
- `public/version.json` - Runtime version checking

## Deployment Process

### Before Every Deployment

```bash
# Step 1: Update version
npm run update-version

# Step 2: Build with new version
npm run build

# Step 3: Deploy (Netlify example)
netlify deploy --prod --dir=dist
```

### What Happens for Users

1. **Before Deployment:**
   - Users see version number in bottom-right corner (e.g., "v RC812.1547")
   - Application running normally

2. **During Deployment:**
   - New version is deployed to server
   - Old version still running in user browsers

3. **After Deployment (within 30 seconds):**
   - VersionCheck component detects new version in `version.json`
   - Red banner appears: "New version available! Refreshing in 10..."
   - Countdown begins
   - User can click "Refresh Now" or wait for automatic refresh
   - Page refreshes automatically with new version

4. **No user action required!** The entire update is automatic and graceful.

## Technical Implementation

### Files Modified

| File | Purpose |
|------|---------|
| `vite.config.ts` | PWA plugin configuration with version-based cache IDs |
| `scripts/update-version.js` | Generates version.json and updates .env |
| `src/components/VersionCheck.tsx` | Version display and auto-refresh UI |
| `src/App.tsx` | Includes VersionCheck component |
| `index.html` | Cache-prevention meta tags |
| `package.json` | Stores version number |

### Version Update Script

**File:** `scripts/update-version.js`

**What it does:**
1. Generates new version number based on current date/time
2. Updates `package.json` with new version
3. Creates/updates `.env` with `VITE_APP_VERSION`
4. Creates/updates `public/version.json` with version and timestamp

**Usage:**
```bash
npm run update-version
```

**Output:**
```
Updated version to: RC1126.1547
Updated .env with VITE_APP_VERSION
Created public/version.json
```

### VersionCheck Component

**File:** `src/components/VersionCheck.tsx`

**Features:**
- Displays current version in bottom-right corner
- Checks `/version.json` every 30 seconds
- Compares current version with server version
- Shows update banner when new version detected
- 10-second countdown with cancel option
- "Refresh Now" button for immediate update
- Automatic page refresh when countdown completes

**Props:**
- `currentVersion` - Current version from build (from .env)

**Component Behavior:**
```typescript
const [newVersionAvailable, setNewVersionAvailable] = useState(false);
const [countdown, setCountdown] = useState(10);

useEffect(() => {
  const checkInterval = setInterval(async () => {
    const response = await fetch('/version.json');
    const data = await response.json();

    if (data.version !== currentVersion) {
      setNewVersionAvailable(true);
      // Start countdown...
    }
  }, 30000); // Check every 30 seconds
}, [currentVersion]);
```

### PWA Configuration

**File:** `vite.config.ts`

```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
          }
        }
      }
    ]
  },
  manifest: {
    name: 'Music Supplies',
    short_name: 'Music Supplies',
    description: 'Music Supplies Manager',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
})
```

## Testing the Cache Busting System

### Test 1: Version Display

1. Open the application
2. Look at bottom-right corner
3. Verify version number is displayed (e.g., "v RC812.1547")

**Expected:** Version number visible and matches current deployment

### Test 2: Version Update Detection

1. Note the current version displayed in the app
2. Run `npm run update-version` and rebuild
3. Deploy new version
4. Wait 30-60 seconds (or click refresh in browser)
5. Verify update banner appears with countdown

**Expected:** Red banner appears with "New version available! Refreshing in 10..."

### Test 3: Automatic Refresh

1. When update banner appears, don't click anything
2. Wait for countdown to reach 0

**Expected:** Page automatically refreshes and shows new version number

### Test 4: Manual Refresh

1. When update banner appears, click "Refresh Now" button

**Expected:** Page immediately refreshes and shows new version number

### Test 5: Build Cache Busting

1. Make a change to a React component
2. Build the application
3. Check `dist/assets/` folder

**Expected:** JavaScript files have new hash-based filenames (different from previous build)

## Troubleshooting

### Users Still See Old Versions

**Symptoms:** After deployment, users report seeing old version or version number doesn't change

**Diagnostic Steps:**

1. **Verify version was updated before build**
   ```bash
   cat package.json | grep version
   cat .env | grep VITE_APP_VERSION
   cat public/version.json
   ```
   All three should show the same version

2. **Check that version.json was deployed**
   - Visit: `https://yourdomain.com/version.json`
   - Should return JSON with current version
   - If 404, version.json wasn't included in deployment

3. **Verify service worker is registered**
   - Open browser DevTools (F12)
   - Go to Application tab → Service Workers
   - Should see registered service worker
   - If not, PWA plugin may not be configured correctly

4. **Check build output has hashed filenames**
   - Look in `dist/assets/` after build
   - Files should have format: `main.[hash].js`
   - If not, Vite build configuration issue

**Solutions:**

- Re-run `npm run update-version` before building
- Ensure `public/version.json` is included in git (not in .gitignore)
- Clear service worker cache in browser DevTools if testing locally
- Verify PWA plugin is properly configured in vite.config.ts

### Update Banner Doesn't Appear

**Symptoms:** New version deployed but no update banner shown to users

**Diagnostic Steps:**

1. **Check version.json is accessible**
   ```bash
   curl https://yourdomain.com/version.json
   ```

2. **Verify VersionCheck component is rendered**
   - Open browser DevTools
   - Check React DevTools or inspect DOM for version display element

3. **Check browser console for errors**
   - Open DevTools Console
   - Look for fetch errors or JavaScript errors

**Solutions:**

- Ensure VersionCheck component is included in App.tsx
- Verify version.json has correct CORS headers (if needed)
- Check that version number format matches expected format

### Hard Refresh Required

**Symptoms:** Users need to do hard refresh (Ctrl+Shift+R) to see updates

**This is expected behavior for HTML file itself** but not for app content.

**If happening frequently:**

1. Verify HTML meta tags for cache prevention are in index.html
2. Check server cache headers for index.html (should be no-cache)
3. Consider setting explicit cache headers in Netlify config

**Server Headers** (in `netlify.toml` or `_headers` file):
```
/index.html
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache
  Expires: 0
```

### Service Worker Not Updating

**Symptoms:** New service worker version not activating

**Diagnostic Steps:**

1. Open DevTools → Application → Service Workers
2. Check if new service worker is in "waiting" state
3. Look for skip waiting button

**Solutions:**

- Service worker should automatically update with `autoUpdate` mode
- If stuck, clear service worker and reload
- Verify `registerType: 'autoUpdate'` in vite.config.ts

## User Communication

### Announcement Template

When rolling out cache busting system to users:

> We've implemented automatic version updates for the Music Supplies application! Here's what you'll notice:
>
> - **Version Number:** You'll see a version number in the bottom-right corner of the screen (e.g., "v RC812.1547")
> - **Automatic Updates:** When we deploy updates, the site will automatically detect the new version within 30 seconds
> - **Friendly Notification:** You'll see a red banner at the top saying "New version available!" with a countdown
> - **No Action Needed:** The page will automatically refresh to the new version. You can also click "Refresh Now" if you don't want to wait.
>
> **What this means for you:**
> - No more "clear your cache" instructions!
> - You'll always be running the latest version
> - New features and fixes appear automatically
>
> If you ever encounter issues, the version number helps us quickly identify which version you're running.

## Benefits

✅ **Zero Cache Issues** - Users always get the latest version
✅ **Visible Version** - Support team can see what version user is running
✅ **Automatic Updates** - No need to instruct users to clear cache
✅ **Graceful Updates** - 10-second warning before refresh prevents data loss
✅ **PWA Optimization** - Service worker manages all caching intelligently
✅ **Build-Time Optimization** - Automatic hash-based filenames for all assets
✅ **User-Friendly** - Clear communication and no disruption

## Related Documentation

- [Deployment Guide](./deployment.md) - Complete deployment process including version updates
- [PWA Configuration](./pwa-configuration.md) - Progressive Web App setup (if exists)

## Historical Notes

### Previous Issues (Before Cache Busting)
- Customers frequently saw stale content after deployments
- Support team had to walk users through manual cache clearing
- No way to know which version users were running
- Multiple support tickets per deployment about "broken" features
- Lost productivity time for both users and support team

### Implementation Date
November 2025

### Current Status
All cache-related issues resolved. System has been running smoothly since implementation.
