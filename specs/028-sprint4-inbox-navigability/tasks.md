# Tasks: Sprint 4 Inbox Navigability and Redirect Banner Removal

**Input**: Design documents from `/specs/028-sprint4-inbox-navigability/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit and layout tests included - existing test infrastructure (Vitest) will be updated for compact layout assertions.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Next.js App Router: `apps/guestflow/src/components/`, `apps/guestflow/src/app/`, `apps/guestflow/src/lib/`
- Tests: `apps/guestflow/src/lib/__tests__/`
- Styles: `apps/guestflow/src/styles/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new infrastructure needed - using existing GuestFlow structure

- [ ] T001 Verify existing inbox components structure in apps/guestflow/src/components/inbox/
- [ ] T002 Verify existing layout tests from specs/022/025 and Sprint 3 T+U
- [ ] T003 Document current header/composer heights as baseline for comparison

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core component contracts and type updates that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Update inbox-types.ts to add DetailsSheetState and ComposerDisclosureState client types
- [ ] T005 Review ThreadLayoutShell.tsx current implementation and props for compatibility
- [ ] T006 Review InboxLayoutShell.tsx current implementation for Redirect banner location

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Staff reads guest message history without vertical scrolling wars (Priority: P1) 🎯 MVP

**Goal**: Message transcript is the primary, easily scrollable surface; header and composer compacted to free vertical space for reading messages

**Independent Test**: Open any guest thread on desktop (~1280px) and phone (~390px). Message transcript occupies ≥50% of thread column height. Scroll through message history smoothly without nested scroll conflicts.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Create ThreadHeader.tsx component in apps/guestflow/src/components/inbox/ implementing contract from contracts/thread-header.md (compact display: guest name, suite, dates, NB ref, channel line; height target ≤96-120px; Back button slot; Details button slot)
- [ ] T008 [P] [US1] Create ThreadHeaderDetails.tsx component in apps/guestflow/src/components/inbox/ implementing contract from contracts/thread-header-details.md (Details sheet/modal for contact editing; responsive: desktop overlay vs phone bottom sheet; staff phone/email inputs with Save; POST to /api/umi/threads/[id]/contacts)
- [ ] T009 [US1] Update ThreadLayoutShell.tsx in apps/guestflow/src/components/inbox/ to integrate new ThreadHeader component (replace current tall header with compact ThreadHeader; wire showBack, onBack, Details button; maintain existing minMessageHeight/maxComposerHeight props and flex layout)
- [ ] T010 [US1] Update thread page in apps/guestflow/src/app/(ops)/inbox/page.tsx to use updated ThreadLayoutShell with ThreadHeader and ThreadHeaderDetails (pass thread data to compact header; manage Details sheet open/close state; preserve existing phone Back and URL ?thread= behavior)
- [ ] T011 [US1] Update layout test in apps/guestflow/src/lib/__tests__/inbox-layout.test.ts to assert compact header height ≤120px and message transcript occupies ≥50% of thread column (or create new test file if needed)
- [ ] T012 [US1] Verify message transcript scroll performance with existing useShellDimensions hook and floor constraints from #235 (messages ≥240px/≥35%, no nested scroll conflicts)

**Checkpoint**: At this point, User Story 1 should be fully functional - compact header with Details sheet working, message transcript is primary scroll surface

---

## Phase 4: User Story 2 - Staff views compact thread header with guest identity (Priority: P1)

**Goal**: Thread header displays ~1-2 lines of identity without inline contact editors; Staff phone/email Save accessible via Details sheet/modal

**Independent Test**: Open any guest thread. Header displays guest name, suite, dates, NB ref in compact format (≤96-120px height). Staff phone/email Save accessible via Details sheet in ≤2 clicks.

### Implementation for User Story 2

- [ ] T013 [US2] Implement Details button in ThreadHeader.tsx (icon or "Details" label; positioned in header actions slot; aria-label for accessibility)
- [ ] T014 [US2] Wire Details button click to open ThreadHeaderDetails sheet (update thread page state management; pass isOpen, onClose, onSaved callbacks)
- [ ] T015 [US2] Test Details sheet on desktop breakpoint (fixed overlay with centered card max-w-md; backdrop closes sheet; Save POSTs to API and closes on success)
- [ ] T016 [US2] Test Details sheet on phone breakpoint (bottom sheet slides up from bottom max-h-[90vh]; rounded top corners; Escape and backdrop close behavior)
- [ ] T017 [US2] Verify contact editing flow end-to-end (edit Staff phone/email → Save → reopen Details to confirm persistence; existing API route unchanged)

**Checkpoint**: User Story 2 complete - compact header with accessible contact editing via Details sheet working on all breakpoints

---

## Phase 5: User Story 3 - Staff composes reply with collapsed composer (Priority: P1)

**Goal**: Composer shows channel chips, draft textarea, and Approve&Send by default; template selector and care notes behind disclosure; default height ≤35% of thread column

**Independent Test**: Open any guest thread. Composer shows channel, draft, Approve&Send with "Template & Care" toggle button. Clicking toggle expands/collapses template selector and care notes. Composer ≤35% collapsed, ≤50% expanded.

### Implementation for User Story 3

- [ ] T018 [US3] Update ThreadComposer component (or create if not existing) in apps/guestflow/src/components/inbox/ to add Template & Care disclosure toggle (button with chevron icon; aria-expanded; controls template selector and care notes visibility per contract from contracts/thread-composer.md)
- [ ] T019 [US3] Implement disclosure state management in ThreadComposer (useState for isExpanded; optional localStorage persistence for user preference; default collapsed)
- [ ] T020 [US3] Move template selector and care notes behind disclosure (conditionally render template dropdown and care textarea when isExpanded; maintain existing template selection and care notes functionality)
- [ ] T021 [US3] Update composer height constraints (default collapsed target ≤35% of thread column; expanded max ≤50% per existing #235 floor; add CSS max-height and overflow-y-auto if needed)
- [ ] T022 [US3] Test composer disclosure on desktop and phone (toggle button expands/collapses; template selection works when expanded; care notes editable; height constraints respected)
- [ ] T023 [US3] Verify existing Approve&Send dialog and channel selection still work (no regressions to existing composer functionality)

**Checkpoint**: User Story 3 complete - composer with Template & Care disclosure working; default collapsed state saves vertical space for messages

---

## Phase 6: User Story 4 - Staff navigates between thread list and conversation on phone (Priority: P2)

**Goal**: Maintain existing phone navigation pattern (list OR thread single pane, Back restores list scroll, ?thread= URL state) during navigability improvements

**Independent Test**: On phone ~390px, navigate from list to thread via tap, use Back to return to list with scroll position preserved. URL reflects ?thread=<id> when thread open.

### Implementation for User Story 4

- [ ] T024 [US4] Verify existing phone navigation still works after compact header/composer changes (test on 390×844 phone size; single-pane list OR thread behavior; Back button visible in compact ThreadHeader)
- [ ] T025 [US4] Verify ?thread= URL query parameter handling unchanged (thread opens on URL with ?thread=<id>; clearing query shows list on phone; LIST_SCROLL_KEY restores scroll position)
- [ ] T026 [US4] Test Back button in compact ThreadHeader on phone (ArrowLeft icon visible; onBack callback fires; list view restored with preserved scroll)
- [ ] T027 [US4] Verify existing useInboxBreakpoint and InboxLayoutShell phone behavior (breakpoint detection correct; pane visibility logic unchanged; absolute positioning for single-pane stack works)

**Checkpoint**: User Story 4 complete - phone navigation regression tests pass; compact layout works with existing phone stack behavior

---

## Phase 7: User Story 5 - Staff views inbox without yellow Redirect banner (Priority: P2)

**Goal**: Remove gold/yellow "Redirect ON" visual banner above navy ops header; redirect behavior remains active (OUTBOUND_MODE unchanged)

**Independent Test**: Open inbox on desktop and phone. No gold/yellow banner visible above or below navy ops header. Navy sticky ops header present. Redirect behavior still ON (verify via health check or console).

### Implementation for User Story 5

- [ ] T028 [US5] Locate Redirect banner JSX in ops chrome component (likely OpsHeader.tsx or similar in apps/guestflow/src/components/ops/; search for "Redirect ON" or "OUTBOUND" text or gold/yellow background class)
- [ ] T029 [US5] Remove Redirect banner JSX element from ops header component (delete banner div/element; preserve navy sticky ops header from Sprint 3 T)
- [ ] T030 [US5] Update useInboxChromeOffset hook in apps/guestflow/src/components/inbox/ to remove banner height from offset calculation (if banner height was tracked; ensure sticky header offset still correct without banner)
- [ ] T031 [US5] Verify navy sticky ops header still present and functional (header sticks to top on scroll; ops nav links work; logout button accessible)
- [ ] T032 [US5] Verify OUTBOUND_MODE and redirect sinks unchanged (check env var OUTBOUND_MODE=redirect; test sinks still configured; no accidental changes to redirect behavior code)
- [ ] T033 [US5] Test on desktop and phone (banner not visible; DOM search for banner element returns 0; navy header present; page layout correct without banner)

**Checkpoint**: User Story 5 complete - yellow Redirect banner removed; navy ops header functional; redirect behavior unchanged

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T034 [P] Update global styles in apps/guestflow/src/styles/globals.css if needed for compact header/composer (verify Tailwind utilities sufficient; add custom CSS only if necessary)
- [ ] T035 Run TypeScript compilation check: `cd apps/guestflow && npm run build` or `tsc --noEmit` (verify no type errors in modified components)
- [ ] T036 Run unit/integration tests: `cd apps/guestflow && npm run test` (verify all existing tests pass; new layout tests pass)
- [ ] T037 Manual validation per quickstart.md V1-V7 scenarios (desktop ~1280×800, phone ~390×844, tablet ~768×1024; compact layout, Details sheet, composer disclosure, Redirect banner removal, phone navigation)
- [ ] T038 [P] Update component documentation/comments if needed (ThreadHeader, ThreadHeaderDetails, ThreadComposer contracts documented in code)
- [ ] T039 Verify no regressions to existing features (Approve&Send dialog, template selection, care notes, channel switching, message bubbles, delivery status, Window closed badge)
- [ ] T040 Verify no accidental changes to standing locks (grep for OUTBOUND_MODE, redirect sinks, WhatsApp From +27600200825, auto-send code; confirm unchanged)
- [ ] T041 Capture screenshots for PR evidence (desktop thread ~1280×800, phone thread ~390×844, phone list, Details sheet open, composer expanded, no yellow banner, navy header present)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1, US2, US3 can proceed in parallel (different components) after foundational
  - US4 and US5 can proceed in parallel after US1-3 (US4 tests integration, US5 is independent chrome change)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - creates ThreadHeader and ThreadHeaderDetails components
- **User Story 2 (P1)**: Depends on US1 (uses ThreadHeader and ThreadHeaderDetails) - wires Details button
- **User Story 3 (P1)**: Independent of US1/US2 (different component: ThreadComposer) - can run parallel with US1
- **User Story 4 (P2)**: Depends on US1-3 completion (regression testing of compact layout with phone navigation)
- **User Story 5 (P2)**: Independent of US1-4 (separate chrome component: OpsHeader) - can run parallel with any other story

### Within Each User Story

- US1: T007 and T008 parallel (ThreadHeader and ThreadHeaderDetails are independent) → T009 (integrate into shell) → T010 (wire into page) → T011-T012 (tests)
- US2: Sequential after US1 (wires Details button → tests)
- US3: T018-T020 sequential (disclosure state → move controls) → T021-T023 (styling and tests)
- US4: Sequential tests (verify existing behavior maintained)
- US5: T028-T029 (find and remove banner) → T030-T033 (verify no regressions)

### Parallel Opportunities

- **Foundational**: T004-T006 all [P] (different files: types, shell review, chrome review)
- **US1 initial**: T007 and T008 [P] (ThreadHeader and ThreadHeaderDetails independent components)
- **US3 and US1**: Can run in parallel (US3 is ThreadComposer, US1 is ThreadHeader - different files)
- **US5 and US3**: Can run in parallel (US5 is OpsHeader chrome, US3 is composer - different files)
- **Polish**: T034, T038 [P] (styles and docs independent)

---

## Parallel Example: User Story 1 + User Story 3

```bash
# Launch US1 and US3 together (different components):

# US1 tasks (ThreadHeader / ThreadHeaderDetails):
Task: "T007 [P] [US1] Create ThreadHeader.tsx in apps/guestflow/src/components/inbox/"
Task: "T008 [P] [US1] Create ThreadHeaderDetails.tsx in apps/guestflow/src/components/inbox/"

# US3 tasks (ThreadComposer):
Task: "T018 [US3] Update ThreadComposer in apps/guestflow/src/components/inbox/ to add Template & Care disclosure"
Task: "T019 [US3] Implement disclosure state management in ThreadComposer"

# These can proceed in parallel because they touch different files
```

---

## Implementation Strategy

### MVP First (User Stories 1-3: Core Navigability)

1. Complete Phase 1: Setup (verification)
2. Complete Phase 2: Foundational (types and contracts)
3. Complete Phase 3: User Story 1 (compact header, Details sheet, message scroll)
4. Complete Phase 4: User Story 2 (Details button wiring)
5. Complete Phase 5: User Story 3 (composer disclosure)
6. **STOP and VALIDATE**: Test compact layout independently on desktop and phone
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Compact header working
3. Add User Story 2 → Test independently → Details sheet accessible
4. Add User Story 3 → Test independently → Composer collapsed
5. Add User Story 4 → Test independently → Phone navigation maintained
6. Add User Story 5 → Test independently → Redirect banner removed
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + 2 (ThreadHeader and Details sheet)
   - Developer B: User Story 3 (ThreadComposer disclosure)
   - Developer C: User Story 5 (Redirect banner removal)
3. Developer A or B: User Story 4 (phone navigation regression tests) after US1-3 complete
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Verify no changes to OUTBOUND_MODE, redirect sinks, WhatsApp From, auto-send behavior
- Existing floor constraints from #235 (messages ≥240px/≥35%, composer ≤50%) must be maintained
- Brand colors: navy #0A3775 for Approve&Send, gold #FAC72E only for redirect chrome (if any remains), accent #DCE8F9 for selection
- No new dependencies or libraries needed (pure component refactoring with existing Tailwind/React)
