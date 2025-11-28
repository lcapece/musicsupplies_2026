# State XREF Table Setup Instructions

## Overview
This migration creates a `state_xref` table that links US states to staff members (Guy, Anthony, or Julissa).

## How to Run This Migration

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/migrations/2025-10-13_create_state_xref_table.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute

### Option 2: Via psql Command Line
```bash
psql "postgresql://postgres.ekklokrukxmqlahtonnc:Lemon123@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/2025-10-13_create_state_xref_table.sql
```

## What This Migration Does

1. **Creates `state_xref` Table**
   - `id`: Serial primary key
   - `state_code`: 2-letter state code (unique)
   - `state_name`: Full state name
   - `assigned_staff`: Staff member (Guy, Anthony, or Julissa)
   - `created_at`: Timestamp
   - `updated_at`: Timestamp

2. **Creates Indexes**
   - Index on `state_code` for fast lookups
   - Index on `assigned_staff` for filtering by staff member

3. **Populates Data**
   - Inserts all 50 US states
   - Randomly assigns each state to one of the three staff members
   - Uses PostgreSQL's `random()` function for distribution

## Verification

After running the migration, verify it worked:

```sql
-- Check total count (should be 50)
SELECT COUNT(*) FROM state_xref;

-- View all assignments
SELECT state_code, state_name, assigned_staff 
FROM state_xref 
ORDER BY state_name;

-- Count assignments per staff member
SELECT assigned_staff, COUNT(*) as state_count
FROM state_xref
GROUP BY assigned_staff
ORDER BY assigned_staff;
```

## Table Structure

```sql
CREATE TABLE state_xref (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(2) NOT NULL UNIQUE,
    state_name VARCHAR(50) NOT NULL,
    assigned_staff VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Usage Example

```sql
-- Get staff assigned to California
SELECT assigned_staff FROM state_xref WHERE state_code = 'CA';

-- Get all states assigned to Guy
SELECT state_code, state_name FROM state_xref WHERE assigned_staff = 'Guy';

-- Update assignment for a specific state
UPDATE state_xref SET assigned_staff = 'Anthony' WHERE state_code = 'NY';
```

## Migration File Location
`supabase/migrations/2025-10-13_create_state_xref_table.sql`
