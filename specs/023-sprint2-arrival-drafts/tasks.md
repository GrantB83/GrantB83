# Tasks: Sprint 2 Scheduled Arrival Drafts

**Input**: Design documents from `/specs/023-sprint2-arrival-drafts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required (brief: SAST midnight, late bookings, idempotency, cancel/date-change, code re-read, no-contact, property-unresolved)

## Phase 1: Setup

- [x] T001 Write `apps/guestflow/src/lib/arrival-drafts-config.ts` with timeZone `Africa/Johannesburg`, runHourSast `6`, and stage offsets T-3 `-3`, T-1 `-1`, Day-of `0`
- [x] T002 [P] Add `apps/guestflow/docs/ARRIVAL-DRAFTS.md` (how scheduling works, Hobby GHA fallback, wire-after #218/#219)
- [x] T003 [P] Add unused `apps/guestflow/scripts/migrate-arrival-drafts.js` (Turso-safe ALTER/CREATE; refuse Production without `APPROVE APPLY MIGRATION`; do not run)

---

## Phase 2: Foundational

- [x] T004 Add `ensureArrivalDraftsSchema` in `apps/guestflow/src/lib/arrival-drafts-schema.ts` creating `arrival_drafts` with unique `(tenant_id, booking_id, stage)` and status/channel/fingerprint/codes_snapshot columns from data-model.md
- [x] T005 [P] Implement `getWindowState` in `apps/guestflow/src/lib/whatsapp-window.ts` (24h from last inbound; matching #218)
- [x] T006 [P] Implement `findApprovedTemplateFor` + `fillTemplate` in `apps/guestflow/src/lib/whatsapp-templates.ts` (Grant-local bodies; `approved` only when contentSid present; matching #218)
- [x] T007 [P] Implement `hasGuestContact` + `resolveContactPresence` in `apps/guestflow/src/lib/contact-presence.ts` using `normalizeZaE164` / `normalizeEmail` (matching #219)
- [x] T008 [P] Implement deterministic fills in `apps/guestflow/src/lib/arrival-templates.ts` for `browns_pre_arrival_welcome`, `browns_checkin_instructions` + `browns_access_codes`, and Day-of reminder (no LLM)
- [x] T009 Export `ensureBookingThreadForOutbound` from `apps/guestflow/src/lib/umi-threads.ts` (create booking thread only when writing a real outbound draft or no-contact item)

**Checkpoint**: Config, schema helper, and resolver shims exist

---

## Phase 3: User Story 1 - Arrival drafts appear on time (Priority: P1) 🎯 MVP

**Goal**: Idempotent SAST job creates labelled T-3 / T-1 / Day-of drafts and sets Needs attention

**Independent Test**: Freeze SAST date/hour; fixture three due bookings; run twice; three drafts, no dupes

### Tests for User Story 1

- [x] T010 [P] [US1] Unit tests for due-date / SAST midnight / run-hour gate in `apps/guestflow/src/lib/__tests__/arrival-drafts.test.ts`
- [x] T011 [P] [US1] Cron auth + idempotency tests in `apps/guestflow/__tests__/arrival-drafts-cron.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement `dueStagesForCheckIn`, `sastHour`, fingerprint, and `runArrivalDraftsJob` in `apps/guestflow/src/lib/arrival-drafts.ts`
- [x] T013 [US1] Add `GET/POST` `apps/guestflow/src/app/api/cron/arrival-drafts/route.ts` (CRON_SECRET Bearer or `x-cron-secret`; optional `now`; never send)
- [x] T014 [US1] Daily cron only in `apps/guestflow/vercel.json` (`0 4 * * *` → 06:00 SAST); do not add hourly Vercel cron
- [x] T015 [US1] Hourly GHA fallback in `.github/workflows/guestflow-arrival-drafts-hourly.yml` hitting the same route
- [x] T016 [US1] Extend `extraAttentionByBooking` / `listInboxThreads` / `getThreadDetail` in `apps/guestflow/src/lib/umi-threads.ts` so open arrival drafts set `needsAttention`, `hasOpenDraft`, and stage label

**Checkpoint**: Job creates unique labelled drafts after run hour

---

## Phase 4: User Story 2 - Approve&Send with live codes (Priority: P1)

**Goal**: T-1 codes from `resolveAccessCodesForSuite` at draft and again at send; cron never sends

**Independent Test**: Change lockbox between draft and send; outbound uses live result or fail-closed placeholder

### Tests for User Story 2

- [x] T017 [P] [US2] Tests for code snapshot vs re-read and property-unresolved fail-closed in `apps/guestflow/src/lib/__tests__/arrival-drafts.test.ts`

### Implementation for User Story 2

- [x] T018 [US2] T-1 fill uses `resolveAccessCodesForSuite` and a delimited codes block plus `codes_snapshot` in `apps/guestflow/src/lib/arrival-drafts.ts`
- [x] T019 [US2] `refreshArrivalDraftCodesAtSend` in `apps/guestflow/src/lib/arrival-drafts.ts` replaces the codes block from a fresh resolve
- [x] T020 [US2] Call refresh from `apps/guestflow/src/app/api/inbound/send/route.ts` after eligibility and before provider send
- [x] T021 [US2] Show stage label on Inbox in `apps/guestflow/src/app/page.tsx` without adding a send path

**Checkpoint**: Stale codes cannot be sent

---

## Phase 5: User Story 3 - Skip wrong rows; recover from changes (Priority: P1)

**Goal**: Skip cancelled/BLOCK; late stages only; regenerate unsent on date/suite change; discard on cancel; no-contact item

**Independent Test**: Fixture those rows; job matches acceptance scenarios

### Tests for User Story 3

- [x] T022 [P] [US3] Late-booking, cancel, date-change, BLOCK, and no-contact tests in `apps/guestflow/src/lib/__tests__/arrival-drafts.test.ts` and `apps/guestflow/src/lib/__tests__/contact-presence.test.ts`

### Implementation for User Story 3

- [x] T023 [US3] Filter candidates with `isActiveGuestBooking` / `isOwnerBlock` in `apps/guestflow/src/lib/arrival-drafts.ts`
- [x] T024 [US3] Late bookings: create only stages whose due date equals today SAST (never backfill) in `apps/guestflow/src/lib/arrival-drafts.ts`
- [x] T025 [US3] Fingerprint change regenerates unsent; cancel discards unsent in `apps/guestflow/src/lib/arrival-drafts.ts`
- [x] T026 [US3] No contact → `attention_reason = 'no contact'`, `draft_body = null`, Needs attention, no guest draft in `apps/guestflow/src/lib/arrival-drafts.ts`

**Checkpoint**: Wrong rows never get guest drafts

---

## Phase 6: User Story 4 - Channel and WhatsApp window (Priority: P2)

**Goal**: WA if phone else email; closed window uses approved template or `template pending approval`

**Independent Test**: Four fixtures (open window, closed+approved, closed+pending, email-only)

### Tests for User Story 4

- [x] T027 [P] [US4] Window + template-pending tests in `apps/guestflow/src/lib/__tests__/whatsapp-window.test.ts` and arrival-drafts tests

### Implementation for User Story 4

- [x] T028 [US4] Channel + window + `findApprovedTemplateFor` branch in `apps/guestflow/src/lib/arrival-drafts.ts`
- [x] T029 [US4] Day-of closed window without an approved template name marks `template pending approval` in `apps/guestflow/src/lib/arrival-drafts.ts`

**Checkpoint**: Channel and template rules hold

---

## Phase 7: Polish & Cross-Cutting

- [x] T030 [P] Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md` (ritual removed: hand-writing T-3/T-1/day-of)
- [x] T031 Run lint / `tsc --noEmit` / vitest for `apps/guestflow` (no `typescript.ignoreBuildErrors`)
- [x] T032 Mark tasks complete and record Spec Kit evidence in the PR body

---

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2 / US3 (US3 shares `arrival-drafts.ts` with US1) → US4 → Polish
- US2 send hook depends on US1 draft rows
- #218/#219 are merge dependencies, not this PR’s merge

## Parallel opportunities

- T002/T003; T005/T006/T007/T008; test files T010/T011/T017/T022/T027

## MVP

US1 job + unique drafts + Needs attention. US2/US3 are required for the brief’s fail-closed and skip rules before GFM acceptance.
