# Tasks: Sprint 5 Inbox, Journey, and Guest Portal

**Input**: Design documents from `/specs/033-sprint5-inbox-portal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Requested (vitest where practical)

## Phase 1: Setup

- [ ] T001 Create `.specify/feature.json` pointing at `specs/033-sprint5-inbox-portal`
- [ ] T002 [P] Confirm ignore files already cover `node_modules/`, `.env*`, and GuestFlow build outputs in `apps/guestflow/.gitignore`

## Phase 2: Foundational

- [ ] T003 Add journey stage config (`4a`–`4g`, SAST hours, template names, minNights, guestFacing) in `apps/guestflow/src/lib/journey-config.ts`
- [ ] T004 Add SAST portal security window helper (check-in 14:00 through departure 12:00) in `apps/guestflow/src/lib/portal-security.ts`
- [ ] T005 Add room display helper (Wolery→Heritage Cottage, verified homepage URL, mappingGap) in `apps/guestflow/src/lib/room-catalog.ts`
- [ ] T006 Add header chip prioritization (≤3 + Details, `Window closed` spelling, tones) in `apps/guestflow/src/lib/header-chips.ts`
- [ ] T007 [P] Write failing unit tests in `apps/guestflow/src/lib/__tests__/journey-config.test.ts`, `apps/guestflow/src/lib/__tests__/portal-security.test.ts`, `apps/guestflow/src/lib/__tests__/room-catalog.test.ts`, and `apps/guestflow/src/lib/__tests__/header-chips.test.ts`

## Phase 3: User Story 1 - Guest contact labels (Priority: P1)

**Goal**: Details modal says Guest phone/email; Save persists via `{ phone, email }`

**Independent Test**: Open Details; labels are Guest; Save works

- [ ] T008 [US1] Relabel Guest phone/email and POST `{ phone, email }` in `apps/guestflow/src/components/inbox/ThreadHeaderDetails.tsx`
- [ ] T009 [P] [US1] Align guest-contact save note copy in `apps/guestflow/src/app/page.tsx`
- [ ] T010 [P] [US1] Add source-contract assertions for Guest labels / no Staff labels in `apps/guestflow/__tests__/sprint5-inbox-ui.test.ts`

## Phase 4: User Story 2 - WhatsApp-style composer (Priority: P1)

**Goal**: One history scroll + overlay composer; pending tap; cut Template&Care; CTAs above taskbar

**Independent Test**: Fixture thread: overlay composer, no Template&Care, pending tap loads draft, Approve&Send visible

- [ ] T011 [US2] Build overlay composer (channel/templates/attach icons, expand on focus, navy Approve & Send, Cancel ghost, dvh/safe-area) in `apps/guestflow/src/components/inbox/ThreadComposer.tsx`
- [ ] T012 [US2] Make Zone B the only overflow and Zone C the overlay footer in `apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx`
- [ ] T013 [US2] Wire pending-bubble tap, cut Template & Care, keep confirmToken Approve&Send in `apps/guestflow/src/app/page.tsx`
- [ ] T014 [US2] Apply `100dvh`/`svh` shell and Zone C `padding-bottom: max(12px, env(safe-area-inset-bottom))` in `apps/guestflow/src/app/globals.css`
- [ ] T015 [P] [US2] Expose `draftReply` / pending draft fields on messages in `apps/guestflow/src/components/inbox/inbox-types.ts` and fixture pending bubble in `apps/guestflow/src/components/inbox/inbox-fixture.ts`
- [ ] T016 [P] [US2] Assert no Template & Care and overlay composer contract in `apps/guestflow/__tests__/sprint5-inbox-ui.test.ts`

## Phase 5: User Story 3 - Lean list + header chips (Priority: P1)

**Goal**: Strip list chips; one header chip language ≤3 + Details

**Independent Test**: List has no chip row; header shows Window closed / Day-of / Details

- [ ] T017 [US3] Render HeaderStatusChips (≤3 + Details overflow) in `apps/guestflow/src/components/inbox/HeaderStatusChips.tsx`
- [ ] T018 [US3] Use chip helper in `apps/guestflow/src/components/inbox/ThreadHeader.tsx`
- [ ] T019 [US3] Strip list chip row; use ARRIVING/IN HOUSE/DEPARTING and `Draft ·` prefix in `apps/guestflow/src/app/page.tsx`
- [ ] T020 [P] [US3] Assert list has no `WA closed` chip row and header uses `Window closed` in `apps/guestflow/__tests__/sprint5-inbox-ui.test.ts`

## Phase 6: User Story 4 - Journey 4a–4g (Priority: P1)

**Goal**: Named drafts + SAST windows + portal links; no auto-send

**Independent Test**: Job creates 4a–4g drafts per clock; 4f no guest send

- [ ] T021 [US4] Add 4a–4g bodies (reuse catalogue; 4a email+WA; 4g uses GRANT_REVIEW_URL) in `apps/guestflow/src/lib/arrival-templates.ts`
- [ ] T022 [US4] Point active stages at journey-config and keep legacy ids readable in `apps/guestflow/src/lib/arrival-drafts-config.ts`
- [ ] T023 [US4] Expand booking horizon, per-stage hours, dual-channel 4a, skip 4d when nights≤1, 4f system-only in `apps/guestflow/src/lib/arrival-drafts.ts`
- [ ] T024 [US4] Order open-draft preference for 4a–4g in `apps/guestflow/src/lib/umi-threads.ts`
- [ ] T025 [US4] Update job tests in `apps/guestflow/src/lib/__tests__/arrival-drafts.test.ts`
- [ ] T026 [P] [US4] Document 4a–4g in `apps/guestflow/docs/ARRIVAL-DRAFTS.md`

## Phase 7: User Story 5 - Guest Portal (Priority: P1)

**Goal**: Room-specific portal; timed security; no invented codes

**Independent Test**: Pre/during/post window payloads; Wolery→Heritage Cottage; SSID product name

- [ ] T027 [US5] Delegate `shouldShowAccessCodes` to portal-security in `apps/guestflow/src/lib/token.ts`
- [ ] T028 [US5] Return rooms[], securityOpen, gated wifi/codes, pre-window copy in `apps/guestflow/src/app/api/guest-portal/[code]/route.ts`
- [ ] T029 [US5] Render rooms + thebrowns links + local info + headed security states in `apps/guestflow/src/app/guest/[code]/page.tsx`
- [ ] T030 [P] [US5] Add portal artefact notes in `apps/guestflow/docs/SPRINT5-INBOX-PORTAL.md`

## Phase 8: Polish

- [ ] T031 Write VERIFY PACK (S1–S10, Design ACCEPT, QA job-script, locks) in `specs/verify/sprint-5/VERIFY-PACK.md`
- [ ] T032 [P] Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md`
- [ ] T033 Run vitest + tsc for touched GuestFlow paths and fix regressions
- [ ] T034 Mark completed tasks in `specs/033-sprint5-inbox-portal/tasks.md`

## Dependencies

- Setup → Foundational (T003–T007) blocks all stories
- US1–US3 share `page.tsx` (sequential after composer/list edits)
- US4–US5 independent of UI after foundational helpers
- Polish after stories

## Parallel example

```text
T003 journey-config.ts
T004 portal-security.ts
T005 room-catalog.ts
T006 header-chips.ts
```

## MVP

US1 + US2 + US3 (inbox staff job). US4 + US5 complete the saleable stay journey.

## Implementation strategy

Foundational helpers and tests first, then labels, composer, chips, journey job, portal, VERIFY PACK.
