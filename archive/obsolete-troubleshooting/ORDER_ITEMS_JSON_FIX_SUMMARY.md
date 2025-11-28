# ORDER_ITEMS JSON Formatting Fix

## Problem Identified
The ORDER_ITEMS column in the WEB_ORDERS table was incorrectly storing multiple concatenated JSON arrays instead of a single valid JSON array.

**Incorrect Format (Breaking Legacy Systems):**
```json
[{"item1":...}]
[{"item2":...}] 
[{"item3":...}]
```

**Correct Format (Required):**
```json
[{"item1":...}, {"item2":...}, {"item3":...}]
```

## Solution Implemented

### 1. Database Migration Created
**File:** `supabase/migrations/20250828_fix_order_items_json_formatting.sql`

This migration implements multiple layers of protection:

#### A. Validation Trigger
- **Function:** `validate_and_fix_order_items()`
- **Trigger:** `validate_order_items_trigger`
- Automatically fires BEFORE INSERT or UPDATE on web_orders table
- Detects concatenated arrays and merges them into a single array
- Prevents invalid JSON arrays from being stored

#### B. Updated complete_order Function
- Modified to validate and fix ORDER_ITEMS before storage
- Ensures incoming data is properly formatted as a single JSON array
- Handles edge cases where data might be malformed

#### C. Database Constraint
- Added CHECK constraint `order_items_must_be_array`
- Enforces that ORDER_ITEMS must be either NULL or a valid JSON array
- Prevents any non-array JSON from being stored

#### D. Data Repair Function
- **Function:** `fix_existing_order_items()`
- Can fix existing malformed data (currently commented out)
- Searches for and repairs concatenated arrays in existing records

### 2. Application Script
**File:** `apply_order_items_fix.ps1`

PowerShell script to apply the migration to your hosted Supabase database.

## How to Apply the Fix

### Option 1: Using PowerShell Script (Recommended)
```powershell
# Run from the project root directory
.\apply_order_items_fix.ps1
```

The script will:
1. Load your Supabase credentials from .env
2. Connect to your hosted database
3. Apply the migration
4. Display success/error messages

### Option 2: Manual Application via Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20250828_fix_order_items_json_formatting.sql`
4. Paste and execute in SQL Editor

### Option 3: Using Supabase MCP (if connected)
Use the `apply_migration` tool with the migration file contents.

## What This Fix Does

1. **Prevents Future Issues:** Any new orders will automatically have their ORDER_ITEMS validated and fixed if needed
2. **Auto-Repairs:** If concatenated arrays are detected, they'll be automatically merged into a single array
3. **Enforces Standards:** Database constraint ensures only valid JSON arrays can be stored
4. **Preserves Data:** The fix attempts to repair malformed data rather than rejecting it

## Testing the Fix

After applying the migration:

1. **Place a test order** through your application
2. **Check the database** to verify ORDER_ITEMS is stored as a single array:
   ```sql
   SELECT id, jsonb_typeof(order_items) as type, order_items 
   FROM web_orders 
   WHERE id = [your_test_order_id];
   ```
   The `type` should be 'array'

3. **Monitor logs** for any warnings about fixed ORDER_ITEMS

## Fixing Existing Data (Optional)

If you have existing malformed ORDER_ITEMS data, you can fix it by:

1. Uncomment the last line in the migration:
   ```sql
   SELECT fix_existing_order_items();
   ```

2. Or run this separately after the migration:
   ```sql
   SELECT fix_existing_order_items();
   ```

This will scan all existing orders and fix any concatenated arrays.

## Verification

To verify the fix is working:
```sql
-- Check for any non-array ORDER_ITEMS (should return 0 rows)
SELECT COUNT(*) 
FROM web_orders 
WHERE order_items IS NOT NULL 
AND jsonb_typeof(order_items) != 'array';

-- View a sample of ORDER_ITEMS to ensure proper formatting
SELECT id, order_items 
FROM web_orders 
WHERE order_items IS NOT NULL 
ORDER BY id DESC 
LIMIT 5;
```

## Rollback (If Needed)

To remove the fix:
```sql
-- Remove trigger
DROP TRIGGER IF EXISTS validate_order_items_trigger ON web_orders;

-- Remove constraint
ALTER TABLE web_orders DROP CONSTRAINT IF EXISTS order_items_must_be_array;

-- Remove functions
DROP FUNCTION IF EXISTS validate_and_fix_order_items();
DROP FUNCTION IF EXISTS fix_existing_order_items();

-- Note: You would need to restore the original complete_order function
```

## Support

If you encounter any issues:
1. Check the database logs for detailed error messages
2. Verify your ORDER_ITEMS are valid JSON
3. Ensure the migration was applied successfully

The fix is designed to be non-destructive and will attempt to repair data rather than reject it, ensuring compatibility with your legacy systems.
