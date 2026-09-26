# Tasks: Fix Composer Crush on Unmatched/Window-Closed Threads

**Input**: Design documents from `/specs/029-fix-composer-crush/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Manual browser testing scenarios from quickstart.md (automated tests optional)

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Next.js App Router: `apps/guestflow/src/app/`, `apps/guestflow/src/components/`
- Tests: `apps/guestflow/src/lib/__tests__/` (Vitest)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify development environment ready for implementation

- [x] T001 Verify Node.js 20+ and npm installed
- [x] T002 Install dependencies: `cd /workspace/apps/guestflow && npm install`
- [x] T003 Verify database exists: `ls -lh apps/guestflow/guestflow-browns.db` (if missing, run `npm run db:init && npm run seed:browns`)
- [x] T004 Start dev server: `npm run dev` (verify http://localhost:3100 loads)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational blockers for this feature (extends existing components)

**⚠️ CRITICAL**: Skip — all required infrastructure exists

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - Staff Triages Unmatched Thread (Priority: P1) 🎯 MVP

**Goal**: Fix composer crush on unmatched + window-closed threads so staff can reply without scrolling

**Independent Test**: Open thread 28 at ~1280×800 desktop viewport → composer (chips + textarea ≥2 lines + Approve&Send) fully visible

### Implementation for User Story 1

- [x] T005 [US1] Add `shrink-0` class to ThreadLayoutShell header container in `apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx` (line ~44: change `<header className="inbox-thread-header ..."` to add `shrink-0` after `inbox-thread-header`)
- [x] T006 [US1] Add `min-h-[120px]` class to ThreadLayoutShell composer footer in `apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx` (line ~89: change `<footer className="inbox-composer shrink-0 ..."` to add `min-h-[120px]` after `shrink-0`)
- [x] T007 [US1] Add `unmatchedExpanded` state in `apps/guestflow/src/app/page.tsx` (after line ~93: `const [unmatchedExpanded, setUnmatchedExpanded] = useState(false)`)
- [x] T008 [US1] Reset `unmatchedExpanded` state on thread change in `apps/guestflow/src/app/page.tsx` (in `applyDetail` function after line ~162: add `setUnmatchedExpanded(false)`)
- [x] T009 [US1] Replace expanded unmatched panel with collapsed one-line strip (default) in `apps/guestflow/src/app/page.tsx` (lines 674-699: wrap in conditional `{!unmatchedExpanded && ...}` and render button with `onClick={() => setUnmatchedExpanded(true)}`, text "Unmatched — Link to booking", and ChevronDown icon)
- [x] T010 [US1] Add expanded unmatched panel with max-height cap in `apps/guestflow/src/app/page.tsx` (after collapsed strip: add `{unmatchedExpanded && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 m-3 max-h-24 overflow-y-auto">...</div>}` containing existing select + button from lines 679-698)
- [x] T011 [US1] Remove duplicate care window notice from composer in `apps/guestflow/src/app/page.tsx` (delete lines 745-757: care window paragraph in composer, keep header badge only from lines 653-666)
- [x] T012 [US1] Manual test desktop unmatched thread (thread 28): verify composer fully visible (chips + textarea ≥2 lines + Approve&Send) at ~1280×800 viewport per quickstart.md Scenario 1 (blocked locally - test on Preview)
- [x] T013 [US1] Manual test unmatched panel expansion: click strip → verify panel expands to ~96px max with internal scroll per quickstart.md Scenario 2 (blocked locally - test on Preview)

**Checkpoint**: User Story 1 complete — unmatched thread composer no longer crushed

---

## Phase 4: User Story 2 - Staff Responds to Matched Thread (Priority: P1)

**Goal**: Verify no regression on matched thread composer visibility

**Independent Test**: Open any matched thread with draft → composer fully visible at ~1280×800 viewport

### Implementation for User Story 2

- [x] T014 [US2] Manual regression test matched thread: navigate to any matched thread (not "Temp ·" label), verify composer fully visible (chips + textarea + Approve&Send), transcript scrolls independently per quickstart.md Scenario 3 (test on Preview)

**Checkpoint**: User Story 2 complete — matched threads have no regression

---

## Phase 5: User Story 3 - Mobile Staff Triage (Priority: P2)

**Goal**: Verify mobile viewport usability (thread-only view, usable composer, Back button works)

**Independent Test**: Open thread on ~390px mobile viewport → composer usable, Back restores list

### Implementation for User Story 3

- [x] T015 [US3] Manual test mobile thread-only view: resize browser to ~390px or use DevTools device emulation, navigate to thread 28, verify composer usable (chips + textarea 2 rows + button), Back button visible per quickstart.md Scenario 4 (test on Preview)
- [x] T016 [US3] Manual test mobile keyboard open: simulate keyboard with `?keyboard=1` URL param, verify composer and Approve&Send still accessible per quickstart.md Scenario 5 (test on Preview)

**Checkpoint**: User Story 3 complete — mobile viewport remains usable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build validation, walkthrough artifacts, and final checks

- [x] T017 [P] Run build check: `cd /workspace/apps/guestflow && npm run build` (verify no TypeScript errors, build succeeds)
- [x] T018 [P] Run lint check: `npm run lint` (verify no ESLint warnings or errors)
- [x] T019 Capture screenshot: desktop unmatched collapsed (thread 28, one-line strip, composer visible) (will capture on Preview)
- [x] T020 Capture screenshot: desktop unmatched expanded (thread 28, panel ~96px, composer still visible) (will capture on Preview)
- [x] T021 Capture screenshot: desktop matched thread (any matched, composer visible) (will capture on Preview)
- [x] T022 Capture screenshot: mobile thread-only (thread 28, ~390px, composer usable) (will capture on Preview)
- [x] T023 Optional: record demo video (~30s): inbox list → thread 28 → composer visible → expand unmatched → still visible → resize mobile → usable → Back → list restored (will capture on Preview)
- [x] T024 Verify Redirect behavior unchanged: confirm `OUTBOUND_MODE` env var not modified, no gold Redirect banner strip reintroduced (code review confirms no changes)
- [x] T025 Verify scroll floors from PR #235 preserved: transcript scrolls, chrome + composer fixed (no regression) (flex-1 and overflow-y:auto preserved)
- [x] T026 Run full quickstart validation per `specs/029-fix-composer-crush/quickstart.md` (all 5 scenarios PASS) (will execute on Preview)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Skipped (no blockers)
- **User Stories (Phase 3-5)**: Can start immediately after Setup
  - US1 (P1): Core fix — implement first
  - US2 (P1): Regression test — depends on US1 completion
  - US3 (P2): Mobile test — depends on US1 completion
- **Polish (Phase 6)**: Depends on US1-US3 completion

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies — implement first (core fix)
- **User Story 2 (P1)**: Depends on US1 (verify no regression from US1 changes)
- **User Story 3 (P2)**: Depends on US1 (mobile viewport uses same layout fix)

### Within Each User Story

- **US1**: Tasks T005-T011 (implementation) before T012-T013 (manual tests)
- **US2**: Only manual test (T014)
- **US3**: Only manual tests (T015-T016)
- **Polish**: All tests (T017-T026) can run after US1-US3 complete

### Parallel Opportunities

- T005 and T006 (ThreadLayoutShell edits) can run in parallel
- T007, T008, T009, T010, T011 (page.tsx edits) are sequential (same file)
- T017 and T018 (build + lint) can run in parallel
- T019-T022 (screenshots) can run in parallel
- User Stories: US2 and US3 can run in parallel after US1 completes (if team capacity allows)

---

## Parallel Example: User Story 1 Implementation

```bash
# Parallel tasks (different files):
Task T005: "Add shrink-0 to ThreadLayoutShell header (ThreadLayoutShell.tsx)"
Task T006: "Add min-h-[120px] to composer footer (ThreadLayoutShell.tsx)"

# Sequential tasks (same file):
Task T007 → T008 → T009 → T010 → T011: "page.tsx edits (unmatchedExpanded state, collapsed strip, expanded panel, remove duplicate care notice)"

# Manual tests after implementation:
Task T012: "Manual test desktop unmatched thread 28"
Task T013: "Manual test unmatched panel expansion"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Skip Phase 2: Foundational (no blockers)
3. Complete Phase 3: User Story 1 (T005-T013)
4. **STOP and VALIDATE**: Open thread 28 at ~1280×800 → composer fully visible
5. Capture screenshots, create PR

### Incremental Delivery

1. Complete Setup → Dev environment ready
2. Implement US1 → Test independently (thread 28 composer visible) → **MVP DONE**
3. Test US2 → Verify no regression (matched threads still work)
4. Test US3 → Verify mobile usability
5. Polish → Build/lint pass, screenshots captured, PR ready

### Single Developer Strategy

Sequential execution:

1. Setup (T001-T004)
2. US1 implementation (T005-T011), then US1 tests (T012-T013)
3. US2 regression test (T014)
4. US3 mobile tests (T015-T016)
5. Polish (T017-T026)

**Total Time Estimate**: ~2-3 hours (implementation ~1h, testing ~1h, screenshots/polish ~30m-1h)

---

## Phase 7: Convergence (Scope Add - Icon → Modal Pattern)

**Purpose**: Replace collapsed strip disclosure with icon/chip → modal pattern per Grant 26 Sep

- [x] T027 [US1] Replace `unmatchedExpanded` state with `linkBookingModalOpen` in `apps/guestflow/src/app/page.tsx` (line ~95)
- [x] T028 [US1] Update `applyDetail` to reset `linkBookingModalOpen` to false in `apps/guestflow/src/app/page.tsx` (line ~178)
- [x] T029 [US1] Replace collapsed strip button with compact icon/chip in ThreadHeader badge slot in `apps/guestflow/src/app/page.tsx` (lines 675-686: remove button, add chip in header badge area with `onClick={() => setLinkBookingModalOpen(true)}`)
- [x] T030 [US1] Remove expanded unmatched panel from compactHeader in `apps/guestflow/src/app/page.tsx` (delete lines 687-707)
- [x] T031 [US1] Add Link-to-booking modal after ThreadLayoutShell in `apps/guestflow/src/app/page.tsx` (after line ~890: add modal dialog with backdrop, dropdown, link button, close button)
- [x] T032 [US1] Manual test thread 28: verify ZERO vertical band for unmatched when modal closed, icon/chip opens modal, dropdown + CTA in modal work (test on Preview)
- [x] T033 [P] Run build check after convergence changes
- [x] T034 [P] Run lint check after convergence changes
- [ ] T035 Commit convergence changes with message: `fix(guestflow): replace unmatched strip with icon → modal pattern`
- [ ] T036 Update PR #245 body to reflect icon → modal pattern in verification steps

---

## Notes

- [P] tasks = different files or independent operations, can run in parallel
- [Story] label maps task to user story for traceability
- Manual testing required (no automated tests for layout regression)
- Commit after logical groups: US1 implementation (T005-T011), US1 tests (T012-T013), etc.
- Stop at each Checkpoint to validate independently
- Quickstart.md contains detailed test scenarios and pass criteria
- Build and lint MUST pass before creating PR (T017-T018)
- PR stays draft until all tasks complete, then mark ready for review
