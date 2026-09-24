# Research: GuestFlow Staff User Management

**Date**: 2026-09-24  
**Feature**: `specs/016-staff-user-management`

## 1. Password hashing library

**Decision**: `bcryptjs` (pure JavaScript bcrypt), cost factor 10.

**Rationale**: Builds on Vercel Node serverless without native addons. `@node-rs/argon2` is stronger but ships native bindings that have failed GuestFlow-class Vercel builds. Login and password-change run in Node route handlers, not Edge middleware, so `bcryptjs` is available.

**Alternatives considered**: `@node-rs/argon2`, native `bcrypt`, Web Crypto PBKDF2.

## 2. Session identifier and cookie

**Decision**:
- Cookie name: `guestflow_staff_session` (replaces `staff_auth`)
- Value: 32 random bytes, base64url
- Store: SHA-256 hex of the raw identifier in `staff_sessions.token_hash`
- Flags: `HttpOnly`, `SameSite=Lax`, `Secure` when `NODE_ENV=production` or `VERCEL=1`, `Path=/`, `Max-Age=14 days`
- Expiry: 14-day **sliding** window

**Rationale**: Matches FR-002–FR-006. New cookie name so leftover base64-of-shared-password cookies fail closed.

## 3. Login identifier: email

**Decision**: Email is the only login identifier. Normalize with trim + lowercase. Validate with a conservative `local@domain.tld` check. Unique index on the stored (already lowercase) `email` column. Optional `display_name` is a label only.

**Rationale**: Grant 24 Sep 2026 scope change. Case-insensitive uniqueness is the unique index on the normalized value.

**Alternatives considered**: username (superseded).

## 4. Where session is checked (Edge vs Node)

**Decision**:
- Node helpers in `src/lib/staff-session.ts`
- Edge Turso lookup in `src/lib/staff-session-edge.ts` (`@libsql/client/web` + Web Crypto SHA-256)
- Middleware: Turso when `DATABASE_URL` + `TURSO_AUTH_TOKEN` set; local sqlite/dev accepts a well-formed cookie; development skip when `STAFF_PASSWORD` unset (same as today)

## 5. Rate limit

**Decision**: **DB-backed** table `staff_login_attempts`. Budget: **5 failed attempts per 15 minutes per IP + email**. Success clears that pair. IP from `x-forwarded-for` first hop or `x-real-ip`.

## 6. Bootstrap

**Decision**: When `staff_users` is empty and both `GUESTFLOW_BOOTSTRAP_EMAIL` and `GUESTFLOW_BOOTSTRAP_PASSWORD` are non-empty, insert one user (`created_by = 'bootstrap'`). Runs inside `ensureStaffUsersSchema` and the migrate script. Never invent a user if env is missing. Bootstrap email must pass the same validation.

## 7. Legacy shared-password login

**Decision**: `GUESTFLOW_LEGACY_LOGIN` defaults **on** unless `0` / `false` / `off`. When enabled, email `legacy@guestflow.local` + password equal to `STAFF_PASSWORD` creates a session with `email = 'legacy@guestflow.local'` and `user_id` null. No `staff_users` row. Flag off → refused. Reserved email cannot be added as a normal user.

**Rationale**: Login is now email; a reserved email keeps the original “attributed to legacy” session without a fake removable user.

## 8. Actor stamp

**Decision**: User-management audit stores **email** as actor and target. Access-code upsert and Approve&Send email audit use `display_name <email>` when display name is set, otherwise the email. Fallback remains `'staff'` / `'Grant'` when no session (local skip-auth).

## 9. Schema apply

**Decision**: `scripts/migrate-staff-users.js` plus runtime `ensureStaffUsersSchema()`. Agent does **not** run the migrate script against Production.

## 10. Scope freeze

**Decision**: No roles column. Users is an Ops card + `/ops/users` only. Logout in existing nav chrome. No template, confirmToken, or outbound-redirect changes.
