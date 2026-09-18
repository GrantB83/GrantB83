# Tasks: Staff Ops Copy-Only Approvals

**Input**: Design documents from `/specs/004-staff-ops-copy-only-approvals/`

## Phase 1: Spec Kit artifacts

- [x] T001 Create branch `cursor/staff-ops-copy-only-approvals-ce6c`
- [x] T002 Add spec, plan, research under `specs/004-staff-ops-copy-only-approvals/`
- [x] T003 Add contracts, data-model, quickstart, checklist

## Phase 2: Schema & lib

- [x] T004 Add `scripts/migrate-add-staff-ops-drafts.js`
- [x] T005 Add `src/lib/staff-ops-drafts.ts` (ensure table, insert idempotent, table exists)
- [x] T006 Update `daily-brief-enqueue.ts` async gate tied to table existence

## Phase 3: API

- [x] T007 Add `POST /api/daily-brief/enqueue`
- [x] T008 Extend `GET /api/approvals` with staff_ops union + camelCase normalize
- [x] T009 Extend `PATCH /api/approvals` staff_ops approve/reject + copyContent

## Phase 4: UI

- [x] T010 `/ops/daily-brief` Enqueue button + success link to needs-approval
- [x] T011 `/needs-approval` hide Send for staff_ops; Copy WhatsApp text after approve

## Phase 5: Tests & docs

- [x] T012 Unit tests: gate, idempotency, staff_ops PATCH
- [x] T013 Update `DEPLOY.md` enqueue/approve/copy section
- [x] T014 Run `npm test` in apps/guestflow (staff-ops + daily-brief suites green)

## Phase 6: Converge

- [x] T015 Append convergence notes; update 003 spec status reference

---

## Phase 7: Convergence (2026-09-18)

**Spec vs code:** All FR-001–FR-008 implemented.

| Requirement | Evidence |
|-------------|----------|
| staff_ops_drafts table | `scripts/migrate-add-staff-ops-drafts.js`, `src/lib/staff-ops-drafts.ts` |
| GET approvals staff_ops | `src/app/api/approvals/route.ts` union + `copy_only` metadata |
| PATCH copy-only | `approveStaffOpsDraft` returns `copyContent`; no whatsapp send |
| Send hidden | `needs-approval/page.tsx` `isCopyOnlyItem()` |
| POST enqueue | `src/app/api/daily-brief/enqueue/route.ts` |
| enqueueSupported gate | `resolveStaffOpsEnqueueGate(db)` |
| Idempotent pending | partial unique index + `enqueueStaffOpsDraft` |
| 003 preserved | research/plan unchanged; spec status updated to reference 004 |

**Remaining:** None for this feature scope.
