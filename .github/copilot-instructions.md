# Copilot instructions for musicsupplies_nov — quick reference

## Big picture (what this repo is)
- React + TypeScript frontend (entry: `src/`), built with Vite (`vite.config.ts`).
- Database and server-side logic are managed via Supabase migrations in `supabase/migrations/` and SQL scripts in the repo root.
- UI patterns: context providers in `src/context/`, small focused components in `src/components/` (many forms are modal-based, e.g. `src/components/DiscountFormModal.tsx`).

## Critical workflows & commands
- Local dev: `npm install` then `npm run dev` (uses Vite). Check `package.json` scripts for variations.
- Production build: `npm run build` (Vite). Deploys are coordinated via `deploy.bat` / `deploy.sh` and Netlify (`netlify.toml`).
- Database changes: add SQL files under `supabase/migrations/` and follow `custom_instructions.md` — DO NOT apply changes directly to the hosted DB outside the approved MCP flow.

## Project-specific conventions (must-follow)
- All Supabase operations must go through the hosted MCP (see `custom_instructions.md` and MCP ID in repo docs). Do not run or assume a local Supabase instance.
- Use SQL migration files (root or `supabase/migrations/`) for any DB change. Search for `CREATE TABLE` / `ALTER TABLE` patterns when tracing schema.
- Global state uses React Context (`src/context/`). Avoid lifting state into components unless clearly ephemeral.
- Modals are used for edit/create flows — inspect `src/components/*Modal*.tsx` to copy patterns (form wiring, validation, submit handlers).

## Integration points & where to look
- Supabase (hosted MCP) — migrations and SQL scripts in repo. See `custom_instructions.md` and `supabase/`.
- Netlify deployment: `netlify.toml` + `deploy.*` scripts.
- External services: AWS S3 (caching), ClickSend (SMS), Mailgun (email) — search repo for `S3_CACHE_`, `CLICKSEND`, `MAILGUN` to find setup docs and SQL.

## Useful file examples (copy patterns)
- Modal form: `src/components/DiscountFormModal.tsx` (validation + submit pattern).
- Context provider: `src/context/*` (how global state and Supabase clients are injected).
- Deployment scripts: `deploy.bat`, `deploy.sh`, `netlify.toml` (how builds are triggered and env is set).
- DB scripts: `supabase/migrations/*` and `deploy-staff-auth.sql` (how schema changes are applied).

## Quick agent checklist when making changes
1. Locate affected UI components in `src/components/` and state in `src/context/`.
2. For DB changes, create a migration under `supabase/migrations/` and update any server-side SQL files; reference `custom_instructions.md` before interacting with the MCP.
3. Run `npm run dev` to verify local UI behavior; run `npm run build` for a production sanity check.
4. Update docs (README or markdown in repo root) and add small tests if adding public behavior.

If anything here is unclear or you want me to include extra examples (specific component wiring or migration examples), tell me which area to expand and I’ll iterate.
