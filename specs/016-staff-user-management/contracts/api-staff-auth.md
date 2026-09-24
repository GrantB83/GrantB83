# Contract: Staff auth

Base: existing `POST /api/staff-auth`. Middleware still skips this path so login works without a session.

## POST /api/staff-auth (login)

**Request JSON**:

```json
{ "username": "liana", "password": "••••" }
```

**Success (200)**: `{ "success": true, "username": "liana" }`  
Sets `guestflow_staff_session` cookie (HttpOnly, SameSite=Lax, Secure in production, 14-day max-age). Body never includes password or hash.

**Failures**:
- 401 `{ "error": "Invalid username or password" }` — unknown user, bad password, or legacy path refused
- 429 `{ "error": "Too many login attempts. Try again later." }` — ≥5 failures in 15 minutes for IP+username
- 500 `{ "error": "Staff password not configured" }` — production, no users, no bootstrap, no usable legacy (same fail-closed spirit as today)

**Legacy**: if `GUESTFLOW_LEGACY_LOGIN` is enabled (default) and `username` is `legacy` (case-insensitive) and `password` equals `STAFF_PASSWORD`, create a session with `username=legacy`, `user_id=null`.

**Bootstrap**: before verify, `ensureStaffUsersSchema` may insert the first user from bootstrap env when the table is empty.

**Side effects**: on success, set `staff_users.last_login_at` for named users; insert `staff_sessions`; clear `staff_login_attempts` for that IP+username. On failure, insert an attempt row.

## POST /api/staff-auth/logout

**Auth**: cookie optional (idempotent).

**Success (200)**: `{ "success": true }`  
Deletes the session row if the cookie hashes to a stored token. Clears the cookie.

## GET /api/staff-auth (unchanged)

405 Method not allowed.
