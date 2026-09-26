# Tasks: Sprint 5 Inbox, Journey, and Guest Portal

**Input**: Design documents from `/specs/033-sprint5-inbox-portal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Requested (vitest where practical)

## Phase 1: Setup

- [x] T001 Create `.specify/feature.json` pointing at `specs/033-sprint5-inbox-portal`
- [x] T002 [P] Confirm ignore files already cover `node_modules/`, `.env*`, and GuestFlow build outputs in `apps/guestflow/.gitignore`

## Phase 2: Foundational

- [x] T003 Add journey stage config (`4a`–`4g`, SAST hours, template names, minNights, guestFacing) in `apps/guestflow/src/lib/journey-config.ts`
- [x] T004 Add SAST portal security window helper (check-in 14:00 through departure 12:00) in `apps/guestflow/src/lib/portal-security.ts`
- [x] T005 Add room display helper (Wolery→Heritage Cottage, verified homepage URL, mappingGap) in `apps/guestflow/src/lib/room-catalog.ts`
- [x] T006 Add header chip prioritization (≤3 + Details, `Window closed` spelling, tones) in `apps/guestflow/src/lib/header-chips.ts`
- [x] T007 [P] Write failing unit tests in `apps/guestflow/src/lib/__tests__/journey-config.test.ts`, `apps/guestflow/src/lib/__tests__/portal-security.test.ts`, `apps/guestflow/src/lib/__tests__/room-catalog.test.ts`, and `apps/guestflow/src/lib/__tests__/header-chips.test.ts`

## Phase 3: User Story 1 - Guest contact labels (Priority: P1)

**Goal**: Details modal says Guest phone/email; Save persists via `{ phone, email }`

**Independent Test**: Open Details; labels are Guest; Save works

- [x] T008 [US1] Relabel Guest phone/email and POST `{ phone, email }` in `apps/guestflow/src/components/inbox/ThreadHeaderDetails.tsx`
- [x] T009 [P] [US1] Align guest-contact save note copy in `apps/guestflow/src/app/page.tsx`
- [x] T010 [P] [US1] Add source-contract assertions for Guest labels / no Staff labels in `apps/guestflow/__tests__/sprint5-inbox-ui.test.ts`

## Phase 4: User Story 2 - WhatsApp-style composer (Priority: P1)

**Goal**: One history scroll + overlay composer; pending tap; cut Template&Care; CTAs above taskbar

**Independent Test**: Fixture thread: overlay composer, no Template&Care, pending tap loads draft, Approve&Send visible

- [x] T011 [US2] Build overlay composer (channel/templates/attach icons, expand on focus, navy Approve & Send, Cancel ghost, dvh/safe-area) in `apps/guestflow/src/components/inbox/ThreadComposer.tsx`
- [x] T012 [US2] Make Zone B the only overflow and Zone C the overlay footer in `apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx`
- [x] T013 [US2] Wire pending-bubble tap, cut Template & Care, keep confirmToken Approve&Send in `apps/guestflow/src/app/page.tsx`
- [x] T014 [US2] Apply `100dvh`/`svh` shell and Zone C `padding-bottom: max(12px, env(safe-area-inset-bottom))` in `apps/guestflow/src/app/globals.css`
- [x] T015 [P] [US2] Expose `draftReply` / pending draft fields on messages in `apps/guestflow/src/components/inbox/inbox-types.ts` and fixture pending bubble in `apps/guestflow/src/components/inbox/inbox-fixture.ts`
- [x] T016 [P] [US2] Assert no Template & Care and overlay composer contract in `apps/guestflow/__tests__/sprint5-inbox-ui.test.ts`

## Phase 5: User Story 3 - Lean list + header chips (Priority: P1)

**Goal**: Strip list chips; one header chip language ≤3 + Details

**Independent Test**: List has no chip row; header shows Window closed / Day-of / Details

- [x] T017 [US3] Render HeaderStatusChips (≤3 + Details overflow) in `apps/guestflow/src/components/inbox/HeaderStatusChips.tsx`
- [x] T018 [US3] Use chip helper in `apps/guestflow/src/components/inbox/ThreadHeader.tsx`
- [x] T019 [US3] Strip list chip row; use ARRIVING/IN HOUSE/DEPARTING and `Draft ·` prefix in `apps/guestflow/src/app/page.tsx`
- [x] T020 [P] [US3] Assert list has no `WA closed` chip row and header uses `Window closed` in `apps/guestflow/__tests__/sprint5-inbox-ui.test.ts`

## Phase 6: User Story 4 - Journey 4a–4g (Priority: P1)

**Goal**: Named drafts + SAST windows + portal links; no auto-send

**Independent Test**: Job creates 4a–4g drafts per clock; 4f no guest send

- [x] T021 [US4] Add 4a–4g bodies (reuse catalogue; 4a email+WA; 4g uses GRANT_REVIEW_URL) in `apps/guestflow/src/lib/arrival-templates.ts`
- [x] T022 [US4] Point active stages at journey-config and keep legacy ids readable in `apps/guestflow/src/lib/arrival-drafts-config.ts`
- [x] T023 [US4] Expand booking horizon, per-stage hours, dual-channel 4a, skip 4d when nights≤1, 4f system-only in `apps/guestflow/src/lib/arrival-drafts.ts`
- [x] T024 [US4] Order open-draft preference for 4a–4g in `apps/guestflow/src/lib/umi-threads.ts`
- [x] T025 [US4] Update job tests in `apps/guestflow/src/lib/__tests__/arrival-drafts.test.ts`
- [x] T026 [P] [US4] Document 4a–4g in `apps/guestflow/docs/ARRIVAL-DRAFTS.md`

## Phase 7: User Story 5 - Guest Portal (Priority: P1)

**Goal**: Room-specific portal; timed security; no invented codes

**Independent Test**: Pre/during/post window payloads; Wolery→Heritage Cottage; SSID product name

- [x] T027 [US5] Delegate `shouldShowAccessCodes` to portal-security in `apps/guestflow/src/lib/token.ts`
- [x] T028 [US5] Return rooms[], securityOpen, gated wifi/codes, pre-window copy in `apps/guestflow/src/app/api/guest-portal/[code]/route.ts`
- [x] T029 [US5] Render rooms + thebrowns links + local info + headed security states in `apps/guestflow/src/app/guest/[code]/page.tsx`
- [x] T030 [P] [US5] Add portal artefact notes in `apps/guestflow/docs/SPRINT5-INBOX-PORTAL.md`

## Phase 8: Polish

- [x] T031 Write VERIFY PACK (S1–S10, Design ACCEPT, QA job-script, locks) in `specs/verify/sprint-5/VERIFY-PACK.md`
- [x] T032 [P] Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md`
- [x] T033 Run vitest + tsc for touched GuestFlow paths and fix regressions
- [x] T034 Mark completed tasks in `specs/033-sprint5-inbox-portal/tasks.md`

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

## Phase 9: Convergence

- [x] T035 [US5] Keep guest-facing portal `accessCodes.message` on the security clock copy; staff mapping gap stays on `needsAttentionReason` / inbox chips only in `apps/guestflow/src/app/api/guest-portal/[code]/route.ts` (FR-013, US5/AC5) (contradicts)
- [x] T036 [US5] Hide the Wi-Fi password row unless an SoR password is present in `apps/guestflow/src/app/guest/[code]/page.tsx` (FR-011, US5/AC2) (partial)
- [x] T037 [US4] Flag unresolved lockbox mapping on 4c as staff `needs_attention` without embedding codes, and assert it in `apps/guestflow/src/lib/__tests__/arrival-drafts.test.ts` (FR-013, S3) (partial)
