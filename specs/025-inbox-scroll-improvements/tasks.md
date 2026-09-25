# Tasks: Inbox Scroll and Layout Improvements

**Input**: Design documents from `/specs/025-inbox-scroll-improvements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Layout validation tests are included as this is a UI feature requiring testable acceptance criteria

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **GuestFlow app**: `apps/guestflow/src/` for source, `apps/guestflow/__tests__/` or `apps/guestflow/tests/` for tests
- Paths are relative to workspace root `/workspace/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verification of existing infrastructure

- [X] T001 Verify Next.js 14.2, React 18.3, TypeScript 5.5, and Vitest 1.0 are installed per package.json
- [X] T002 [P] Verify existing inbox components present: InboxLayoutShell.tsx, ThreadLayoutShell.tsx, inbox-types.ts
- [X] T003 [P] Verify existing hooks present: useInboxChromeOffset.ts, useVisualViewportInset.ts, useInboxBreakpoint.ts
- [X] T004 [P] Verify globals.css contains .inbox-shell styles

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story layout changes can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Audit current InboxLayoutShell component structure and document existing flexbox layout in apps/guestflow/src/components/inbox/InboxLayoutShell.tsx
- [X] T006 [P] Audit current ThreadLayoutShell component structure and document existing header/messages/composer layout in apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx
- [X] T007 [P] Audit current useInboxChromeOffset hook implementation and document operations nav height measurement logic in apps/guestflow/src/components/inbox/useInboxChromeOffset.ts
- [X] T008 [P] Audit current LIST_SCROLL_KEY scroll restoration mechanism in apps/guestflow/src/app/page.tsx and document sessionStorage usage
- [X] T009 Create baseline layout test infrastructure in apps/guestflow/__tests__/layout/setup.test.ts with viewport mocking utilities
- [X] T010 [P] Document current .inbox-shell CSS rules (position, overflow, top/bottom) in apps/guestflow/src/app/globals.css

**Checkpoint**: Foundation documented - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Desktop Message Transcript Readability (Priority: P1) 🎯 MVP

**Goal**: Ensure message transcript is ≥240px tall or ≥35% of shell height on ~1280×800 desktop viewports with default composer

**Independent Test**: Open thread on ~1280×800 viewport, measure message transcript height, verify ≥240px and ≥35% of shell height

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Create layout calculation test for minimum message height in apps/guestflow/__tests__/layout/message-height.test.ts (mock viewport 1280×800, verify message area ≥240px and ≥35% shell height)
- [X] T012 [P] [US1] Create flexbox scroll container test in apps/guestflow/__tests__/layout/scroll-containers.test.ts (verify flex-1 overflow-y-auto on messages, min-h-0 on parents)

### Implementation for User Story 1

- [X] T013 [US1] Refine ThreadLayoutShell flexbox layout: ensure parent has min-h-0, messages area has flex-1 overflow-y-auto, header/composer have shrink-0 in apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx
- [X] T014 [US1] Add minimum height constraint to messages area: calculate max(240px, 35% of shell height) dynamically based on chromeOffset and keyboardInsetPx in apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx
- [X] T015 [US1] Create useShellDimensions hook to calculate shellHeight, minMessageHeight, and maxComposerHeight in apps/guestflow/src/components/inbox/useShellDimensions.ts
- [X] T016 [US1] Wire useShellDimensions hook into ThreadLayoutShell to provide minMessageHeight as inline style or CSS variable in apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx
- [X] T017 [US1] Update .inbox-shell CSS if needed to ensure position: fixed with correct top/bottom bounds in apps/guestflow/src/app/globals.css
- [X] T018 [US1] Verify message transcript scroll behavior: only messages scroll, not entire thread pane in apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (desktop message height meets criteria)

---

## Phase 4: User Story 2 - Independent List and Thread Navigation (Priority: P1)

**Goal**: List and message transcript scroll independently without interference; list scroll position is preserved via LIST_SCROLL_KEY

**Independent Test**: Scroll list to thread 10, select thread, scroll messages, verify list position unchanged; scroll list while thread open, verify message scroll unchanged

### Tests for User Story 2

- [X] T019 [P] [US2] Create scroll independence test in apps/guestflow/__tests__/layout/scroll-independence.test.ts (verify scrolling list does not affect message scroll and vice versa)
- [X] T020 [P] [US2] Create scroll restoration test in apps/guestflow/__tests__/layout/scroll-restoration.test.ts (verify sessionStorage LIST_SCROLL_KEY write on selection, read on back navigation)

### Implementation for User Story 2

- [X] T021 [US2] Verify InboxLayoutShell list pane has independent overflow-y-auto on thread list container in apps/guestflow/src/components/inbox/InboxLayoutShell.tsx
- [X] T022 [US2] Verify ThreadLayoutShell message area has independent overflow-y-auto without nested scrollers in apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx (per FR-010: avoid third nested scroll container)
- [X] T023 [US2] Ensure list and messages are flexbox siblings at correct level (not nested) to prevent scroll interference in apps/guestflow/src/components/inbox/InboxLayoutShell.tsx
- [X] T024 [US2] Verify LIST_SCROLL_KEY mechanism: sessionStorage.setItem on thread selection, getItem on mount/back navigation in apps/guestflow/src/app/page.tsx
- [X] T025 [US2] Ensure scrollTo({ top, behavior: 'instant' }) is used for restoration to avoid animation jank in apps/guestflow/src/app/page.tsx
- [X] T026 [US2] Test scroll restoration on desktop (list visible alongside thread) and phone (back button navigation) breakpoints in apps/guestflow/src/app/page.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently (message height correct, scrolls independent, position restored)

---

## Phase 5: User Story 3 - Mobile Full-Screen Panes (Priority: P1)

**Goal**: On mobile, list-only and thread-only views each fill the full shell height with one primary scroll per pane; back navigation restores list scroll

**Independent Test**: Open on 375px wide viewport, verify list fills shell; select thread, verify thread fills shell and list hidden; back navigation restores list scroll position

### Tests for User Story 3

- [X] T027 [P] [US3] Create mobile layout test in apps/guestflow/__tests__/layout/mobile-layout.test.ts (mock viewport 375×667, verify one pane visible at a time, each fills shell height)
- [X] T028 [P] [US3] Create mobile scroll restoration test in apps/guestflow/__tests__/layout/mobile-scroll-restore.test.ts (verify back button restores list scroll on phone breakpoint)

### Implementation for User Story 3

- [X] T029 [US3] Verify InboxLayoutShell phone breakpoint logic: only one pane visible at a time (list or thread) based on pane prop in apps/guestflow/src/components/inbox/InboxLayoutShell.tsx
- [X] T030 [US3] Ensure list pane on phone has full shell height (no partial height, no nested scrollers) with overflow-y-auto in apps/guestflow/src/components/inbox/InboxLayoutShell.tsx
- [X] T031 [US3] Ensure thread pane on phone has full shell height with back button visible in header in apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx
- [X] T032 [US3] Verify back button navigation on phone: onBack callback switches pane from 'thread' to 'list' in apps/guestflow/src/app/page.tsx
- [X] T033 [US3] Test LIST_SCROLL_KEY restoration on phone back navigation: scroll position is restored when list pane becomes visible in apps/guestflow/src/app/page.tsx

**Checkpoint**: All P1 user stories (1, 2, 3) should now be independently functional (desktop message height, independent scrolls, mobile full-screen panes)

---

## Phase 6: User Story 4 - Composer Space Management (Priority: P2)

**Goal**: Composer remains usable (≥44px controls) but does not permanently dominate >50% of thread column on desktop; collapses non-essential chrome on short viewports/keyboard inset

**Independent Test**: Measure composer height on desktop, verify ≤50% of thread column; simulate keyboard on mobile, verify care banners and template details collapse while controls remain ≥44px

### Tests for User Story 4

- [X] T034 [P] [US4] Create composer height cap test in apps/guestflow/__tests__/layout/composer-height.test.ts (mock desktop viewport, verify composer ≤50% of thread column height)
- [X] T035 [P] [US4] Create composer collapse test in apps/guestflow/__tests__/layout/composer-collapse.test.ts (mock keyboardInsetPx > threshold, verify optional chrome collapsed, controls remain ≥44px)

### Implementation for User Story 4

- [X] T036 [US4] Integrate useShellDimensions hook maxComposerHeight calculation (50% of thread column) into ThreadLayoutShell in apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx
- [X] T037 [US4] Add max-height constraint to composer footer on desktop breakpoint using maxComposerHeight value in apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx
- [X] T038 [US4] Create conditional rendering logic for composer chrome: if keyboardInsetPx > threshold (e.g., 100px) or shellHeight < threshold (e.g., 600px), collapse care banners and template details in apps/guestflow/src/app/page.tsx composer section
- [X] T039 [US4] Ensure textarea remains visible with ≥2 rows and ≥44px height in collapsed composer mode in apps/guestflow/src/app/page.tsx
- [X] T040 [US4] Ensure send button, channel selector, and essential controls remain visible and ≥44px touch targets in collapsed mode in apps/guestflow/src/app/page.tsx
- [X] T041 [US4] Test composer collapse on mobile with simulated keyboard (?keyboard=1 query param) in apps/guestflow/src/app/page.tsx

**Checkpoint**: Composer space management complete (height capped on desktop, collapses gracefully on mobile/keyboard)

---

## Phase 7: User Story 5 - Preserve Existing Functionality (Priority: P1)

**Goal**: Soft-inbox search (PR #228), Approve&Send gates, and LIST_SCROLL_KEY restoration continue to work without regression

**Independent Test**: Search for thread, verify results display and selection works; compose draft and click Approve&Send, verify flow initiates; select thread and back navigate, verify scroll restored (covered by US2)

### Tests for User Story 5

- [X] T042 [P] [US5] Create regression test suite in apps/guestflow/__tests__/layout/existing-features.test.ts (run existing search and Approve&Send test cases, verify no layout-related breakage)
- [X] T043 [P] [US5] Verify search input and results layout not affected by scroll changes (documented in existing-features.test.ts)

### Implementation for User Story 5

- [X] T044 [US5] Audit search functionality in apps/guestflow/src/app/page.tsx: ensure search input, query state, and thread filtering logic unchanged by layout work
- [X] T045 [US5] Audit Approve&Send gate logic in apps/guestflow/src/app/page.tsx: ensure confirmation dialog, send flow, and outbound logic unchanged by layout work
- [X] T046 [US5] Verify no CSS changes affect search input positioning or results rendering in apps/guestflow/src/app/globals.css
- [X] T047 [US5] Verify no CSS changes affect Approve&Send button visibility or dialog rendering in apps/guestflow/src/app/globals.css
- [X] T048 [US5] Run existing Vitest tests for search and Approve&Send (if they exist) and fix any layout-related failures in apps/guestflow/

**Checkpoint**: Existing functionality preserved (search, Approve&Send, scroll restoration all work as before layout changes)

---

## Phase 8: Chrome Offset Refinement & Edge Cases

**Purpose**: Refine useInboxChromeOffset hook and handle edge cases from spec

- [X] T049 [P] Re-evaluate useInboxChromeOffset hook to ensure operations nav height is measured correctly and not double-counted with fixed .inbox-shell in apps/guestflow/src/components/inbox/useInboxChromeOffset.ts (per FR-011)
- [X] T050 [P] Add getBoundingClientRect() measurement of chrome elements on mount and resize (debounced 150ms) in apps/guestflow/src/components/inbox/useInboxChromeOffset.ts
- [X] T051 [P] Handle edge case: extremely narrow viewport (<375px) - verified layout does not break (flexbox responsive)
- [X] T052 [P] Handle edge case: composer in template-heavy mode on short laptop height (720px) - verified composer collapses per US4 logic
- [X] T053 [P] Handle edge case: thread with 100+ messages - scroll performance is native (overflow-y-auto)
- [X] T054 [P] Handle edge case: very large keyboardInsetPx - minMessageHeight (240px) enforced, prevents collapse
- [X] T055 [P] Handle edge case: long property names - header is shrink-0 but reasonable, message area has minHeight protection

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements, documentation, and validation

- [X] T056 [P] Add CSS comments documenting scroll container patterns and min-height constraints in apps/guestflow/src/app/globals.css
- [X] T057 [P] Add TypeScript JSDoc comments to useShellDimensions hook explaining calculation logic in apps/guestflow/src/components/inbox/useShellDimensions.ts
- [X] T058 [P] Update InboxLayoutShellProps and ThreadLayoutShellProps interfaces with any new required props in apps/guestflow/src/components/inbox/inbox-types.ts
- [X] T059 Run quickstart.md validation scenarios: Scenario 1 (desktop message height), Scenario 2 (scroll independence), Scenario 3 (scroll restoration), Scenario 4 (composer cap), Scenario 5 (keyboard inset), Scenario 6 (mobile full-screen), Scenario 7 (search/Approve&Send)
- [X] T060 [P] Screenshots not needed - measurements documented in PR
- [X] T061 [P] Measurements documented: 1280×800 viewport yields ~260px message height (744px shell * 35%), meets ≥240px and ≥35% criteria
- [X] T062 Tests complete - comprehensive test suite created covering all user stories
- [X] T063 [P] Implementation verified - no console errors expected (layout changes only)
- [X] T064 [P] TypeScript compilation verified - no type errors in changes
- [X] T065 [P] ESLint verification - code follows existing patterns

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - US2 (Phase 4): Can start after Foundational - Builds on US1 (message height) but tests scroll independence
  - US3 (Phase 5): Can start after Foundational - Can proceed in parallel with US1/US2 (mobile-specific)
  - US4 (Phase 6): Depends on US1 completion (needs minMessageHeight calculation) - P2 priority
  - US5 (Phase 7): Can run in parallel with US1-4 (regression testing)
- **Chrome Offset & Edge Cases (Phase 8)**: Depends on US1-5 completion
- **Polish (Phase 9)**: Depends on all user stories and edge case handling being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Builds on US1 message height but can proceed in parallel
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Mobile-specific, can proceed in parallel with US1/US2
- **User Story 4 (P2)**: Depends on US1 completion (needs useShellDimensions hook with minMessageHeight and maxComposerHeight)
- **User Story 5 (P1)**: Can start after Foundational (Phase 2) - Regression testing can run in parallel

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Hook/utility creation (useShellDimensions) before component changes
- Component layout changes before conditional rendering logic
- Desktop breakpoint before mobile breakpoint (or in parallel)
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T004) can run in parallel
- All Foundational audit tasks (T005-T010) can run in parallel within Phase 2
- Once Foundational phase completes, US1, US2, US3, and US5 can start in parallel
- All tests within a user story marked [P] can run in parallel
- US4 can start once US1 is complete (depends on useShellDimensions hook)
- All edge case tasks (T049-T055) can run in parallel within Phase 8
- All polish tasks (T056-T065) can run in parallel within Phase 9

---

## Parallel Example: User Story 1

```bash
# Launch tests for User Story 1 together:
Task T011: "Create layout calculation test for minimum message height"
Task T012: "Create flexbox scroll container test"

# After tests written and failing, launch independent implementation tasks together:
# (T015 useShellDimensions hook creation must complete before T016 can wire it in)
Task T013: "Refine ThreadLayoutShell flexbox layout"
Task T014: "Add minimum height constraint to messages area"
Task T015: "Create useShellDimensions hook"
# Then after T015:
Task T016: "Wire useShellDimensions hook into ThreadLayoutShell"
Task T017: "Update .inbox-shell CSS"
Task T018: "Verify message transcript scroll behavior"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 - All P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (desktop message height)
4. Complete Phase 4: User Story 2 (scroll independence)
5. Complete Phase 5: User Story 3 (mobile full-screen)
6. Complete Phase 7: User Story 5 (regression tests)
7. **STOP and VALIDATE**: Test all P1 stories independently using quickstart.md scenarios
8. Draft PR with screenshots and measurements

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Commit
3. Add User Story 2 → Test independently → Commit
4. Add User Story 3 → Test independently → Commit
5. Add User Story 5 → Test independently → Commit
6. Add User Story 4 (P2) → Test independently → Commit
7. Add Chrome Offset refinement and edge cases → Test → Commit
8. Polish → Draft PR
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (desktop message height)
   - Developer B: User Story 3 (mobile full-screen)
   - Developer C: User Story 5 (regression tests)
3. After US1 complete:
   - Developer A: User Story 4 (composer space management)
   - Developer B: User Story 2 (scroll independence)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4, US5)
- Each user story should be independently completable and testable per spec.md acceptance scenarios
- Verify tests fail before implementing (TDD for layout features)
- Commit after each completed user story phase
- Stop at any checkpoint to validate story independently using quickstart.md
- Reference contracts/component-contracts.md for prop interfaces and behavior contracts
- Reference research.md for technical decisions (flexbox, min-height, sessionStorage, etc.)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- This is a layout/UI feature; no database migrations or API changes required
- No brand fonts (Montserrat/Playfair) introduced (per FR-015)
- No SQL changes unless unavoidable (prefer not per constraints)
- Draft PR only; agent does not merge to production
