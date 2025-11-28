# Unified Version Management System

## Overview
The Music Supplies application now has a unified version management system that updates both the display version and version tracking files simultaneously.

## Version Display
- **Location**: Lower-left corner of the application
- **Format**: v827.256
- **Source**: `package.json` version field

## Version Files
1. **`package.json`**: Controls the displayed version (via VersionCheck component)
2. **`public/version.json`**: Used for version checking and deployment tracking

## How to Update Version

### Method 1: Using the Unified Script
```bash
# Update to any version number
npm run version:set [new-version]

# Examples:
npm run version:set 827.256
npm run version:set 828.001
npm run version:set 830.500
```

### Method 2: Direct Script Execution
```bash
node scripts/update-version.js [new-version]
```

## What Gets Updated

When you run the version update script, it automatically updates:

1. **`package.json`** - Changes the `version` field
2. **`public/version.json`** - Updates:
   - `version`: The new version number
   - `timestamp`: Current ISO timestamp
   - `build`: Current timestamp as build number

## Example Output

```bash
> npm run version:set 827.256

✅ Updated package.json version to 827.256
✅ Updated public/version.json to 827.256

🎉 Version successfully updated to 827.256
   📦 package.json: 827.256
   🌐 public/version.json: 827.256
   ⏰ Timestamp: 2025-08-27T18:57:00Z
   🔨 Build: 1724781420000

💡 The version will be visible in the lower-left corner after page refresh.
```

## Integration with VersionCheck Component

The `VersionCheck` component:
- Reads version from `package.json`
- Displays it in lower-left corner as `v827.256`
- Periodically checks `public/version.json` for updates
- Shows update notifications when versions differ

## Future Usage

**For any version updates, always use the unified script:**
```bash
npm run version:set [new-version]
```

This ensures both the displayed version and tracking files remain synchronized.
