# Music Supplies — Single-Source Documentation

Purpose: replace scattered, versioned (“V2/V3/V4…”) docs with one canonical, living set. This page is the entry point and source of truth.

- Canonical docs live in: docs/
- Legacy/archive materials live in: Documentation_Deprecated/ (do not delete yet)
- Versioning: use CHANGELOG entries and dated sections, not file forks like V2/V3
- Anchor commit: aa1a5604f2e802a823f01006814788db191f331e
- Last updated: 2025-08-20

## Canonical Index

These topic pages are the single source of truth. Update these files directly.
(Placeholders will be filled as content is migrated. Until then, follow the “Temporary authoritative references” section below.)

- docs/architecture.md — system overview, data flows, components, environments
- docs/authentication.md — auth flows, master password system, RLS, policies
- docs/database.md — schema, migrations, RLS, advisory notes
- docs/edge-functions.md — all Supabase Edge Functions (entrypoints, inputs/outputs)
- docs/sms-email.md — Mailgun (email), ClickSend (SMS), templates, failure handling
- docs/deployment.md — Netlify build/deploy, environment config, runbooks
- docs/changelog.md — dated changes, deprecations (replaces V2/V3 file forks)

## Temporary authoritative references (until migration completes)

Use these existing files when details are missing from the canonical docs:

- Authentication and security
  - 01_SECURITY_AUTHENTICATION.md
  - COMPLETE_AUTHENTICATION_FIX_SUMMARY.md
  - COMPLETE_AUTHENTICATION_SYSTEM_V4_IMPLEMENTATION.md
  - UNIVERSAL_MASTER_PASSWORD_SYSTEM_V5_COMPLETE.md
  - MASTER_PASSWORD_SYSTEM_COMPLETE_IMPLEMENTATION.md
  - CRITICAL_PASSWORD_CHANGE_FIX_COMPLETE.md
  - CRITICAL_PLAIN_TEXT_PASSWORD_BUG_EMERGENCY_FIX_COMPLETE.md
- Database
  - 02_BACKEND_DATABASE.md
  - supabase/migrations/ (entire directory)
  - ADMIN_BACKEND_FIXES_SUMMARY.md
  - SHOPPING_ACTIVITY_TABLE_FIX_COMPLETE.md
  - SHOPPING_ACTIVITY_COLUMN_MISMATCH_FIX_COMPLETE.md
- Orders/Promo Codes
  - 04_ORDER_MANAGEMENT.md
  - 05_PROMO_CODE_SYSTEM.md
  - CRITICAL_SAVE10_PROMO_CODE_EMERGENCY_FIX_COMPLETE.md
  - PROMO_CODE_SINGLE_USE_ENFORCEMENT.md
- Email/SMS and Edge Functions
  - MAILGUN_CONFIGURATION_FIX.md
  - CLICKSEND_FRONTEND_BACKEND_FIX_SUMMARY.md
  - CLICKSEND_SMS_NODEJS_FIX_SUMMARY.md
  - SMS_FAILURE_NOTIFICATION_IMPLEMENTATION.md
  - supabase/functions/ (entire directory)
- Deployment/Operations
  - SUPABASE_MCP_REMINDER.md
  - CONFIRM_HOSTED_DEPLOYMENT.md
  - DEPLOY_NOW.md
  - netlify.toml
  - deploy*.bat/.sh
  - emergency_* and EMERGENCY_* runbooks

## Edge Functions inventory (current tree)

Document each function in docs/edge-functions.md with purpose, parameters, environment vars, and example requests/responses.

- supabase/functions/authenticate-with-master-password/
- supabase/functions/send-admin-sms/
- supabase/functions/send-customer-sms/
- supabase/functions/send-mailgun-email/
- supabase/functions/generate-pdf-invoice/
- supabase/functions/list-s3-files/
- supabase/functions/log-event/

## Source-of-truth conventions

- No more V2/V3/V4 forks. Evolve a single file per topic.
- Use docs/changelog.md for dated updates with short rationale and links to commits/migrations.
- Each topic page begins with:
  - “Canonical as of <date>, commit <sha>”
  - “Supersedes prior drafts in Documentation_Deprecated/”
- Any emergency runbook gets summarized into the relevant canonical topic after the incident, then the runbook is archived.

## Migration plan (phased and safe)

1) Establish skeleton (this PR)
- Create docs/README.md (this file)
- Add placeholder pages for each topic
- Do not move/delete any legacy doc yet

2) Migrate critical content
- Authentication: merge “final state” across COMPLETE_* and CRITICAL_* docs into docs/authentication.md
- Database: summarize schema and link to authoritative migrations; capture RLS policies in docs/database.md
- Edge functions + Email/SMS: consolidate behavior, env vars, error handling into docs/edge-functions.md and docs/sms-email.md
- Deployment: consolidate Netlify/Supabase MCP practices into docs/deployment.md

3) Archive legacy material
- For each migrated topic, move older versions to Documentation_Deprecated/
- Add a one-line pointer at the top of each archived file: “Archived. See docs/<topic>.md”

4) Normalize ongoing changes
- Every change with operational impact gets an entry in docs/changelog.md
- No new standalone “*_FIX_COMPLETE.md” docs — add a Changelog entry and update the canonical topic instead

## Contribution workflow

- Update the relevant docs/<topic>.md in the same PR as your code/migration
- Add an entry to docs/changelog.md with date, summary, and links
- If you must write a runbook during an incident, archive it after consolidating the learnings into the canonical topic

## Status

- Canonical structure created
- Content migration: pending
- Next actions:
  - Create topic placeholders
  - Migrate Authentication (highest confusion/impact)
  - Migrate Database (RLS + migrations)
  - Migrate Edge Functions and Email/SMS
  - Update README links as pages fill out
