# Tasks: Staff Ops Daily Brief (Ops Hub)

**Input**: Design documents from `/specs/002-staff-ops-daily-brief/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent delivery.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Spec Kit artifacts and feature branch ready

- [x] T001 Create feature branch `cursor/guestflow-daily-brief-ops-hub-59c7` from `main`
- [x] T002 [P] Add Spec Kit spec, plan, research, data-model, contracts, quickstart under `specs/002-staff-ops-daily-brief/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared brief builder library and GET API — MUST complete before UI polish

- [x] T003 Create `apps/guestflow/src/lib/daily-brief.ts` with status derivation, exception detection, snapshot builder, WhatsApp + markdown formatters
- [x] T004 Create `apps/guestflow/src/app/api/daily-brief/route.ts` GET handler querying bookings + returning snapshot per `contracts/api-daily-brief.md`
- [x] T005 [P] Refactor `apps/guestflow/src/app/api/daily-brief/export/route.ts` to use `daily-brief.ts` formatters (remove duplicated generateMarkdown/generatePlainText)

**Checkpoint**: GET API returns structured brief; export uses shared lib ✅

---

## Phase 3: User Story 1 — View Today/Tomorrow Ops Brief (Priority: P1) 🎯 MVP

**Goal**: Staff-authenticated Ops Hub page shows today/tomorrow ops from DB with exceptions

- [x] T006 [US1] Rewrite `apps/guestflow/src/app/ops/daily-brief/page.tsx` to fetch `GET /api/daily-brief`, show today/tomorrow sections, RED/AMBER exceptions, Ops Hub nav (remove demo/Phase 17 links)
- [x] T007 [US1] Add draft-only banner and empty/error states with explicit no-invented-data copy on daily brief page

**Checkpoint**: US1 complete ✅

---

## Phase 4: User Story 2 — Copy/Export WhatsApp Brief (Priority: P1)

- [x] T008 [US2] Add "Copy for WhatsApp" button using `briefText` from GET API on daily brief page
- [x] T009 [US2] Wire download buttons to export POST with snapshot from GET; disable when no data

**Checkpoint**: US1 + US2 = MVP ✅

---

## Phase 5: User Story 3 — Tomorrow Preview & Exception Scan (Priority: P2)

- [x] T010 [US3] Render tomorrow preview section and empty-suite exception list on daily brief page
- [x] T011 [US3] Include tomorrow preview and empty suites in WhatsApp/markdown export via `daily-brief.ts`

**Checkpoint**: Full exception scan visible in UI and exports ✅

---

## Phase 6: User Story 4 — Staff Draft Queue (Priority: P3 — deferred)

- [x] T012 [US4] Document deferral in spec/plan; ensure no Send/auto-enqueue UI on daily brief page

---

## Phase 7: Testing & Ops Notes

- [x] T013 [P] Add `apps/guestflow/src/lib/__tests__/daily-brief.test.ts` — status derivation, exceptions, no invented rates, draft footer
- [x] T014 [P] Update `apps/guestflow/scripts/smoke-ops.mjs` — assert draft-only copy on `/ops/daily-brief`
- [x] T015 Add Daily Ops Brief ops note to `apps/guestflow/DEPLOY.md` (how staff opens brief, draft-only)
- [x] T016 Run `npm test -- src/lib/__tests__/daily-brief.test.ts` and `npm run smoke:ops`; all green

---

## Phase 8: Converge

- [x] T017 Run speckit-converge: all FR/SC met; no gap tasks required
- [x] T018 Mark completed tasks in this file after implementation verified

---

## Phase 9: Convergence (speckit-converge — 2026-09-14)

**Assessment**: Codebase satisfies spec.md, plan.md, and tasks above.

| Requirement | Status |
|-------------|--------|
| FR-001 Staff `/ops/daily-brief` | ✅ |
| FR-002 DB bookings, no NB scrape | ✅ |
| FR-003 Today arrivals/departures/in-house | ✅ |
| FR-004 Tomorrow preview | ✅ |
| FR-005 Late check-in flags | ✅ |
| FR-006 Empty/missing suite flags | ✅ |
| FR-007 Copy + export WhatsApp-ready | ✅ |
| FR-008 No auto-send | ✅ |
| FR-009 No invented rates/amounts | ✅ |
| FR-010 Draft-only UI copy | ✅ |
| FR-011 GET `/api/daily-brief` | ✅ |
| FR-012 Empty/error states | ✅ |
| SC-005 Unit tests green | ✅ (12/12 daily-brief tests) |

**Deferred (by design)**: US4 staff draft enqueue — no existing approval queue type.

**Remaining work**: None.

---

## Dependencies

```text
Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2)
                              ↘ Phase 5 (US3)
Phase 6 (deferred, parallel)
Phase 7 after Phase 3–5
Phase 8–9 after Phase 7
```

## Implementation Strategy

1. **MVP**: T003–T009 ✅
2. **Enhancement**: T010–T011 ✅
3. **Quality**: T013–T016 ✅
4. **Converge**: T017–T018 ✅

---

## Notes

- Scope limited to `apps/guestflow/` + `specs/002-staff-ops-daily-brief/`
- Staff draft enqueue intentionally omitted (fail-closed)
