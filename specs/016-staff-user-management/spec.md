# Feature Specification: GuestFlow Staff User Management

**Feature Branch**: `cursor/staff-user-management-3989`

**Created**: 2026-09-24

**Status**: Ready for planning

**Input**: Basic user management for GuestFlow staff. Add and remove users (email + password). Email is the login identifier: required, unique, validated, case-insensitive (normalize to lowercase). Display name is optional. Profile per user: email, display name, created time, who created them, last login. Optional own-password change. Every signed-in user has identical full access — no roles, no permission tiers, no owner/admin, no RBAC. Any signed-in user can add or remove users, except they cannot remove themselves and cannot remove the last remaining user. Users page under Ops. Staff login becomes email + password. Logout required. Shared-password cookie replaced by per-user sessions. First user seeded from bootstrap email/password env when the user list is empty. Legacy shared-password login remains available behind a flag (default on) until Grant retires it. Passwords never stored or shown in recoverable form. Removing a user immediately ends their sessions. Record who added or removed whom (actor = email). Actor stamp on Approve&Send and access-code changes uses email, or display name if set with email stored.

**Clarifications**

- Session 2026-09-24 (Grant): login identifier is **email**, not username. Bootstrap env is `GUESTFLOW_BOOTSTRAP_EMAIL` / `GUESTFLOW_BOOTSTRAP_PASSWORD`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in as a named staff user (Priority: P1)

A staff member opens the staff login page, enters their email and password, and reaches the same ops console they use today. After sign-in they can log out. The old shared-password-only field is gone from the login form. Email is matched without regard to capital letters.

**Why this priority**: Without named sign-in, user management has nothing to attach sessions, audit, or last-login to. This is the gate for every later story.

**Independent Test**: With one seeded user, sign in at the staff login page using that email and password (including a different capitalisation of the same email). Confirm the ops console opens. Confirm a wrong password or invalid email is refused. Confirm logout returns the person to the login page and a later visit to an ops URL requires sign-in again.

**Acceptance Scenarios**:

1. **Given** a staff user exists, **When** they submit the correct email and password on the staff login page, **Then** they are signed in and reach the requested ops page (or home)
2. **Given** a staff user exists, **When** they submit the same email with different capital letters and the correct password, **Then** they are signed in
3. **Given** a staff user exists, **When** they submit a wrong password, unknown email, or an invalid email, **Then** they stay on the login page with a generic failure message and are not signed in
4. **Given** a signed-in staff user, **When** they choose logout, **Then** their session ends and the next ops visit requires sign-in
5. **Given** the login page, **When** a staff member views it, **Then** they see email and password fields (not password-only, not a username field)

---

### User Story 2 - Add and remove staff users (Priority: P1)

Any signed-in staff member can open Users under Ops, see everyone, add a person with an email, password, and optional display name, and remove a person after confirming. They cannot remove themselves. They cannot remove the last remaining user. The person who was removed cannot keep using an old session. Duplicate emails (ignoring capital letters) are refused. Invalid emails are refused.

**Why this priority**: This is the labour cut: stop sharing one password and stop asking Grant to rotate a single secret when someone leaves.

**Independent Test**: Sign in as user A. Add user B by email. Sign in as B and confirm B has the same ops access as A. As A, remove B after confirm. Confirm B’s next request is refused. Confirm A cannot remove A. With only A left, confirm remove is refused. Confirm adding `A@…` when `a@…` exists fails. Confirm adding `not-an-email` fails.

**Acceptance Scenarios**:

1. **Given** a signed-in staff user, **When** they open Users under Ops, **Then** they see a list of users with email, display name, created time, who created them, and last login time
2. **Given** a signed-in staff user, **When** they add a valid email and password (display name optional), **Then** the new user appears on the list and can sign in with that email and password
3. **Given** a signed-in staff user viewing another user, **When** they confirm remove, **Then** that user disappears and cannot sign in, and any existing session for that user is rejected on the next request
4. **Given** a signed-in staff user, **When** they try to remove themselves, **Then** the system refuses and they remain signed in
5. **Given** only one user remains, **When** anyone tries to remove that user, **Then** the system refuses and that user remains
6. **Given** any signed-in user, **When** they use Users, **Then** they have the same add/remove capability as every other user (no special owner or admin)
7. **Given** an email already on the list, **When** someone adds the same address with different capital letters, **Then** the add is refused
8. **Given** an invalid email string, **When** someone tries to add it, **Then** the add is refused

---

### User Story 3 - First user and legacy shared password (Priority: P1)

When no users exist yet, the first user is created from the approved bootstrap email and password environment values so the console is not locked out on deploy. Until Grant turns the flag off, the existing shared staff password still works and creates a real session attributed to the reserved legacy email.

**Why this priority**: Production staff must not be locked out the moment this ships. Bootstrap and legacy are the transition path, not a permanent design.

**Independent Test**: With an empty user list and bootstrap email/password env set, the first successful bootstrap creates that user. With the legacy flag on, the reserved legacy email plus shared password still signs someone in. With the flag off, that path is refused.

**Acceptance Scenarios**:

1. **Given** the user list is empty and bootstrap email/password are set, **When** the system prepares staff users, **Then** exactly one user is created from those values
2. **Given** the user list already has people, **When** bootstrap values are present, **Then** no extra bootstrap user is created
3. **Given** the legacy-login flag is on (the default when unset), **When** someone signs in with the reserved legacy email and the existing shared staff password, **Then** they receive a real session attributed to that reserved email
4. **Given** the legacy-login flag is off, **When** someone uses only the shared staff password, **Then** sign-in is refused

---

### User Story 4 - Change own password (Priority: P2)

A signed-in staff member can change their own password. They cannot change anyone else’s password from this flow.

**Why this priority**: Useful so people can stop sharing a known bootstrap or temporary password. Not required to add or remove users.

**Independent Test**: Sign in as A, change A’s password, confirm the old password fails and the new one works. Confirm A has no control on the Users page to set B’s password.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they submit their current password and a new password, **Then** later sign-in requires the new password
2. **Given** a signed-in user, **When** they submit a wrong current password, **Then** the password is unchanged
3. **Given** the Users page, **When** a user views another person, **Then** they can add or remove that person but cannot set that person’s password

---

### User Story 5 - Staff can see who added or removed whom (Priority: P2)

When someone adds or removes a user, the system records the actor email, the action, the target email, and the time. Approve&Send and access-code writes stamp the acting email, or the display name if set while still storing the email.

**Why this priority**: Named users only help if a departure or a surprise add can be reconstructed.

**Independent Test**: Add a user as A, remove them as A (after adding a third user so last-user guard does not block). Confirm the record shows A’s email added and removed the target email, with timestamps.

**Acceptance Scenarios**:

1. **Given** a signed-in user adds another user, **When** the add succeeds, **Then** a record exists with actor email, action “added”, target email, and timestamp
2. **Given** a signed-in user removes another user, **When** the remove succeeds, **Then** a record exists with actor email, action “removed”, target email, and timestamp

---

### Edge Cases

- Empty, whitespace-only, invalid, or duplicate emails are rejected; emails are stored lowercase and compared case-insensitively
- Empty passwords are rejected on add and on password change
- Rapid failed sign-in attempts from the same network address and email are delayed or refused after a small burst (rate limit)
- A removed user’s already-open browser tab is rejected on the next request; they do not keep working until the cookie ages out
- Signing in as the last remaining user and trying to remove that account is refused even if the confirmation UI is bypassed
- A user who is the only remaining user and also tries to remove themselves is refused for both reasons
- Legacy reserved email is a session attribution, not a removable listed user unless a real user with that email was added
- Bootstrap does nothing when bootstrap env is missing and the user list is empty; staff are not invented
- Existing guest portal, confirm-to-send, Approve&Send, and outbound-redirect behaviour stay as they are today
- Guest-facing hosts continue to hide staff/ops routes

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Staff login MUST require an email and a password
- **FR-002**: Sign-in MUST create a per-user session that is not shared across people and is not derived from a single shared password value
- **FR-003**: The session secret sent to the browser MUST be a cryptographically strong random identifier; only a one-way hash of that identifier MAY be stored
- **FR-004**: The session identifier MUST be delivered in a cookie that is HTTP-only, secure in production, and same-site lax
- **FR-005**: Sessions MUST expire after a sensible window (14 days, sliding on use or fixed — pick one and apply it consistently)
- **FR-006**: Logout MUST delete the session so the cookie no longer grants access
- **FR-007**: Every place that today accepts the shared-password cookie MUST accept only a valid current session
- **FR-008**: Passwords MUST be stored only as a one-way hash; passwords and hashes MUST never be logged, printed, or returned to the browser
- **FR-009**: Any signed-in user MUST be able to add a user (email + password, optional display name) and remove a user
- **FR-010**: The system MUST NOT introduce roles, permission tiers, owner/admin levels, a role column, or any other access split — every signed-in user has identical full access
- **FR-011**: A user MUST NOT be able to remove themselves
- **FR-012**: The system MUST refuse to remove the last remaining user, enforced on the server (not only in the browser), preferably as one atomic check-and-delete
- **FR-013**: Removing a user MUST delete all of that user’s sessions immediately
- **FR-014**: Each user profile MUST include email, optional display name, created time, created-by email, and last-login time
- **FR-015**: Users MUST be listed, added, and removed on a Users page under Ops at the staff Users URL
- **FR-016**: Logout MUST be available from the staff console
- **FR-017**: When the user list is empty, the system MUST seed the first user from the bootstrap email and password environment values if both are set
- **FR-018**: Legacy shared-password sign-in MUST remain available when the legacy-login flag is on, and MUST be off when the flag is explicitly disabled; the flag defaults to on so existing staff are not locked out
- **FR-019**: A successful legacy shared-password sign-in MUST create a real session attributed to a reserved legacy email
- **FR-020**: Failed sign-in MUST be rate-limited per network address + email
- **FR-021**: Add and remove MUST write an audit record with actor email, action, target email, and timestamp
- **FR-022**: A signed-in user MUST be able to change their own password by proving the current password
- **FR-023**: A schema-migrate script MUST exist for the new user, session, and audit tables and MUST NOT be applied to Production by the implementing agent
- **FR-024**: Guest send, confirm-token, Approve&Send, outbound redirect, templates, and nav structure MUST stay unchanged except for adding Users under Ops and adding logout
- **FR-025**: Approve&Send and access-code changes MUST stamp the acting email, or the display name if set while still storing the email
- **FR-026**: Email MUST be required, validated, stored lowercase, and unique on the normalized value
- **FR-027**: Display name MUST be optional and MUST NOT be used as the login identifier

### Key Entities

- **Staff user**: A person who can sign in. Attributes: email (login id), optional display name, password hash (never shown), created time, created-by email, last-login time. No role or owner flag.
- **Staff session**: A single sign-in. Attributes: hash of the random session identifier, which user it belongs to (or reserved legacy email attribution), created time, expiry, last-seen time.
- **User audit event**: A record that an actor email added or removed a target email at a time.
- **Login attempt**: A failed or counted sign-in used only to enforce the per-address-and-email rate limit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A staff member can add another user by email and that person can sign in on the first try in under two minutes
- **SC-002**: After a user is removed, 100% of that person’s subsequent ops requests are refused without waiting for cookie expiry
- **SC-003**: Self-remove and last-user-remove attempts fail 100% of the time, including when the confirmation step is skipped
- **SC-004**: Stored user records never contain a recoverable password; a reviewer inspecting stored user data sees only a hash
- **SC-005**: With the legacy flag left at default, existing shared-password staff can still sign in on the first deploy; with the flag off, that path fails
- **SC-006**: Staff stop sharing one password as the only way to give or revoke access — adding or removing a person replaces asking Grant to change a single shared secret
- **SC-007**: Login abuse from one address + email is throttled so a burst of failures does not keep succeeding at guessing
- **SC-008**: The same email with different capital letters counts as one user; invalid emails never become users

## Assumptions

- Staff users are a small household/ops group (Grant, Liana, and a few Dullstroom/ops people), not a public signup
- Email is the only login identifier; display name is a label only
- “Last remaining user” counts rows in the staff user list, not live sessions
- Session length is 14 days sliding (each successful authenticated request may refresh expiry up to that window)
- Rate limit is enforced in durable storage (not only in one server’s memory) so it still works on serverless hosts; the plan will name the exact budget
- Bootstrap env values are set by Grant in the host environment; agents do not invent or commit them
- Reserved legacy email is for the shared-password transition and is not created as a normal removable user by bootstrap
- Stamping the acting email (or display name plus email) on Approve&Send / access-code writes is in scope
- Outbound redirect stays exactly as it is today
- No Production schema apply, no Production deploy, no guest messages
- Runtime table-ensure is acceptable only if it matches the existing GuestFlow ensure-schema pattern; the migrate script remains the official Production apply path after Grant approval

## Ritual removed

Sharing one staff password and asking Grant to rotate it when someone should lose access.

## Artefact Grant can use this week

Staff login at `/staff-login` (email + password), Users at `/ops/users`, and logout in the staff console — on Preview only until Grant approves deploy and migration.
