# Tasks: Daily Brief Staff Enqueue

**Input**: Design documents from `/specs/003-daily-brief-staff-enqueue/`

## Phase 1: Spec Kit artifacts

- [x] T001 Create branch `cursor/daily-brief-enqueue-d5d7`
- [x] T002 [P] Add spec, plan, research under `specs/003-daily-brief-staff-enqueue/`
- [x] T003 [P] Add contracts, data-model, quickstart, checklist

## Phase 2: Investigation (blocking)

- [x] T004 Map `/api/approvals` queue types and Send path in plan.md + research.md
- [x] T005 Record fail-closed verdict: enqueue **not** safe — no staff-ops type

## Phase 3: Blocker implementation

- [x] T006 Add `src/lib/daily-brief-enqueue.ts` with `getStaffOpsEnqueueGate()`
- [x] T007 Extend `GET /api/daily-brief` with `enqueueSupported` + `enqueueBlocker`
- [x] T008 Update `/ops/daily-brief` UI: blocker copy, keep copy/export only
- [x] T009 Add ops note in `apps/guestflow/DEPLOY.md`

## Phase 4: Tests & converge

- [x] T010 Add `src/lib/__tests__/daily-brief-enqueue.test.ts`
- [x] T011 Run `npm test` in `apps/guestflow`
- [x] T012 Converge: document blocked US1 in tasks.md footer

## Blocked (future — requires Grant approval)

- [ ] T-FUTURE Add `staff_ops_drafts` table + approvals union + copy-only approve (no guest Send)

---

## Convergence (2026-09-18)

**User Story 1 (Enqueue):** Not implemented — fail-closed blocker documented.

**Delivered instead:**
- `getStaffOpsEnqueueGate()` + API fields on GET `/api/daily-brief`
- UI blocker banner on `/ops/daily-brief` (copy/export unchanged)
- Unit tests in `daily-brief-enqueue.test.ts`
- Ops note in `DEPLOY.md`

**Evidence:** `specs/003-daily-brief-staff-enqueue/research.md` queue inventory; no POST enqueue endpoint added.
