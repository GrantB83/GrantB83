# Data Model: GuestFlow Staff User Management

Tables are new. No role, owner, or permission column on any of them.

## staff_users

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| username | TEXT | NOT NULL, UNIQUE (store trimmed; compare case-insensitive via unique index on `lower(username)`) |
| password_hash | TEXT | NOT NULL (bcryptjs hash). Never selected in list/API responses |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| created_by | TEXT | NOT NULL (actor username, or `bootstrap`) |
| last_login_at | DATETIME | NULL until first successful login |

**Validation**:
- username: trim, reject empty, reject if `lower(username)` already exists, reject reserved `legacy` for normal add (legacy is session-only)
- password: reject empty on add and change; hash before insert

**No columns**: role, is_admin, is_owner, permissions

## staff_sessions

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_id | INTEGER | NULL for legacy shared-password sessions; FK-like to staff_users.id for named users |
| username | TEXT | NOT NULL (denormalized for audit/legacy; `legacy` when user_id is null) |
| token_hash | TEXT | NOT NULL UNIQUE (SHA-256 hex of raw cookie value) |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| last_seen_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| expires_at | DATETIME | NOT NULL (created_at + 14 days; sliding refresh) |

**Rules**:
- Cookie holds the raw token; DB holds only `token_hash`
- Logout deletes the matching row
- User remove deletes all rows for that `user_id`
- Lookup fails if `expires_at` ≤ now

## staff_user_audit

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| actor | TEXT | NOT NULL |
| action | TEXT | NOT NULL (`add`, `remove`, `password_change`) |
| target | TEXT | NOT NULL (username affected) |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |

Dedicated table (do not overload guest `audit_log` or access-code audit).

## staff_login_attempts

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| ip | TEXT | NOT NULL |
| username | TEXT | NOT NULL (normalized lower/trim) |
| attempted_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Rules**: count rows for `(ip, username)` in the last 15 minutes; block at ≥ 5 failures; delete that pair on success.

## Indexes

```sql
CREATE UNIQUE INDEX idx_staff_users_username_lower ON staff_users(lower(username));
CREATE UNIQUE INDEX idx_staff_sessions_token_hash ON staff_sessions(token_hash);
CREATE INDEX idx_staff_sessions_user_id ON staff_sessions(user_id);
CREATE INDEX idx_staff_sessions_expires ON staff_sessions(expires_at);
CREATE INDEX idx_staff_login_attempts_pair_time ON staff_login_attempts(ip, username, attempted_at);
CREATE INDEX idx_staff_user_audit_created ON staff_user_audit(created_at);
```

## State transitions

```text
[empty users] --bootstrap env present--> [one user, created_by=bootstrap]
[signed in] --add user--> [N+1 users] + audit add
[signed in, N>=2, target≠self] --remove--> [N-1 users] + sessions deleted + audit remove
[signed in] --self or last--> refused, no delete
[session valid] --logout or remove or expiry--> [no access]
[legacy flag on] --username legacy + STAFF_PASSWORD--> session username=legacy, user_id null
```

## Relationships

- `staff_sessions.user_id` → `staff_users.id` (nullable)
- Audit `actor` / `target` are usernames, not required FKs (survive remove)
