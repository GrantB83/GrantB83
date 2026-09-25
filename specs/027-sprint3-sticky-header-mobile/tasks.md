# Tasks: Sprint 3 Sticky Header and Mobile Inbox Width

**Input**: Design documents from `/specs/027-sprint3-sticky-header-mobile/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Layout and source-scan tests are required (UI acceptance criteria in spec)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **GuestFlow app**: `apps/guestflow/src/` for source, `apps/guestflow/__tests__/` for tests
- Paths are relative to workspace root `/workspace/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm live GuestFlow inbox chrome from #235 before changing it

- [x] T001 Verify Next.js 14.2 / React 18.3 / Vitest 1.0 in apps/guestflow/package.json
- [x] T002 [P] Verify InboxLayoutShell, ThreadLayoutShell, useInboxChromeOffset, useShellDimensions exist under apps/guestflow/src/components/inbox/
- [x] T003 [P] Verify LIST_SCROLL_KEY and body overflow lock in apps/guestflow/src/app/page.tsx
- [x] T004 [P] Verify .inbox-shell fixed positioning in apps/guestflow/src/app/globals.css

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Single chrome measurement point and inbox-lock CSS tokens

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Add .ops-chrome, --ops-chrome-height, .staff-main, and html.inbox-lock rules in apps/guestflow/src/app/globals.css
- [x] T006 Create StaffChrome fixed wrapper that sets --ops-chrome-height in apps/guestflow/src/components/StaffChrome.tsx
- [x] T007 Mount StaffChrome around banner + nav and apply staff-main in apps/guestflow/src/app/layout.tsx
- [x] T008 Remove in-flow sticky from nav now that the parent stack is fixed in apps/guestflow/src/components/Navigation.tsx
- [x] T009 Measure [data-ops-chrome] height once (no nav+wrapper double-count) in apps/guestflow/src/components/inbox/useInboxChromeOffset.ts

**Checkpoint**: Fixed chrome stack exists and offset helpers read it once

---

## Phase 3: User Story 1 - Sticky staff chrome while inbox panes scroll (Priority: P1) 🎯 MVP

**Goal**: Navy header + Redirect banner/control stay visible while list/thread panes scroll; one primary scroll per pane

**Independent Test**: `/?fixture=1` desktop and phone — scroll panes; chrome stays; no outer-page dual-scroll

### Tests for User Story 1

- [x] T010 [P] [US1] Add sticky chrome source-scan and offset-once tests in apps/guestflow/__tests__/layout/sticky-chrome.test.ts

### Implementation for User Story 1

- [x] T011 [US1] Apply inbox-lock on html/body while `/` is mounted in apps/guestflow/src/app/page.tsx
- [x] T012 [US1] Keep InboxLayoutShell top equal to chromeOffset only in apps/guestflow/src/components/inbox/InboxLayoutShell.tsx
- [x] T013 [US1] Confirm useShellDimensions still subtracts chromeOffset once in apps/guestflow/src/components/inbox/useShellDimensions.ts

**Checkpoint**: Header stays on screen; panes are the only scrollers

---

## Phase 4: User Story 2 - Preserve #235 height floors without double-counting (Priority: P1)

**Goal**: ~1280×800 messages ≥240px or ≥35% shell; composer ≤50%; sticky height not applied twice

**Independent Test**: Existing message-height and composer-height tests plus sticky double-count assertion

### Tests for User Story 2

- [x] T014 [P] [US2] Re-run #235 floor tests in apps/guestflow/__tests__/layout/message-height.test.ts and apps/guestflow/__tests__/layout/composer-height.test.ts

### Implementation for User Story 2

- [x] T015 [US2] Ensure html.inbox-lock zeroes staff-main padding-top in apps/guestflow/src/app/globals.css
- [x] T016 [US2] Keep minMessageHeight / maxComposerHeight wiring in apps/guestflow/src/app/page.tsx and apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx

**Checkpoint**: #235 floors still hold with sticky chrome

---

## Phase 5: User Story 3 - Wider usable phone list and thread (Priority: P1)

**Goal**: At ~390×844, list preview + upper stack and thread header/transcript use ≥90% of shell width

**Independent Test**: Phone fixture screenshots and width contract tests

### Tests for User Story 3

- [x] T017 [P] [US3] Add phone pane width / gutter tests in apps/guestflow/__tests__/layout/mobile-pane-width.test.ts

### Implementation for User Story 3

- [x] T018 [US3] Add phone gutter rules for list header, list rows, thread header, messages, composer in apps/guestflow/src/app/globals.css
- [x] T019 [US3] Mark list header/rows with inbox width classes in apps/guestflow/src/app/page.tsx
- [x] T020 [US3] Stack thread-header badges under facts on phone and tag message scroller in apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx
- [x] T021 [US3] Keep phone panes full shell width (no extra max-width) in apps/guestflow/src/components/inbox/InboxLayoutShell.tsx

**Checkpoint**: Phone preview and upper box are readable/tappable

---

## Phase 6: User Story 4 - Preserve Back list-scroll, Approve&Send, From freeze (Priority: P1)

**Goal**: LIST_SCROLL_KEY, Approve&Send visibility, no auto-send, From +27600200825 unchanged

**Independent Test**: Existing mobile-scroll-restore and mobile-inbox-ui tests

### Tests for User Story 4

- [x] T022 [P] [US4] Re-run LIST_SCROLL_KEY tests in apps/guestflow/__tests__/layout/mobile-scroll-restore.test.ts
- [x] T023 [P] [US4] Extend apps/guestflow/__tests__/mobile-inbox-ui.test.ts to assert sticky stack + phone gutters without send-path changes

### Implementation for User Story 4

- [x] T024 [US4] Confirm LIST_SCROLL_KEY remember/restore and Approve&Send remain in apps/guestflow/src/app/page.tsx
- [x] T025 [US4] Confirm outbound From / redirect modules are untouched (apps/guestflow/src/lib/outbound-redirect.ts)

**Checkpoint**: Safety contracts intact

---

## Phase 7: Polish & Cross-Cutting

- [x] T026 [P] Update docs/automation/STATUS.md with Sprint 3 T+U package note
- [x] T027 [P] Add labor-ledger row for sticky chrome + phone width ritual in docs/automation/labor-ledger.md
- [ ] T028 Capture phone ~390×844 list + thread screenshots for GFM (FR-012)
- [ ] T029 Run GuestFlow lint/test quality gate for touched files

---

## Dependencies

- Phase 1 → Phase 2 → US1 (T) → US2 (floors) → US3 (U) → US4 (preserve) → Polish
- US1 and US3 both need Phase 2 chrome measurement
- US2 depends on US1 inbox-lock so padding is not double-counted
- US4 can be verified in parallel with US3 tests after implementation

## Parallel opportunities

- T002–T004 after T001
- T010 while T011–T013 are written
- T017 while T018–T021
- T022–T023 with T024–T025
- T026–T027 in parallel

## Implementation strategy

MVP is US1 (sticky chrome). US2 is the non-regression gate. US3 is the coupled width fix (same chrome box model). US4 is the safety lock. Ship one draft PR covering T+U.
