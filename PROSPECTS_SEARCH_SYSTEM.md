# Prospects Search System - Definitive Configuration Guide

**Last Updated:** December 4, 2024
**Status:** PRODUCTION - DO NOT MODIFY WITHOUT READING THIS ENTIRE DOCUMENT

---

## CRITICAL WARNING

This configuration took **thousands of dollars and dozens of hours** to perfect. The column widths and horizontal scrolling behavior are precisely calibrated. **DO NOT CHANGE** the column widths or table layout without explicit approval.

---

## Overview

The Prospects Search System (`ProspectsSearchModal.tsx`) is a full-screen, Excel-style searchable grid for managing sales prospects. It provides salespeople with the ability to:

- Search and filter 6,000+ prospects
- Update prospect status (critical for sales workflow)
- Edit phone numbers, emails, and contact notes inline
- Fetch phone numbers from Google Places API
- View prospect intelligence grades
- Convert prospects to accounts

---

## File Location

```
src/components/ProspectsSearchModal.tsx
```

---

## Column Configuration (LOCKED - DO NOT MODIFY)

The column widths are **hardcoded** starting at line 94 and must remain exactly as specified:

```typescript
const columnWidths = {
  business_name: 200,   // Business name - truncates with ellipsis
  status: 170,          // CRITICAL: Must show full status text
  intel: 50,            // Intelligence indicator + AI grade
  website: 200,         // Website URL
  state: 50,            // 2-letter state code
  city: 100,            // City name
  phone: 120,           // Phone number or "Fetch Phone" button
  google_review: 80,    // Google review count
  email: 200,           // Email address (editable)
  contact: 80,          // Contact notes button
  address: 150,         // Street address
  zip: 60               // ZIP code
};
```

### Why These Widths Matter

1. **Status (170px)**: The dropdown must display full text for all options:
   - `(no status)`
   - `INAPPROPRIATE`
   - `REQUEST REMOVE`
   - `NOT INTERESTED`
   - `LEFT MESSAGE`
   - `CALL BACK`
   - `HOT PROSPECT`
   - `CONVERTED ACCT`
   - `MADE PURCHASE`

2. **Total Table Width**: 1500px (forces horizontal scrolling on smaller screens)

---

## Table Layout Configuration (LOCKED)

The table element at line ~1091 must have these exact settings:

```typescript
<table
  className="border-collapse border border-gray-300"
  style={{ tableLayout: 'fixed', width: '1500px' }}
>
```

### Key Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `tableLayout` | `fixed` | Enforces column widths exactly as specified |
| `width` | `1500px` | Forces horizontal scrollbar when window is narrower |
| `border-collapse` | `collapse` | Clean cell borders |

---

## Scroll Container Configuration

The scroll container (line ~1072-1076) must be:

```typescript
<div
  ref={prospectsScrollRef}
  onScroll={handleProspectsScroll}
  className="flex-1"
  style={{ overflow: 'auto' }}
>
```

This enables both horizontal and vertical scrolling.

---

## Status Dropdown Configuration

The status dropdown in each row (line ~1199-1215) has specific styling:

```typescript
<select
  value={prospect.status || ''}
  onChange={(e) => handleStatusChange(prospect.website || '', e.target.value)}
  disabled={saving}
  className={`w-full px-1 py-1 border border-gray-300 rounded text-xs ${getStatusColor(prospect.status)} font-semibold bg-white cursor-pointer`}
  style={{ minWidth: '150px' }}
>
```

### Status Options with Colors

| Status | Color Class | Hex Color |
|--------|-------------|-----------|
| (no status) | `text-gray-400` | #9CA3AF |
| INAPPROPRIATE | `text-red-600` | #DC2626 |
| REQUEST REMOVE | `text-red-600` | #DC2626 |
| NOT INTERESTED | `text-amber-800` | #92400E |
| LEFT MESSAGE | `text-amber-800` | #92400E |
| CALL BACK | `text-blue-600` | #2563EB |
| HOT PROSPECT | `text-blue-600` | #2563EB |
| CONVERTED ACCT | `text-green-600` | #16A34A |
| MADE PURCHASE | `text-green-600` | #16A34A |

---

## Database Configuration

### Table: `prospector`

The system reads from and writes to the `prospector` table with these key columns:

| Column | Type | Description |
|--------|------|-------------|
| `website` | text (PK) | Primary key - unique website identifier |
| `business_name` | text | Company name |
| `status` | text | Sales status (nullable) |
| `state` | text | 2-letter state code |
| `city` | text | City name |
| `phone` | text | Phone number |
| `email` | text | Email address |
| `contact` | text | Contact notes |
| `google_review` | numeric | Google review count |
| `intelligence_status` | text | AI processing status |
| `ai_grade` | text | A/B/C/D grade |
| `google_places_id` | text | Google Places API ID |
| `homepage_screenshot_url` | text | Screenshot URL |
| `zip` | text | ZIP code |

### RPC Functions Used

1. `is_user_super_admin(p_username)` - Check if user is super admin
2. `get_all_states()` - Get all states for super admins
3. `get_user_assigned_states(p_username)` - Get states assigned to regular users
4. `get_prospects_for_user(p_username)` - Get prospects filtered by user's assigned states

---

## User Access Control

### Super Admins
- Can view ALL 50 states
- State filter dropdown is disabled (shows "Filter disabled")
- Yellow badge: "SUPER ADMIN: CAN VIEW/FILTER ALL 50 STATES"

### Regular Users
- Can only view prospects in their assigned states
- State filter dropdown shows only their assigned states
- Red badge shows assigned states list

---

## Statistics Display (Header)

Three key metrics displayed in header:

1. **Valid Phones** - Count of prospects with non-empty, non-000-000-0000 phone numbers
2. **Places Verified** - Count of prospects with Google Places ID
3. **Valid Screenshots** - Count of prospects with homepage screenshots

---

## Search Functionality

### Filter Fields

1. **Primary Search** - Main search term (searches all text fields)
2. **Additional Filter** - AND condition with primary search
3. **Exclude Terms** - Removes results containing this term

### Searchable Fields

The search checks these fields:
- `business_name`
- `website`
- `state`
- `city`
- `google_review`
- `email`
- `contact`
- `zip`
- `intelligence_status`
- `ai_grade`

---

## Inline Editing

### Editable Fields

1. **Phone** - Click to edit, Enter to save, Escape to cancel
2. **Email** - Click to edit with validation
3. **Status** - Dropdown, changes save immediately
4. **Contact Notes** - Opens popup modal for longer text

### Phone Fetch Feature

If phone is empty, displays "Fetch Phone Number" button that:
1. Calls Supabase edge function `fetch-phone-from-places`
2. Searches Google Places API for business
3. Updates database with found phone number
4. Shows `0000000000` if not found

---

## Lazy Loading / Pagination

- Initial load: 50 items
- Scroll triggers: Load 50 more when within 100px of bottom
- All data loaded into memory, filtered client-side for speed

---

## Caching Strategy

### Cache Keys
- `prospector_cache_v5_{username}` - Formatted prospect data
- `prospector_cache_v5_{username}_timestamp` - Cache age
- `prospector_cache_v5_{username}_raw` - Raw database data
- `prospector_cache_v5_{username}_stats` - Statistics
- `prospector_cache_v5_{username}_limited` - Flag for large datasets

### Cache Duration
- 1 hour (3,600,000 ms)

### Large Dataset Handling
- Super admins with >2000 prospects skip raw data caching
- Prevents localStorage quota errors

---

## Known Issues & Solutions

### Issue: Status dropdown text cut off
**Solution:** Column width must be 170px minimum, select minWidth 150px

### Issue: No horizontal scrollbar
**Solution:** Table must have `width: '1500px'` (not minWidth), container must have `overflow: auto`

### Issue: Columns not respecting widths
**Solution:** Table must have `tableLayout: 'fixed'`

---

## Testing Checklist

Before deploying changes to this component:

- [ ] Status dropdown shows ALL status options fully readable
- [ ] Horizontal scrollbar appears when window width < 1500px
- [ ] All columns visible when scrolling horizontally
- [ ] Contact column (last visible) is accessible
- [ ] Super admin sees all 50 states
- [ ] Regular user sees only assigned states
- [ ] Phone fetch button works
- [ ] Inline editing saves correctly
- [ ] Search filters work as expected

---

## Component Dependencies

```typescript
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ProspectorModal from './ProspectorModal';
```

---

## Related Components

- `ProspectorModal.tsx` - Detail view when clicking a prospect
- `ConvertToAccountModal.tsx` - Convert prospect to account
- `ProspectsPage.tsx` - Alternative full-page prospects view (legacy)

---

## Change History

| Date | Change | Reason |
|------|--------|--------|
| Dec 4, 2024 | Set status column to 170px, table width to 1500px | Status text was unreadable |
| Dec 4, 2024 | Added minWidth: 150px to status select | Ensure dropdown never shrinks |
| Dec 4, 2024 | Changed container overflow to 'auto' | Enable horizontal scrollbar |

---

## Support Contact

For issues with this system, document the exact problem with screenshots before making any changes. The column configuration has been tested across multiple screen sizes and is the result of extensive calibration.
