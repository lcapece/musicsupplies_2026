# Browser Cache Refresh Instructions

## Problem
The Prospects button is still opening the old combined modal because your browser has cached the old JavaScript bundle.

## Solution - Option 1: Access New Dev Server (Recommended)
The dev server is now running on a **new port** due to the rebuild:

**Open this URL in your browser:**
```
http://localhost:5174/
```

This will load the fresh build with all the new changes.

## Solution - Option 2: Hard Refresh Current Page
If you want to keep using the existing tab, do a **hard refresh**:

### Windows/Linux:
- Press `Ctrl + Shift + R` or `Ctrl + F5`

### Mac:
- Press `Cmd + Shift + R`

## Solution - Option 3: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## What Should Happen After Refresh:
1. Login as a staff user
2. You should see TWO separate buttons in the navigation:
   - **"Accounts"** button (gray border)
   - **"Prospects"** button (green border)
3. Clicking "Accounts" opens the BLUE-themed modal (accounts only)
4. Clicking "Prospects" opens the GREEN-themed modal (prospects only)

## Verification
After refreshing, the Prospects button should open this modal:
- **Title:** "Prospects Search System" (green header)
- **Full-width single panel** (no left/right split)
- **Green theme** throughout
- **No "Accounts" panel** on the left

If you still see the old blue "Business Entity Search System" modal with both accounts and prospects panels, the cache wasn't cleared. Try the next solution method.
