# Contract: Staff users

All routes require a valid staff session (middleware + Node `requireStaffSession`). Every signed-in user has the same access.

List/add/remove never return `password_hash` or plaintext passwords.

## GET /api/staff/users

**Success (200)**:

```json
{
  "success": true,
  "email": "liana@thebrowns.co.za",
  "display_name": "Liana",
  "users": [
    {
      "id": 1,
      "email": "liana@thebrowns.co.za",
      "display_name": "Liana",
      "created_at": "2026-09-24T12:00:00.000Z",
      "created_by": "bootstrap",
      "last_login_at": "2026-09-24T13:00:00.000Z"
    }
  ]
}
```

`email` is the caller (for self-remove UI). 401 if no session.

## POST /api/staff/users

**Request**: `{ "email": "grant@thebrowns.co.za", "password": "••••", "display_name": "Grant" }`  
`display_name` is optional.

**Success (201)**: `{ "success": true, "user": { "id": 2, "email": "grant@thebrowns.co.za", "display_name": "Grant", "created_at": "…", "created_by": "liana@thebrowns.co.za", "last_login_at": null } }`

**Failures**:
- 400 missing/blank/invalid email, empty password, reserved `legacy@guestflow.local`, duplicate email (case-insensitive)
- 401 no session

**Side effects**: hashed insert; `staff_user_audit` row `add` with actor/target emails.

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

**Side effects**: update `password_hash`; audit `password_change` with target = self email.
