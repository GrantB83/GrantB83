# Contract: Staff auth

Base: existing `POST /api/staff-auth`. Middleware still skips this path so login works without a session.

## POST /api/staff-auth (login)

**Request JSON**:

```json
{ "email": "liana@thebrowns.co.za", "password": "••••" }
```

**Success (200)**: `{ "success": true, "email": "liana@thebrowns.co.za", "display_name": "Liana" }`  
`email` is the normalized lowercase value. Sets `guestflow_staff_session` cookie (HttpOnly, SameSite=Lax, Secure in production, 14-day max-age). Body never includes password or hash.

**Failures**:
- 401 `{ "error": "Invalid email or password" }` — unknown user, bad password, invalid email, or legacy path refused
- 429 `{ "error": "Too many login attempts. Try again later." }` — ≥5 failures in 15 minutes for IP+email
- 500 `{ "error": "Staff password not configured" }` — production, no users, no bootstrap, no usable legacy (same fail-closed spirit as today)

**Legacy**: if `GUESTFLOW_LEGACY_LOGIN` is enabled (default) and `email` normalizes to `legacy@guestflow.local` and `password` equals `STAFF_PASSWORD`, create a session with `email=legacy@guestflow.local`, `user_id=null`.

**Bootstrap**: before verify, `ensureStaffUsersSchema` may insert the first user from `GUESTFLOW_BOOTSTRAP_EMAIL` / `GUESTFLOW_BOOTSTRAP_PASSWORD` when the table is empty.

**Side effects**: on success, set `staff_users.last_login_at` for named users; insert `staff_sessions`; clear `staff_login_attempts` for that IP+email. On failure, insert an attempt row.

## POST /api/staff-auth/logout

**Auth**: cookie optional (idempotent).

**Success (200)**: `{ "success": true }`  
Deletes the session row if the cookie hashes to a stored token. Clears the cookie.

## GET /api/staff-auth (unchanged)

405 Method not allowed.
