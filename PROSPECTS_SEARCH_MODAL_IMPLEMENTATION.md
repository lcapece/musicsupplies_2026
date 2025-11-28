# Prospects Search Modal Implementation

## Overview
Created a new `ProspectsSearchModal` component as a copy of the Business Entity Search System, specifically designed for searching and managing prospects only.

## Changes Made

### 1. New Component Created
**File**: `src/components/ProspectsSearchModal.tsx`

This is a standalone prospects-only search modal with the following features:
- **Full-width prospects panel** (accounts panel removed)
- **Green theme** instead of blue to distinguish from the original
- Advanced search with three filter fields:
  - Primary Search (AND CONTAINS 1)
  - Additional Filter (AND CONTAINS 2)
  - Exclude Terms (AND DOES NOT CONTAIN)
- Lazy loading pagination (50 items per page)
- Click on prospect ID to open detailed ProspectModal
- DO NOT SELL indicator for flagged prospects

### 2. Database Issue Fixed
**Issue**: The `prospects_headers` table does not have a `city` column, which was causing this error:
```
Error: column prospects_headers.city does not exist
```

**Solution**: Removed the `city` column from the SELECT query in both:
- `SearchEntityModal.tsx` (original)
- `ProspectsSearchModal.tsx` (new)

**Updated Query**:
```typescript
const { data: prospectsData, error: prospectsError } = await supabase
  .from('prospects_headers')
  .select('identifier, website, source, type, state, zip, contact_phone')
  .order('website');
```

### 3. Key Differences from SearchEntityModal

| Feature | SearchEntityModal | ProspectsSearchModal |
|---------|------------------|---------------------|
| Layout | Two-column (Accounts + Prospects) | Single-column (Prospects only) |
| Color Theme | Blue | Green |
| Width | 50% per panel | 100% for prospects |
| Purpose | Search both accounts and prospects | Search prospects only |
| Account Selection | Opens salesman mode | N/A |
| Prospect Selection | Opens ProspectModal | Opens ProspectModal |

### 4. Component Props

```typescript
interface ProspectsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

### 5. Usage Example

```typescript
import ProspectsSearchModal from './components/ProspectsSearchModal';

function MyComponent() {
  const [isProspectsModalOpen, setIsProspectsModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsProspectsModalOpen(true)}>
        Search Prospects
      </button>
      
      <ProspectsSearchModal
        isOpen={isProspectsModalOpen}
        onClose={() => setIsProspectsModalOpen(false)}
      />
    </>
  );
}
```

## Features

### Search Functionality
- **Primary Search**: Main search term that must be present
- **Additional Filter**: Secondary term that must also be present (AND logic)
- **Exclude Terms**: Terms that must NOT be present in results
- **Enter Key Support**: Press Enter to execute search
- **Clear Filters**: Reset all filters and show all prospects

### Display Features
- Lazy loading with infinite scroll
- 50 items per page
- Shows prospect ID, business name, state, zip, phone, and website
- Visual indicators for "DO NOT SELL" prospects (yellow background)
- Clickable prospect IDs that open detailed ProspectModal

### Performance
- Loads all prospects once on modal open
- Client-side filtering for instant results
- Efficient pagination with scroll detection
- Minimal re-renders

## Database Schema Requirements

The component expects the `prospects_headers` table to have these columns:
- `identifier` (unique ID)
- `website`
- `source`
- `type`
- `state`
- `zip`
- `contact_phone`

**Note**: The `city` column is NOT required and should not be queried.

## Resolved Issues

1. ✅ **Fixed**: "column prospects_headers.city does not exist" error in all three files:
   - SearchEntityModal.tsx (original - still has both panels)
   - ProspectsSearchModal.tsx (NEW - prospects only)
   - ProspectModal.tsx (detail view)

2. ✅ **Created**: NEW standalone prospects search modal (`ProspectsSearchModal.tsx`)
3. ✅ **Maximized**: Prospects panel in the NEW modal
4. ✅ **Fixed**: Database queries to exclude non-existent `city` column

## IMPORTANT: Understanding the Two Modals

**SearchEntityModal.tsx** (ORIGINAL - Blue theme)
- This is the modal you're currently seeing in your screenshot
- Shows BOTH "Existing Accounts" (left) AND "Prospects" (right) panels
- Still available and working - now fixed to query database correctly
- Use this when you want to search both accounts and prospects

**ProspectsSearchModal.tsx** (NEW - Green theme)  
- This is a BRAND NEW component created from your request
- Shows ONLY prospects in a full-width panel (accounts removed)
- Green color theme to distinguish from the original
- You need to import and use this new component where you want prospects-only search

## How to Use the New Prospects-Only Modal

You haven't integrated it yet - here's how:

```typescript
// Example: In your Dashboard or wherever you want to open it
import ProspectsSearchModal from './components/ProspectsSearchModal';

function YourComponent() {
  const [showProspectsModal, setShowProspectsModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowProspectsModal(true)}>
        Search Prospects Only
      </button>
      
      <ProspectsSearchModal
        isOpen={showProspectsModal}
        onClose={() => setShowProspectsModal(false)}
      />
    </>
  );
}
```

## Testing Recommendations

1. Open the ProspectsSearchModal
2. Verify prospects load without database errors
3. Test search functionality with various filters
4. Test scrolling and lazy loading
5. Click prospect IDs to verify ProspectModal opens correctly
6. Verify "DO NOT SELL" indicators appear for flagged prospects (zip = "xxxxx")

## Future Enhancements

Possible improvements:
- Export prospects list to CSV
- Bulk operations on selected prospects
- Advanced filtering by prospect type or source
- Integration with AI-powered prospect enrichment
- Custom column visibility toggle
