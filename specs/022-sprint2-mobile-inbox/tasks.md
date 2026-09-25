# Tasks: Sprint 2 Mobile-Friendly Inbox

**Input**: Design documents from `/specs/022-sprint2-mobile-inbox/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Requested by the feature brief (Playwright screenshots, no-horizontal-overflow, Lighthouse ≥90).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pin Spec Kit state and evidence folders

- [x] T001 Create `specs/022-sprint2-mobile-inbox/` artifacts and screenshot directory
- [x] T002 [P] Add Playwright config at `apps/guestflow/playwright.config.ts` without affecting `next build`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Breakpoint, viewport inset, fixture, and slot shell before story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create `apps/guestflow/src/components/inbox/useInboxBreakpoint.ts` (`phone` <768, `tablet` 768–1199, `desktop` ≥1200)
- [x] T004 [P] Create `apps/guestflow/src/components/inbox/useVisualViewportInset.ts` (`dvh` + `visualViewport` + `--inbox-keyboard-inset`)
- [x] T005 [P] Create mock fixture `apps/guestflow/src/components/inbox/inbox-fixture.ts` with invented guests only
- [x] T006 Create `apps/guestflow/src/components/inbox/InboxLayoutShell.tsx` with `data-inbox-shell` and list/thread panes
- [x] T007 Create `apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx` with pinned header, pinned composer, and empty `header-badge` / `header-actions` slots
- [x] T008 Add wrap / safe-area / 16px inbox tokens in `apps/guestflow/src/app/globals.css`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Phone single-pane with back and scroll restore (Priority: P1) 🎯 MVP

**Goal**: Phone shows list or full-screen thread; back restores list scroll

**Independent Test**: 360×800 list → tap thread → back / browser back restores scroll; first thread is not auto-opened

### Tests for User Story 1

- [x] T009 [P] [US1] Add source-contract coverage for phone pane + `?thread=` in `apps/guestflow/__tests__/mobile-inbox-ui.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Wire `InboxLayoutShell` in `apps/guestflow/src/app/page.tsx` so phone is single-pane and does not auto-select the first thread
- [x] T011 [US1] Persist list scroll and honor `?thread=` plus in-app / browser back in `apps/guestflow/src/app/page.tsx`

**Checkpoint**: Phone list/thread navigation is independently testable

---

## Phase 4: User Story 2 - Pinned guest details and pinned reply (Priority: P1)

**Goal**: Phone thread pins name, booking/suite, dates, channel; composer stays above keyboard

**Independent Test**: Scroll the timeline; header stays. Simulate keyboard; composer stays on screen.

- [x] T012 [US2] Render pinned guest facts (name, booking/suite, dates, channel) through `ThreadLayoutShell` from `apps/guestflow/src/app/page.tsx`
- [x] T013 [US2] Apply visualViewport / `keyboard=1` inset so `[data-inbox-composer]` stays above the keyboard in `apps/guestflow/src/app/page.tsx`

**Checkpoint**: Phone thread pins are independently testable

---

## Phase 5: User Story 3 - Tablet two-panel, desktop unchanged (Priority: P2)

**Goal**: Tablet two-pane with narrower/collapsible list; desktop `max-w-md` list unchanged

**Independent Test**: 768×1024 shows two panes; 1280×800 matches today’s proportions

- [x] T014 [US3] Add tablet narrower/collapsible list and desktop `max-w-md` list in `apps/guestflow/src/components/inbox/InboxLayoutShell.tsx`

**Checkpoint**: Tablet and desktop layouts are independently testable

---

## Phase 6: User Story 4 - Thumb-sized, 360px-safe controls (Priority: P1)

**Goal**: 16px text, 44px taps, wrap, compact redirect banner, working hamburger, phone-fitting confirm

**Independent Test**: At 360px, search / filter / badges / hamburger / confirm fit; no sideways scroll

- [x] T015 [P] [US4] Compact the redirect banner on phone in `apps/guestflow/src/components/outbound-redirect-banner.tsx`
- [x] T016 [P] [US4] Make the hamburger a 44px target in `apps/guestflow/src/components/Navigation.tsx`
- [x] T017 [US4] Apply 16px inputs, 44px taps, and wrap classes on list/thread/composer in `apps/guestflow/src/app/page.tsx`
- [x] T018 [US4] Add phone-fitting confirm dialog in `apps/guestflow/src/components/inbox/InboxConfirmDialog.tsx` and use it from `apps/guestflow/src/app/page.tsx`

**Checkpoint**: 360px fit and tap sizes are independently testable

---

## Phase 7: User Story 5 - Same Approve&Send and rebase-safe slots (Priority: P1)

**Goal**: Identical approve + confirmToken sequence; empty slots for parallel PRs

**Independent Test**: Confirm still issues confirmToken; cancel sends nothing; slots exist and are empty

- [x] T019 [US5] Keep approve → confirmToken → send unchanged in `apps/guestflow/src/app/page.tsx`; only swap `window.confirm` for `InboxConfirmDialog`
- [x] T020 [US5] Render empty `header-badge`, `header-actions`, and per-bubble `bubble-status` slots from `apps/guestflow/src/app/page.tsx` / `ThreadLayoutShell`
- [x] T021 [P] [US5] Assert confirmToken sequence + slot hooks in `apps/guestflow/__tests__/mobile-inbox-ui.test.ts`

**Checkpoint**: Safety and slot contract are independently testable

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence, STATUS, typecheck, no ignoreBuildErrors

- [x] T022 [P] Playwright screenshots + no-horizontal-overflow in `apps/guestflow/e2e/mobile-inbox.spec.ts` at 360×800, 390×844, 768×1024, 1280×800 for list, thread, draft+keyboard, confirm
- [x] T023 [P] Commit screenshots under `specs/022-sprint2-mobile-inbox/screenshots/` using fixture guests only
- [x] T024 Run Lighthouse mobile accessibility on Inbox (`/?fixture=1`) and record score ≥ 90 in `specs/022-sprint2-mobile-inbox/lighthouse-inbox-a11y.json`
- [x] T025 Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md` (ritual: pinch-zoom / sideways-scroll inbox on phone)
- [x] T026 Confirm `apps/guestflow/next.config.mjs` does not set `typescript.ignoreBuildErrors`; run lint/test/build

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–7)**: Depend on Foundational; US2 depends on US1 shell wiring; US5 confirm depends on US4 dialog
- **Polish (Phase 8)**: Depends on stories that produce the UI under test

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational
- **User Story 2 (P1)**: After US1 page wiring
- **User Story 3 (P2)**: After Foundational shell
- **User Story 4 (P1)**: After composer/header exist
- **User Story 5 (P1)**: After confirm dialog exists

### Parallel Opportunities

- T003 / T004 / T005
- T015 / T016
- T022 / T023 / T024 after UI exists

---

## Parallel Example: User Story 4

```bash
Task: "Compact the redirect banner on phone in apps/guestflow/src/components/outbound-redirect-banner.tsx"
Task: "Make the hamburger a 44px target in apps/guestflow/src/components/Navigation.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup + Foundational
2. Phone single-pane + back
3. Then pins, tablet, a11y, slots, evidence

### Incremental Delivery

Do not merge or deploy. One PR. Stop at Preview READY for GFM.

## Notes

- Paths are relative to repo root
- No API files
- Mark each task `[X]` when done
