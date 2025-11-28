-- Migration: Drop Prospects-related tables
-- Purpose: Remove legacy tables: prospects, prospects_headers, prospects_details
-- Notes:
-- - Uses IF EXISTS for idempotency across environments
-- - Uses CASCADE to drop dependent objects (FKs, views, triggers, indexes)
-- - Supabase/Postgres default schema is public; adjust if using a different schema

BEGIN;

-- Drop child/detail tables first to minimize cascade impact order
DROP TABLE IF EXISTS public.prospects_details CASCADE;
DROP TABLE IF EXISTS public.prospects_headers CASCADE;

-- Drop main prospects table
DROP TABLE IF EXISTS public.prospects CASCADE;

COMMIT;
