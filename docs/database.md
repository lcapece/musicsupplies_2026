# Database — Canonical Documentation
Canonical as of: 2025-08-20 • Commit: aa1a5604f2e802a823f01006814788db191f331e
Supersedes prior drafts in Documentation_Deprecated/ once migration completes.

Purpose: Single source of truth for schema, migrations, RLS, functions, and operational database guidance.

## Scope
- Logical schema overview and key entities (Accounts, Orders, Order Lines, Shopping Activity, App Events, Contact Info, etc.)
- RLS policies (active, with examples)
- Database functions/procedures that affect authentication, orders, and logging
- Migrations policy (how to add, review, and apply via Supabase MCP)
- Advisory checks and performance considerations

## Authoritative Sources
- supabase/migrations/ — all DDL changes (source of truth)
- Supabase MCP (hosted) — apply_migration, execute_sql, get_logs, get_advisors, list_migrations
- docs/changelog.md — high-level history and rationale for changes

## NEVER LOCAL SUPABASE
- Do not run local Supabase CLI or connect to 127.0.0.1.
- All DDL/data operations go through the hosted Supabase MCP tools only.

## Entities (high-level)
- accounts — customer/admin accounts, status flags (active/deactivated), phone/email fields
- contact info — persisted profile/contact details (and sync routines)
- orders, order_lines — ecommerce records with RLS by account
- shopping_activity — behavioral tracking (browsing, cart interactions)
- app_events — general event log for operational/audit scenarios
- password_reset_tokens — reset workflow tokens
- s3_files — reference to S3 image metadata (if applicable)

Provide detailed ERD and field lists during migration (link to relevant migrations).

## RLS Policies (to be fully enumerated)
- Accounts
  - Enforce active status checks
  - Enforce tenant/account scoping
- Login Tracking (create_account_login_tracking.sql)
  - Insert-only as appropriate; restrict selects to self/admin
- Orders / Order Lines
  - Per-account visibility; no cross-account access
- Shopping Activity / App Events
  - Restricted access; admin-level reporting vs. user-level read

Include examples of allowed/denied queries for each table during migration.

## Functions & Procedures
- Authentication
  - CREATE_AUTHENTICATE_USER_V5.sql — authoritative authentication entrypoint
  - Net effect of FIX_* / CRITICAL_* scripts consolidated here (remove legacy forks)
- Password rotation/reset
  - create_password_update_function.sql — validates and hashes properly
  - create_password_reset_tokens_table.sql — lifecycle for reset tokens
- Logging
  - Event logging and login tracking (functions/triggers) recorded into app_events / login tracking tables

For each function, document signature, input validation, output/side effects, error cases, and required RLS preconditions.

## Migrations Process (MCP only)
- DDL changes:
  - Add a new migration file in supabase/migrations with descriptive name and timestamp
  - Apply via Supabase MCP tool: apply_migration (never local CLI)
- Data fixes:
  - Use execute_sql (idempotent where possible), with comments and audit logging
- Post-DDL checks:
  - Run get_advisors (security/performance) and address advisories
  - Add an entry in docs/changelog.md linking to the migration and PR/commit

## Advisory & Performance
- Regularly run get_advisors after DDL and major data changes
- Add missing indexes for high-traffic queries (orders history, product lookups, etc.)
- Verify RLS coverage after table changes (no new table without explicit policies)

## Temporary References (to be consolidated here)
- 02_BACKEND_DATABASE.md
- ADMIN_BACKEND_FIXES_SUMMARY.md
- SHOPPING_ACTIVITY_TABLE_FIX_COMPLETE.md
- SHOPPING_ACTIVITY_COLUMN_MISMATCH_FIX_COMPLETE.md
- CONTACT_INFO_SYNC_IMPLEMENTATION.md
- CONTACT_INFO_UPDATE_FIX_COMPLETE.md
- CRITICAL_* and FIX_* SQL under project root (summarize their net effects here)

## Migration Tasks (for this page)
- [ ] Document current RLS policies with concrete SQL snippets and examples
- [ ] Summarize the final behavior of CREATE_AUTHENTICATE_USER_V5.sql
- [ ] Link each described behavior to authoritative migrations and commit SHAs
- [ ] Add ERD or C4-style data model diagrams and reference them here
- [ ] Record advisor findings and resolutions in docs/changelog.md

## Change Control
- Any DB-affecting PR must:
  - Include a migration in supabase/migrations
  - Update this page (behavior/structure)
  - Add a dated entry to docs/changelog.md
- No new “V2/V3/V4/FINAL” forks — evolve this document only.
