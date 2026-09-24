# Implementation Plan: GuestFlow Staff User Management

**Branch**: `cursor/staff-user-management-3989` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-staff-user-management/spec.md`

## Summary

Replace GuestFlow’s shared-password cookie with named staff users (identical full access, no roles), bcryptjs password hashes, per-user sessions (random ID in `guestflow_staff_session`, SHA-256 in Turso/sqlite), Ops Users page, logout, bootstrap-from-env, and default-on legacy `legacy` + `STAFF_PASSWORD` login. Add/remove are server-guarded (no self-remove, no last-user remove, revoke sessions on remove). DB-backed login rate limit. Migrate script included but not applied to Production.

## Technical Context

**Language/Version**: TypeScript 5.5 / Next.js 14.2 App Router (`apps/guestflow`)

**Primary Dependencies**: Existing React 18, lucide-react, Zod, `@libsql/client`, better-sqlite3; add `bcryptjs` + `@types/bcryptjs`

**Storage**: Turso (libsql) in Preview/Production; better-sqlite3 locally. New tables via `scripts/migrate-staff-users.js` + runtime `ensureStaffUsersSchema()` (Phase 0 / UMI pattern)

**Testing**: Vitest (`npm test` in `apps/guestflow`) plus `next lint` / `next build`

**Target Platform**: Vercel Preview (this PR) and later Production `guestflow.thebrowns.co.za` — agent does not deploy Production or apply Production Turso migrate

**Project Type**: Existing web application (staff ops)

**Performance Goals**: Login and Users list for a handful of staff in one query; middleware session lookup one indexed hash read

**Constraints**: No roles/RBAC; no guest send; outbound redirect unchanged; confirmToken / Approve&Send logic unchanged except optional actor username stamp; no Production migrate/deploy; never log passwords or hashes; Edge middleware cannot use better-sqlite3

**Scale/Scope**: Single property staff (Grant, Liana, a few ops people). Touch `apps/guestflow` + this spec dir + `docs/automation/STATUS.md` + `docs/automation/labor-ledger.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
| --- | --- | --- |
| I. Human-Gated Guest Send | PASS | No send-path behaviour change; confirmToken stays required; no auto-send |
| II. Fail-Closed Facts | PASS | No guest facts invented; auth fail-closed in production |
| III. Booking SoR vs Comms SoR | PASS | No booking/comms schema changes |
| IV. Channel Identity Freeze | PASS | No number or From changes |
| V. Extend Live Systems | PASS | Extend GuestFlow staff cookie/login; no parallel auth product |
| VI. Retention + lanes | PASS | Staff tables are hospitality-ops only; no family/trust mix |

Auth/env-secret handling is in the Safety Constraints “do not touch without Grant approval” list. **This Cloud Agent assignment is that approval** for staff user management only. Agent still must not print secrets, apply Production migrate, or deploy Production.

Post-design re-check: still PASS. Complexity is four new tables + login/session helpers + one Ops page.

## Project Structure

### Documentation (this feature)

```text
specs/016-staff-user-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-staff-auth.md
│   └── api-staff-users.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── scripts/migrate-staff-users.js          # Turso-or-local; do not run on Production
├── src/lib/staff-users-schema.ts           # DDL + ensureStaffUsersSchema + bootstrap
├── src/lib/staff-auth.ts                   # hash password, rate limit, add/remove, login
├── src/lib/staff-session.ts                # Node session create/lookup/logout/require
├── src/lib/staff-session-edge.ts           # Edge Turso session lookup for middleware
├── src/middleware.ts                       # replace staff_auth base64 check
├── src/app/api/staff-auth/route.ts         # username+password login
├── src/app/api/staff-auth/logout/route.ts
├── src/app/api/staff/users/route.ts        # GET list, POST add
├── src/app/api/staff/users/[id]/route.ts   # DELETE
├── src/app/api/staff/me/password/route.ts
├── src/app/staff-login/page.tsx
├── src/app/ops/users/page.tsx
├── src/app/ops/page.tsx                    # Users card under Ops
├── src/components/Navigation.tsx           # logout only
├── src/app/api/ops/access-codes/upsert/route.ts  # actor stamp
├── src/app/api/inbound/send/route.ts       # actor stamp if trivial
├── src/lib/__tests__/staff-auth.test.ts
├── __tests__/staff-users-api.test.ts
└── __tests__/staff-login-ui.test.ts
docs/automation/STATUS.md
docs/automation/labor-ledger.md
```

**Structure Decision**: Extend live `apps/guestflow`. No new app, no role tables, no parallel auth service.

## Complexity Tracking

> No constitution violations requiring justification.
