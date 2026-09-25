# Tasks: GuestFlow Staff User Management

**Input**: Design documents from `/specs/016-staff-user-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by the feature request (add/remove, self-remove, last-user, hashed storage, session revoke, legacy flag, rate limit).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and feature wiring in the existing GuestFlow app

- [x] T001 Add `bcryptjs` and `@types/bcryptjs` in `apps/guestflow/package.json`
- [x] T002 Add `db:migrate:staff-users` script entry in `apps/guestflow/package.json` pointing at `apps/guestflow/scripts/migrate-staff-users.js`
- [x] T003 [P] Verify `.gitignore` already ignores `.env*` / `node_modules/` / `*.log` at repo and `apps/guestflow` (append only if missing)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, migrate script, password/session primitives. BLOCKS all user stories.

- [x] T004 Create DDL + `ensureStaffUsersSchema()` + empty-table bootstrap from `GUESTFLOW_BOOTSTRAP_EMAIL` / `GUESTFLOW_BOOTSTRAP_PASSWORD` (`created_by` NOT NULL, bootstrap value `bootstrap`; email stored lowercase with unique index on `email`; optional `display_name`; NO role or username column) in `apps/guestflow/src/lib/staff-users-schema.ts`
- [x] T005 Create Turso-or-local migrate script (do not apply to Production) for `staff_users`, `staff_sessions`, `staff_user_audit`, `staff_login_attempts` in `apps/guestflow/scripts/migrate-staff-users.js`
- [x] T006 Implement password hash/verify with bcryptjs (never log or return hashes) and email normalize/validate (trim, lowercase, reject invalid) in `apps/guestflow/src/lib/staff-auth.ts`
- [x] T007 Implement session create/lookup/delete: crypto-strong raw token, SHA-256 `token_hash` only in DB, 14-day sliding expiry, cookie name `guestflow_staff_session` in `apps/guestflow/src/lib/staff-session.ts`
- [x] T008 [P] Implement Edge Turso session lookup (Web Crypto SHA-256, `@libsql/client`, no better-sqlite3) in `apps/guestflow/src/lib/staff-session-edge.ts`
- [x] T009 Implement DB-backed login rate limit (5 failures / 15 minutes / IP+email; clear on success) in `apps/guestflow/src/lib/staff-auth.ts`
- [x] T010 Implement `isLegacyLoginEnabled()` (default on unless `GUESTFLOW_LEGACY_LOGIN` is `0` or `false`) in `apps/guestflow/src/lib/staff-auth.ts`

**Checkpoint**: Foundation ready — user stories can proceed

---

## Phase 3: User Story 1 - Sign in as a named staff user (Priority: P1) 🎯 MVP

**Goal**: Email+password login, per-user session cookie, logout, replace shared-password cookie checks

**Independent Test**: Seed one user, sign in at `/staff-login`, reach ops, logout, next ops visit requires sign-in

### Tests for User Story 1

- [x] T011 [P] [US1] Tests for hash-not-plaintext, session create/lookup, logout deletes session in `apps/guestflow/src/lib/__tests__/staff-auth.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Change login to email+password and issue session cookie in `apps/guestflow/src/app/api/staff-auth/route.ts`
- [x] T013 [US1] Add logout that deletes the session row and clears the cookie in `apps/guestflow/src/app/api/staff-auth/logout/route.ts`
- [x] T014 [US1] Replace `staff_auth` base64-of-shared-password check with session lookup in `apps/guestflow/src/middleware.ts`
- [x] T015 [US1] Change `/staff-login` form to email + password in `apps/guestflow/src/app/staff-login/page.tsx`
- [x] T016 [US1] Add logout control in `apps/guestflow/src/components/Navigation.tsx`
- [x] T017 [P] [US1] Source test that login is email+password and logout exists in `apps/guestflow/__tests__/staff-login-ui.test.ts`

**Checkpoint**: Named sign-in and logout work without Users CRUD

---

## Phase 4: User Story 2 - Add and remove staff users (Priority: P1)

**Goal**: Any signed-in user can list/add/remove; server-side self-remove and last-user guards; revoke sessions on remove; Users page under Ops

**Independent Test**: A adds B; B has full access; A removes B; B’s next request refused; A cannot remove A; last user cannot be removed

### Tests for User Story 2

- [x] T018 [P] [US2] Tests for add/remove, self-remove guard, last-user guard, session revoke on remove, no plaintext in `apps/guestflow/src/lib/__tests__/staff-auth.test.ts`
- [x] T019 [P] [US2] API tests for GET/POST/DELETE users in `apps/guestflow/__tests__/staff-users-api.test.ts`

### Implementation for User Story 2

- [x] T020 [US2] Implement list (never select `password_hash`) and add user (email unique case-insensitive; validate email; optional display_name; reject reserved `legacy@guestflow.local`; `created_by` = actor email) in `apps/guestflow/src/lib/staff-auth.ts`
- [x] T021 [US2] Implement remove user in one batch/transaction: refuse self, refuse last remaining user (`COUNT(*)` guard), delete that user’s sessions, delete user in `apps/guestflow/src/lib/staff-auth.ts`
- [x] T022 [US2] Add GET/POST `/api/staff/users` in `apps/guestflow/src/app/api/staff/users/route.ts`
- [x] T023 [US2] Add DELETE `/api/staff/users/:id` in `apps/guestflow/src/app/api/staff/users/[id]/route.ts`
- [x] T024 [US2] Build Users page (list, add, remove with confirm) at `apps/guestflow/src/app/ops/users/page.tsx`
- [x] T025 [US2] Add Users card under Ops (not top nav) in `apps/guestflow/src/app/ops/page.tsx`

**Checkpoint**: Users CRUD + guards + Ops entry work

---

## Phase 5: User Story 3 - First user and legacy shared password (Priority: P1)

**Goal**: Bootstrap when table empty; legacy `legacy@guestflow.local` + `STAFF_PASSWORD` session when flag on

**Independent Test**: Empty table + bootstrap env creates one user; legacy flag on signs in as `legacy@guestflow.local`; flag off refuses shared password

### Tests for User Story 3

- [x] T026 [P] [US3] Tests for bootstrap-once and legacy flag on/off in `apps/guestflow/src/lib/__tests__/staff-auth.test.ts`

### Implementation for User Story 3

- [x] T027 [US3] Wire bootstrap into login/users ensure path in `apps/guestflow/src/lib/staff-users-schema.ts` and `apps/guestflow/src/app/api/staff-auth/route.ts`
- [x] T028 [US3] Implement legacy login path (session `email=legacy@guestflow.local`, `user_id` null; no `staff_users` row) in `apps/guestflow/src/lib/staff-auth.ts` and `apps/guestflow/src/app/api/staff-auth/route.ts`

**Checkpoint**: Deploy will not lock out existing shared-password staff

---

## Phase 6: User Story 4 - Change own password (Priority: P2)

**Goal**: Signed-in named user can change their own password only

**Independent Test**: A changes password; old fails; new works; no control to set B’s password

### Tests for User Story 4

- [x] T029 [P] [US4] Tests for own-password change and wrong current password in `apps/guestflow/src/lib/__tests__/staff-auth.test.ts`

### Implementation for User Story 4

- [x] T030 [US4] Implement `changeOwnPassword` in `apps/guestflow/src/lib/staff-auth.ts`
- [x] T031 [US4] Add POST `/api/staff/me/password` in `apps/guestflow/src/app/api/staff/me/password/route.ts`
- [x] T032 [US4] Add change-password form on Users page (self only) in `apps/guestflow/src/app/ops/users/page.tsx`

**Checkpoint**: Own password change works; no other-user password edit

---

## Phase 7: User Story 5 - Audit who added or removed whom (Priority: P2)

**Goal**: Persist actor, action, target, timestamp on add/remove (and password change)

**Independent Test**: Add and remove write audit rows with actor/target/timestamps

### Tests for User Story 5

- [x] T033 [P] [US5] Tests that add/remove write `staff_user_audit` rows in `apps/guestflow/src/lib/__tests__/staff-auth.test.ts`

### Implementation for User Story 5

- [x] T034 [US5] Write audit rows from add/remove/password-change in `apps/guestflow/src/lib/staff-auth.ts`
- [x] T035 [US5] Stamp acting email (or `display_name <email>`) on access-code upsert instead of `'staff'` in `apps/guestflow/src/app/api/ops/access-codes/upsert/route.ts`
- [x] T036 [US5] Stamp acting email (or `display_name <email>`) on Approve&Send email audit instead of `'Grant'` in `apps/guestflow/src/app/api/inbound/send/route.ts`

**Checkpoint**: Audit + optional actor stamps done

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Docs, rate-limit tests, STATUS, no extra behaviour

- [x] T037 [P] Rate-limit tests (5 failures / 15 min / IP+email) plus case-insensitive uniqueness and invalid-email rejection in `apps/guestflow/src/lib/__tests__/staff-auth.test.ts`
- [x] T038 [P] Assert no role/owner column and Users is under Ops only in `apps/guestflow/__tests__/staff-login-ui.test.ts`
- [x] T039 Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md` (ritual: shared staff password rotation)
- [x] T040 [P] Staff-users note (env vars, bootstrap, migrate-not-prod, rate-limit is DB-backed) in `apps/guestflow/docs/STAFF-USERS.md`
- [x] T041 Run `npm test`, `npm run lint`, `npm run build` in `apps/guestflow` and record output for the PR

---

## Phase 9: User Story 6 - Header outbound redirect toggle (Priority: P1) — Decision L

**Goal**: Persist ON/OFF in `app_settings`, header toggle with confirm-on-OFF, fail-closed ON, one resolver for all outbound channels. Grant CLEAR 19:05 CT.

**Independent Test**: Resolver ON/OFF/missing/throw/garbage; audit on flip; 401 unauthenticated; every channel calls the resolver; banner + health read live DB

### Tests for User Story 6

- [x] T042 [P] [US6] Resolver ON, OFF, missing, DB throws, garbage (all but OFF → ON) plus flip audit in `apps/guestflow/src/lib/__tests__/outbound-redirect.test.ts`
- [x] T043 [P] [US6] API 401 unauthenticated and flip audit in `apps/guestflow/__tests__/outbound-redirect-api.test.ts`
- [x] T044 [P] [US6] Source test that WA, SMS, email, send_jobs use the resolver and header confirms OFF in `apps/guestflow/__tests__/staff-login-ui.test.ts`

### Implementation for User Story 6

- [x] T045 [US6] Add `app_settings` DDL + ON seed (`OUTBOUND_MODE` seed default only) to `apps/guestflow/scripts/migrate-staff-users.js` and `apps/guestflow/src/lib/staff-users-schema.ts`
- [x] T046 [US6] DB-backed fail-closed resolver + `setOutboundRedirect` audit write in `apps/guestflow/src/lib/outbound-redirect.ts`
- [x] T047 [US6] Await resolver in `apps/guestflow/src/lib/whatsapp.ts`, `apps/guestflow/src/lib/sms.ts`, `apps/guestflow/src/lib/email.ts`, `apps/guestflow/src/lib/send-jobs.ts`
- [x] T048 [US6] Banner and `/api/health` read live DB in `apps/guestflow/src/components/outbound-redirect-banner.tsx` and `apps/guestflow/src/app/api/health/route.ts`
- [x] T049 [US6] GET/POST `/api/staff/outbound-redirect` (401 without session) in `apps/guestflow/src/app/api/staff/outbound-redirect/route.ts`
- [x] T050 [US6] Header toggle with always-visible ON/OFF and confirm-to-OFF in `apps/guestflow/src/components/OutboundRedirectToggle.tsx` and `apps/guestflow/src/components/Navigation.tsx`
- [x] T051 [US6] Docs: `apps/guestflow/docs/STAFF-USERS.md`, `apps/guestflow/.env.example`, `docs/automation/STATUS.md`, `docs/automation/labor-ledger.md`

**Checkpoint**: Decision L ships ON, fail-closed, no Production migrate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on Foundational; uses US1 session
- **US3 (Phase 5)**: Depends on Foundational + US1 login route
- **US4 (Phase 6)**: Depends on US1 session
- **US5 (Phase 7)**: Depends on US2 add/remove
- **Polish (Phase 8)**: Depends on stories above
- **US6 (Phase 9)**: Depends on US1 session + Foundational schema/migrate

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational
- **User Story 2 (P1)**: After Foundational; needs a session (US1) for API auth
- **User Story 3 (P1)**: After US1 login route exists
- **User Story 4 (P2)**: After US1
- **User Story 5 (P2)**: After US2
- **User Story 6 (P1) Decision L**: After US1 session

### Parallel Opportunities

- T003, T008 in Foundational after T004–T007 start
- T011, T017, T018, T019, T026, T029, T033, T037, T038, T040 as different files

### Independent test criteria

- **US1**: Login + logout + old cookie rejected
- **US2**: Add/remove + self/last guards + session revoke
- **US3**: Bootstrap once + legacy flag on/off
- **US4**: Own password only
- **US5**: Audit rows present
- **US6**: Resolver fail-closed; header toggle; 401; channels use resolver

### Suggested MVP

US1 + Foundational (named session login). Full request needs US2 + US3 in the same PR.

## Implementation Strategy

1. Setup + Foundational
2. US1 login/session/logout
3. US2 Users CRUD + page
4. US3 bootstrap + legacy
5. US4 + US5
6. Polish, tests, STATUS

## Notes

- Do not apply `migrate-staff-users.js` to Production
- Do not merge the PR
- Do not send guest messages
- Outbound redirect ships ON (Decision L); do not apply Production migrate
