# Contract: Staff users

All routes require a valid staff session (middleware + Node `requireStaffSession`). Every signed-in user has the same access.

List/add/remove never return `password_hash` or plaintext passwords.

## GET /api/staff/users

**Success (200)**:

```json
{
  "success": true,
  "username": "liana",
  "users": [
    {
      "id": 1,
      "username": "liana",
      "created_at": "2026-09-24T12:00:00.000Z",
      "created_by": "bootstrap",
      "last_login_at": "2026-09-24T13:00:00.000Z"
    }
  ]
}
```

`username` is the caller (for self-remove UI). 401 if no session.

## POST /api/staff/users

**Request**: `{ "username": "grant", "password": "••••" }`

**Success (201)**: `{ "success": true, "user": { "id": 2, "username": "grant", "created_at": "…", "created_by": "liana", "last_login_at": null } }`

**Failures**:
- 400 missing/blank username or password, reserved `legacy`, duplicate username
- 401 no session

**Side effects**: hashed insert; `staff_user_audit` row `add`.

## DELETE /api/staff/users/:id

**Success (200)**: `{ "success": true }`

**Failures**:
- 400 self-remove (`"Cannot remove yourself"`)
- 400 last remaining user (`"Cannot remove the last remaining user"`)
- 404 unknown id
- 401 no session

**Side effects** (one batch/transaction): delete `staff_sessions` for that `user_id`, delete `staff_users` row, `staff_user_audit` `remove`.

## POST /api/staff/me/password

**Request**: `{ "currentPassword": "••••", "newPassword": "••••" }`

**Success (200)**: `{ "success": true }`

**Failures**:
- 400 empty new password
- 401 no session or current password wrong
- 400 if caller is legacy (no `user_id`) — cannot change a non-user password here

**Side effects**: update `password_hash`; audit `password_change` with target = self. Other sessions may remain until expiry (not required to revoke).
