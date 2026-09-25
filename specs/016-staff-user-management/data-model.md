# Data Model: GuestFlow Staff User Management

Tables are new. No role, owner, or permission column on any of them.

## staff_users

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| email | TEXT | NOT NULL, stored lowercase; UNIQUE index on `email` (already normalized) |
| display_name | TEXT | NULL (optional label; not a login id) |
| password_hash | TEXT | NOT NULL (bcryptjs hash). Never selected in list/API responses |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| created_by | TEXT | NOT NULL (actor email, or `bootstrap`) |
| last_login_at | DATETIME | NULL until first successful login |

**Validation**:
- email: trim, lowercase, reject empty/invalid, reject if already exists, reject reserved `legacy@guestflow.local` for normal add
- display_name: trim; empty becomes NULL
- password: reject empty on add and change; hash before insert

**No columns**: role, is_admin, is_owner, permissions, username

## staff_sessions

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_id | INTEGER | NULL for legacy shared-password sessions; otherwise staff_users.id |
| email | TEXT | NOT NULL (denormalized; `legacy@guestflow.local` when user_id is null) |
| display_name | TEXT | NULL (copied at login for actor stamps) |
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
| actor | TEXT | NOT NULL (actor email) |
| action | TEXT | NOT NULL (`add`, `remove`, `password_change`) |
| target | TEXT | NOT NULL (target email) |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |

Dedicated table (do not overload guest `audit_log` or access-code audit). Decision L also writes `action=outbound_redirect_flip` with `target` = `on->off` or `off->on`.

## staff_login_attempts

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| ip | TEXT | NOT NULL |
| email | TEXT | NOT NULL (normalized lowercase) |
| attempted_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |

**Rules**: count rows for `(ip, email)` in the last 15 minutes; block at ≥ 5 failures; delete that pair on success.

## app_settings (Decision L)

| Column | Type | Constraints |
| --- | --- | --- |
| key | TEXT | PRIMARY KEY (`outbound_redirect`) |
| value | TEXT | NOT NULL (`on` or `off`; anything else treated as `on` at read time) |
| updated_at | DATETIME | NOT NULL |
| updated_by | TEXT | NOT NULL (actor email, or `seed`) |

**Rules**:
- Seed ON (`INSERT OR IGNORE`). `OUTBOUND_MODE=live` may seed `off`; otherwise seed `on`
- After seed, env is ignored for resolution
- Missing / unreadable / garbage / DB error → ON
- One global row, not per user

## Indexes

```sql
CREATE UNIQUE INDEX idx_staff_users_email ON staff_users(email);
CREATE UNIQUE INDEX idx_staff_sessions_token_hash ON staff_sessions(token_hash);
CREATE INDEX idx_staff_sessions_user_id ON staff_sessions(user_id);
CREATE INDEX idx_staff_sessions_expires ON staff_sessions(expires_at);
CREATE INDEX idx_staff_login_attempts_pair_time ON staff_login_attempts(ip, email, attempted_at);
CREATE INDEX idx_staff_user_audit_created ON staff_user_audit(created_at);
```

## State transitions

```text
[empty users] --bootstrap env present--> [one user, created_by=bootstrap]
[signed in] --add user--> [N+1 users] + audit add
[signed in, N>=2, target≠self] --remove--> [N-1 users] + sessions deleted + audit remove
[signed in] --self or last--> refused, no delete
[session valid] --logout or remove or expiry--> [no access]
[legacy flag on] --email legacy@guestflow.local + STAFF_PASSWORD--> session email=legacy@guestflow.local, user_id null
```

## Relationships

- `staff_sessions.user_id` → `staff_users.id` (nullable)
- Audit `actor` / `target` are emails, not required FKs (survive remove)
