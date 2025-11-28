# CRITICAL FIX: Prospects Search Join Key Issue

## Date: October 13, 2025

## THE PROBLEM

### Issue 1: Single Entity (SE) Prospects Not Displaying
- **Symptom**: Only Multi-Entity (ME) prospects were showing in the search results
- **Root Cause**: Incorrect join key between `prospects_headers` and `prospects_details` tables

### Issue 2: Wrong Data Lookup
- **Symptom**: Prospects were not loading their detail data (city, state, zip, phone)
- **Root Cause**: Code was using `identifier` field to join tables, but `prospects_details` uses `website` as the join key

### Issue 3: Modal Not Loading Prospect Data
- **Symptom**: When clicking a prospect, the modal opened but the prospect data didn't load properly
- **Root Cause**: Same incorrect join key issue

## THE FIX

### Changed in `src/components/ProspectsSearchModal.tsx`

**BEFORE (WRONG):**
```typescript
const { data: detailsData, error: detailsError } = await supabase
  .from('prospects_details')
  .select('state, zip, city, phone')
  .eq('identifier', prospect.identifier)  // ❌ WRONG - identifier doesn't exist in prospects_details
  .limit(1)
  .single();
```

**AFTER (CORRECT):**
```typescript
const { data: detailsData, error: detailsError } = await supabase
  .from('prospects_details')
  .select('state, zip, city, phone')
  .eq('website', prospect.website)  // ✅ CORRECT - website is the join key
  .limit(1)
  .single();
```

### Changed in `src/components/ProspectModal.tsx`

Fixed the same issue in TWO locations:
1. In `loadAllProspectsAndSetCurrent()` function
2. In `handleSearch()` function

Both were using `.eq('identifier', prospect.identifier)` and now correctly use `.eq('website', prospect.website)`

## DATABASE SCHEMA

### prospects_headers table
- `identifier` (Primary Key)
- `website` (Used as join key)
- `source`
- `type` (SE or ME)
- Other fields...

### prospects_details table
- `website` (Primary Key / Join Key) ⭐ THIS IS THE KEY FIELD
- `city`
- `state`
- `zip`
- `phone`
- Other fields...

## CACHE CLEARING REQUIRED

The search modal caches data for 1 hour. After deploying this fix, users MUST clear their cache:

### Method 1: Use the Cache Clear Utility
Navigate to: `http://localhost:5173/clear-prospects-cache.html` (or your production URL)
Click "Clear Cache Now"

### Method 2: Manual Clear
Open browser console and run:
```javascript
localStorage.removeItem('prospects_cache');
localStorage.removeItem('prospects_cache_timestamp');
```

Then refresh the page.

## VERIFICATION

After clearing cache and refreshing:

1. **Single Entity Prospects**: Should now appear in search results with their state codes (e.g., "NY", "CA")
2. **Multi Entity Prospects**: Should still show "Multi" as their state
3. **Prospect Details**: City, state, zip, and phone should load correctly
4. **Modal Loading**: Clicking a prospect should properly load all its data into the modal

## TESTING CHECKLIST

- [ ] Open Prospects Search Modal
- [ ] Verify SE prospects appear in the list
- [ ] Verify SE prospects show their correct state code
- [ ] Verify ME prospects still show "Multi" as state
- [ ] Click on an SE prospect - modal should open with all data loaded
- [ ] Click on an ME prospect - modal should open with all data loaded
- [ ] Verify city, state, zip, phone fields are populated in the modal
- [ ] Use Previous/Next buttons - data should load for each prospect

## WHY THIS HAPPENED

The code was written assuming `identifier` was the join key between tables, but the actual database schema uses `website` as the join key in the `prospects_details` table. This meant:

1. **For SE prospects**: The join failed completely because they have an `identifier` but the lookup was trying to match it against the `website` field in `prospects_details`
2. **For ME prospects**: They still showed in the list because the code has special handling to set state = "Multi" for ME types, regardless of the join result

## IMPACT

- **Severity**: CRITICAL - Core functionality broken
- **Affected Users**: All users searching for prospects
- **Data Loss**: None - this is a display/query issue only
- **Resolution Time**: Immediate (code fix + cache clear)

## DEPLOYMENT NOTES

1. Deploy the fixed code to production
2. Notify users to clear their cache using the utility page
3. Monitor for any issues with prospect data loading
4. Verify both SE and ME prospects display correctly

## FILES MODIFIED

1. `src/components/ProspectsSearchModal.tsx` - Fixed join key (1 location)
2. `src/components/ProspectModal.tsx` - Fixed join key (2 locations)
3. `public/clear-prospects-cache.html` - NEW utility for clearing cache
4. `PROSPECTS_SEARCH_CRITICAL_FIX.md` - THIS documentation file
