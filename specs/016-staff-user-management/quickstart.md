# Quickstart: Staff User Management

Validation guide for Preview / local. Do **not** apply the migrate script to Production. Do **not** send guest messages.

## Prerequisites

- `apps/guestflow` dependencies installed
- Local sqlite (`data/guestflow.db`) or a **non-Production** Turso database
- Env (local or Vercel Preview — never commit values):

```text
GUESTFLOW_BOOTSTRAP_USER=<first username>
GUESTFLOW_BOOTSTRAP_PASSWORD=<first password>
GUESTFLOW_LEGACY_LOGIN=1
STAFF_PASSWORD=<existing shared password>
```

`GUESTFLOW_LEGACY_LOGIN` defaults on when unset. Set `0` only when testing lock-out of the shared password.

## Migrate (non-Production only)

```bash
cd apps/guestflow
node scripts/migrate-staff-users.js
```

Expected: creates `staff_users`, `staff_sessions`, `staff_user_audit`, `staff_login_attempts` (and indexes). If bootstrap env is set and the users table is empty, inserts one hashed user.

## Automated tests

```bash
cd apps/guestflow
npm test -- src/lib/__tests__/staff-auth.test.ts __tests__/staff-users-api.test.ts __tests__/staff-login-ui.test.ts
npm run lint
npm run build
```

Expected: add/remove, self-remove guard, last-user guard, hashed storage, session revoke, legacy flag on/off, rate limit all pass. Lint/build clean.

## Manual Preview checks

1. Open `/staff-login` — username + password fields (not password-only)
2. Sign in with bootstrap user (or `legacy` + `STAFF_PASSWORD` while flag is on)
3. Open `/ops` — Users card present; logout control visible
4. Open `/ops/users` — list shows username, created, created by, last login
5. Add a second user, sign in as them, confirm same ops access
6. Remove the second user with confirm — their next request is refused
7. Confirm you cannot remove yourself; with one user left, remove is refused
8. Optional: change own password; old password fails
9. Confirm outbound-redirect banner still matches today; Approve&Send / confirmToken unchanged

## Access URLs

- Login: `/staff-login`
- Users: `/ops/users`

## Production apply (Grant only — not this agent)

Requires `APPROVE APPLY MIGRATION` then `APPROVE DEPLOY guestflow`. Until then, Preview only.
