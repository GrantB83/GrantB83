# Research: GuestFlow Staff User Management

**Date**: 2026-09-24  
**Feature**: `specs/016-staff-user-management`

## 1. Password hashing library

**Decision**: `bcryptjs` (pure JavaScript bcrypt), cost factor 10.

**Rationale**: Builds on Vercel Node serverless without native addons. `@node-rs/argon2` is stronger but ships native bindings that have failed GuestFlow-class Vercel builds. `bcrypt` (native) has the same risk. Login and password-change run in Node route handlers, not Edge middleware, so `bcryptjs` is available.

**Alternatives considered**:
- `@node-rs/argon2` — preferred algorithm, rejected for Vercel native-binary risk
- `bcrypt` (C++) — same native risk
- Web Crypto PBKDF2 — no bcrypt/argon2 compatibility, weaker operational familiarity

## 2. Session identifier and cookie

**Decision**:
- Cookie name: `guestflow_staff_session` (replaces `staff_auth`)
- Value: 32 random bytes, base64url (crypto.getRandomValues / node `crypto.randomBytes`)
- Store: SHA-256 hex of the raw identifier in `staff_sessions.token_hash`
- Flags: `HttpOnly`, `SameSite=Lax`, `Secure` when `NODE_ENV=production` or `VERCEL=1`, `Path=/`, `Max-Age=14 days`
- Expiry: 14-day **sliding** window — successful session check may refresh `expires_at` and `last_seen_at`

**Rationale**: Matches FR-002–FR-006. New cookie name so leftover base64-of-shared-password cookies fail closed. Hash-at-rest so a Turso dump does not yield live cookies.

**Alternatives considered**:
- Keep cookie name `staff_auth` — rejected; old cookies would look valid
- JWT in cookie — rejected; spec requires a sessions table and immediate revoke
- Fixed 14-day expiry — acceptable; sliding is slightly better UX for daily ops

## 3. Where session is checked (Edge vs Node)

**Decision**:
- Shared helpers in `src/lib/staff-session.ts` (Node, `getDbAsync`)
- Edge-safe lookup in `src/lib/staff-session-edge.ts` using `@libsql/client` + Web Crypto SHA-256
- Middleware: if `DATABASE_URL` + `TURSO_AUTH_TOKEN` are set, query Turso; if local sqlite (no Turso), accept a well-formed cookie only in `NODE_ENV=development` and still run the real check in Node helpers used by staff APIs; production without Turso stays fail-closed (same spirit as today when `STAFF_PASSWORD` is unset in production)
- Keep today’s development skip: no `STAFF_PASSWORD` and `NODE_ENV=development` → no login required
- Every previous `staff_auth` compare site is replaced (middleware + `POST /api/staff-auth`)

**Rationale**: Next.js middleware is Edge and cannot use `better-sqlite3`. Preview/Production already use Turso. User-management APIs always use Node `requireStaffSession`.

**Alternatives considered**:
- Middleware-only cookie presence check — rejected; deleted sessions would still open pages
- HMAC-only cookie without DB — rejected; cannot revoke on remove

## 4. Rate limit

**Decision**: **DB-backed** table `staff_login_attempts`. Budget: **5 failed attempts per 15 minutes per IP + username**. Further failures return 429 with a generic message. Successful login deletes that pair’s recent rows. IP from `x-forwarded-for` first hop or `x-real-ip`.

**Rationale**: Memory limits do not hold across Vercel isolates. DB matches existing Turso patterns.

**Alternatives considered**:
- In-memory Map — rejected for serverless
- Upstash Redis — new product, violates constitution V

## 5. Bootstrap

**Decision**: When `staff_users` is empty and both `GUESTFLOW_BOOTSTRAP_USER` and `GUESTFLOW_BOOTSTRAP_PASSWORD` are non-empty, insert one user (`created_by = 'bootstrap'`). Runs inside `ensureStaffUsersSchema` (login, users API, migrate script). Never invent a user if env is missing.

**Rationale**: Spec-preferred path. First deploy is not locked out if Grant sets the two env vars.

## 6. Legacy shared-password login

**Decision**: `GUESTFLOW_LEGACY_LOGIN` defaults **on**. Treated as enabled unless the value is exactly `0` or `false` (case-insensitive). When enabled, username `legacy` + password equal to `STAFF_PASSWORD` creates a real session row with `username = 'legacy'` and `user_id` null. No `staff_users` row is created for `legacy`, so last-user and Users list stay honest. Flag off → this path is refused.

**Rationale**: Default-on avoids lockout. Reserved username keeps audit/session attribution without a fake removable user.

## 7. Last-user and self-remove

**Decision**: Server-side in the delete path, inside `db.batch` (sqlite transaction / Turso write batch): count users → reject if `id` is the actor → reject if count ≤ 1 → delete sessions for that user → delete user → insert audit. UI also hides/disables those actions.

## 8. Actor stamp on existing writes

**Decision**: **In scope (trivial)**. Access-code upsert currently writes `staffId = 'staff'`. Approve&Send email audit currently writes actor `'Grant'`. Both can call `getStaffSessionFromRequest` and use `session.username` (fallback `'staff'` / existing value if no session, e.g. local skip-auth). confirmToken flow otherwise untouched.

## 9. Schema apply

**Decision**: New `scripts/migrate-staff-users.js` (same Turso-or-local pattern as `migrate-umi-v21.js`) plus runtime `ensureStaffUsersSchema()` like Phase 0 / UMI. Agent does **not** run the migrate script against Production.

## 10. Scope freeze

**Decision**: No roles column. No top-nav Users link (Users is an Ops card + `/ops/users` only). Logout control in the existing staff nav chrome. No template, confirmToken, or outbound-redirect changes.
