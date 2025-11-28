# Running the state_xref Migration

The Supabase CLI has migration history conflicts. Here's the simplest way to run the migration:

## Option 1: Supabase Dashboard (RECOMMENDED - Takes 30 seconds)

1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql/new

2. Copy the entire contents of: `supabase/migrations/20251013125800_create_state_xref_table.sql`

3. Paste into the SQL Editor

4. Click "Run" button

5. Done! The table will be created with all 50 states randomly assigned to Guy, Anthony, or Julissa

## Option 2: Use psql CLI (if you have PostgreSQL client installed)

```bash
psql "postgresql://postgres:[YOUR-DB-PASSWORD]@db.ekklokrukxmqlahtonnc.supabase.co:5432/postgres" < supabase/migrations/20251013125800_create_state_xref_table.sql
```

## Verification

After running, you can verify the table was created by running this query in the SQL Editor:

```sql
SELECT state_code, state_name, assigned_staff 
FROM state_xref 
ORDER BY state_name 
LIMIT 10;
```

You should see 10 states with their assigned staff members.

## What This Creates

- **Table**: `state_xref` with columns:
  - `id` (auto-increment)
  - `state_code` (2-letter state code, e.g., 'CA', 'NY')
  - `state_name` (full state name)
  - `assigned_staff` (randomly assigned: Guy, Anthony, or Julissa)
  - `created_at` and `updated_at` timestamps

- **50 US States**: All states inserted with random staff assignments

- **Indexes**: For fast lookups on state_code and assigned_staff

## After Migration

Once the table is created, the Prospects Search modal will automatically:
1. Fetch state from prospects_details for Single Entity prospects
2. Look up the assigned staff member from state_xref
3. Display "Rep: [Name]" badge for each SE prospect
