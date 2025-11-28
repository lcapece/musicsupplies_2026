# Authentication — Canonical Documentation
Canonical as of: 2025-08-20 • Commit: aa1a5604f2e802a823f01006814788db191f331e
Supersedes prior drafts in Documentation_Deprecated/ once migration completes.

Purpose: Replace multiple “V2/V3/V4/FINAL/FIX_*” auth docs with a single, living source of truth. All future auth changes must update this page and docs/changelog.md.

## Scope
- Frontend auth flows (login, logout, session, password change/reset)
- Master Password system and override rules
- Account state (active/deactivated), zip-code guardrails
- RLS policies & DB functions participating in auth
- 2FA (ClickSend) high-level setup
- Incident learnings (summarized), not separate “*_FIX_COMPLETE.md” docs

## System Overview
- Frontend
  - src/context/AuthContext.tsx — global auth/session state
  - src/components/Login.tsx — primary login UI
  - src/components/PasswordChangeModal.tsx — password change flow
  - src/pages/ForgotPasswordPage.tsx — reset initiation
  - src/pages/UpdatePasswordPage.tsx — reset completion
- Edge Functions
  - supabase/functions/authenticate-with-master-password/index.ts — master password auth
  - supabase/functions/send-mailgun-email — email for password reset/notifications
  - supabase/functions/send-admin-sms and send-customer-sms — SMS flows (alerts/2FA)
- Database
  - CREATE_AUTHENTICATE_USER_V5.sql (finalized behavior summarized below)
  - create_password_update_function.sql
  - create_password_reset_tokens_table.sql
  - Login tracking (create_account_login_tracking.sql)
  - RLS policies on accounts and related tables

## Happy-path Login Flow
1) User submits credentials via Login component.
2) Backend validates (normal password or master-password path).
3) On success:
   - Session established (AuthContext / Supabase client).
   - Login tracking row created.
   - Redirect to authenticated route.
4) On failure:
   - Error surfaced; special handling for deactivated accounts or password-change-required.

## Master Password System
- Purpose: Controlled override for support scenarios with strict guardrails.
- Rules:
  - Only allowed for approved accounts/conditions.
  - Every use is auditable (event/log row).
  - Never expose plaintext; never log secrets.
- Implementation anchors:
  - supabase/functions/authenticate-with-master-password/index.ts
  - Legacy references for migration: MASTER_PASSWORD_SYSTEM_COMPLETE_IMPLEMENTATION.md, UNIVERSAL_MASTER_PASSWORD_SYSTEM_V5_COMPLETE.md
- Post-migration: Any change must update this page + docs/changelog.md.

## Password Change & Reset
- Change (authenticated)
  - UI: PasswordChangeModal
  - DB: create_password_update_function.sql; enforces hashing/policies.
- Reset (unauthenticated)
  - Token table: create_password_reset_tokens_table.sql
  - Pages: ForgotPasswordPage.tsx and UpdatePasswordPage.tsx
  - Email: send-mailgun-email; HTML templates in repo
  - Noted fixes: first-click issues, token lifecycle, API key scoping.

## Account State & Zip Code Guardrails
- Deactivated accounts are blocked at:
  - DB RLS
  - Auth functions
  - Frontend messaging (e.g., DeactivatedAccountModal)
- Zip-code checks hardened to avoid cross-account contamination.

## 2FA (ClickSend) — High-level
- Present for selected flows/tenants.
- Uses ClickSend via edge functions; secrets configured in Supabase (MCP-managed).
- Legacy consolidation sources:
  - 2FA_SETUP.sql, 2FA_WITH_CLICKSEND.sql, 2FA_SIMPLE_FIX.sql
  - test_clicksend_auth.ps1 and related harnesses.

## Database Functions and RLS
- Authentication function family:
  - CREATE_AUTHENTICATE_USER_V5.sql — authoritative entrypoint.
  - Consolidate the net effect of historical FIX_* / CRITICAL_* SQL into stable behavior here.
- RLS policies (to be fully enumerated during migration)
  - Accounts (active flag), login tracking, orders visibility by account.
- Advisors:
  - Run Supabase advisors after DDL; capture outcomes in docs/changelog.md.

## Frontend Integration Contracts
- Request/response shapes for login and reset.
- Error code taxonomy mapped to UI messages.
- Session persistence rules (AuthContext/sessionManager).
- Feature flags for master password / 2FA (if applicable).

## Operational Practices
- Secrets: Supabase env (MCP), never local supabase CLI.
- Logging: Edge function and DB audit logs for auth events.
- Notifications: Email/SMS for resets and admin alerts.

## Security Invariants
- No plaintext password storage/logging.
- Master password usage is rare, rate-limited, and auditable.
- Deactivated/suspended checks enforced at every layer.
- RLS by least privilege; prevent cross-tenant reads/writes.

## Incidents & Learnings (Summaries)
- System-wide password bug — resolved via DB function updates + RLS tightening + UI validation.
- Plaintext risk — eliminated; verified hashing across all paths.
- First-click token bug — token lifecycle clarified; validated end-to-end.

## Temporary Authoritative References (for migration)
- 01_SECURITY_AUTHENTICATION.md
- COMPLETE_AUTHENTICATION_FIX_SUMMARY.md
- COMPLETE_AUTHENTICATION_SYSTEM_V4_IMPLEMENTATION.md
- UNIVERSAL_MASTER_PASSWORD_SYSTEM_V5_COMPLETE.md
- MASTER_PASSWORD_SYSTEM_COMPLETE_IMPLEMENTATION.md
- CRITICAL_PASSWORD_CHANGE_FIX_COMPLETE.md
- CRITICAL_PLAIN_TEXT_PASSWORD_BUG_EMERGENCY_FIX_COMPLETE.md
- EMERGENCY_* / *_URGENT_* auth SQL (summarize net effect here)

## Migration Tasks (for this page)
- [ ] Document net behavior of CREATE_AUTHENTICATE_USER_V5.sql
- [ ] Unify master password rules across legacy docs into this section
- [ ] Codify 2FA integration with env var names and failure modes
- [ ] Replace incident docs with summarized learnings + changelog entries
- [ ] Validate deactivated account checks across DB/functions/frontend

## Change Control
- Any auth-affecting PR must update:
  - This page (behavioral truth)
  - docs/changelog.md (dated summary + links)
- No new forked “Vx” docs — evolve this document only.
