# GuestFlow staff users

Named staff logins replace the shared `staff_auth` cookie. Login identifier is **email**. Display name is optional. Every signed-in user has identical full access. No roles.

## Env vars

| Name | Purpose | Default |
| --- | --- | --- |
| `GUESTFLOW_BOOTSTRAP_EMAIL` | First email when `staff_users` is empty | unset (no seed) |
| `GUESTFLOW_BOOTSTRAP_PASSWORD` | First password (hashed before store) | unset |
| `GUESTFLOW_LEGACY_LOGIN` | Allow `legacy@guestflow.local` + `STAFF_PASSWORD` | **on** unless `0` / `false` / `off` |
| `STAFF_PASSWORD` | Existing shared password for the legacy path | existing |
| `STAFF_BCRYPT_ROUNDS` | bcryptjs cost (tests may use `4`) | `10` |

Never commit these values.

## Bootstrap (chosen approach)

**Seed the first user from env when the users table is empty.** `ensureStaffUsersSchema()` (login / users APIs) and `scripts/migrate-staff-users.js` both do this from `GUESTFLOW_BOOTSTRAP_EMAIL` / `GUESTFLOW_BOOTSTRAP_PASSWORD`. If the table already has rows, bootstrap is a no-op.

## Rate limit

**DB-backed** (`staff_login_attempts`): 5 failed attempts per 15 minutes per IP + email. Not memory-backed (Vercel isolates do not share memory).

## Sessions

Cookie `guestflow_staff_session`: random 32-byte base64url ID, HttpOnly, SameSite=Lax, Secure on production/Vercel, 14-day sliding expiry. DB stores SHA-256 of the ID only. Logout and user-remove delete session rows.

Middleware: Turso lookup when `DATABASE_URL` + `TURSO_AUTH_TOKEN` are set. Local sqlite/dev accepts a well-formed cookie; APIs still run the real Node check. Development still skips auth when `STAFF_PASSWORD` is unset (same as today).

## Migrate (do not apply to Production from this agent)

```bash
cd apps/guestflow
npm run db:migrate:staff-users
```

Runtime `ensureStaffUsersSchema()` matches the Phase 0 / UMI ensure-schema pattern.

## Access URLs

- `/staff-login` (email + password)
- `/ops/users`

## Safety

Outbound redirect, confirmToken, and Approve&Send behaviour are unchanged except the acting email (or `display_name <email>`) is stamped on access-code upsert and email-send audit when a session exists.
