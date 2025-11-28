# Deploy ProspectStates Table Migration

## Overview
This migration creates the `public.prospectstates` table for managing sales territories across US, Canada, and Mexico.

## Migration File
- **Location**: `migrations/20251028_create_prospectstates_table.sql`
- **Also copied to**: `supabase/migrations/20251028_create_prospectstates_table.sql`

## Table Structure
```sql
CREATE TABLE public.prospectstates (
    country_code VARCHAR(2) NOT NULL,           -- US, CA, MX
    state_abbr VARCHAR(2) NOT NULL PRIMARY KEY, -- Unique 2-letter abbreviation
    state_name VARCHAR(100) NOT NULL,           -- Full state/province name
    salesman_assigned TEXT,                     -- Assigned salesperson
    last_change TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Data Included
- **United States**: 50 states + District of Columbia (51 total)
- **Canada**: 10 provinces + 3 territories (13 total)
- **Mexico**: 32 states (32 total)
- **Total Records**: 96 states/provinces

## Deployment Options

### Option 1: Supabase Dashboard (RECOMMENDED)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql/new)
2. Click **New Query**
3. Copy the entire contents of `migrations/20251028_create_prospectstates_table.sql`
4. Paste into the SQL Editor
5. Click **Run**

### Option 2: Command Line (if psql available)
```bash
psql "postgresql://postgres.ekklokrukxmqlahtonnc:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -f migrations/20251028_create_prospectstates_table.sql
```

### Option 3: Supabase CLI (if available)
```bash
supabase migration up
```

## Key Features
- **Primary Key**: `state_abbr` (2-letter abbreviation)
- **Conflict Resolution**: US states take priority over duplicates
- **Automatic Timestamps**: `last_change` updates automatically on modifications
- **Indexes**: Optimized for queries by country, salesman, and timestamp
- **Permissions**: Authenticated users can CRUD, anonymous can SELECT

## Verification Queries
After deployment, verify with these queries:

```sql
-- Check total count
SELECT COUNT(*) FROM public.prospectstates;
-- Should return 96

-- Check by country
SELECT country_code, COUNT(*) 
FROM public.prospectstates 
GROUP BY country_code 
ORDER BY country_code;
-- Should show: CA=13, MX=32, US=51

-- Check for duplicates (should be empty)
SELECT state_abbr, COUNT(*) 
FROM public.prospectstates 
GROUP BY state_abbr 
HAVING COUNT(*) > 1;

-- Sample data
SELECT * FROM public.prospectstates 
WHERE country_code = 'US' 
ORDER BY state_name 
LIMIT 5;
```

## Files Created
1. `migrations/20251028_create_prospectstates_table.sql` - Main migration
2. `supabase/migrations/20251028_create_prospectstates_table.sql` - Copy for supabase CLI
3. `DEPLOY_PROSPECTSTATES_TABLE.md` - This deployment guide

## Next Steps
After successful deployment:
1. Verify data integrity with the queries above
2. Assign salespeople to territories as needed
3. Update application code to use the new table
4. Consider adding RLS policies if needed for multi-tenant scenarios