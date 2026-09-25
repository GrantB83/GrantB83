---

description: "Task list for Sprint 2 WhatsApp window, templates, and property knowledge"
---

# Tasks: Sprint 2 WhatsApp Window, Templates, and Knowledge

**Input**: Design documents from `/specs/019-sprint2-whatsapp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by FR-021.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Feature directory already exists; lock GuestFlow touch-points

- [ ] T001 Record feature path in `.specify/feature.json` and keep the diff inside `apps/guestflow/` plus `specs/019-sprint2-whatsapp/`
- [ ] T002 [P] Confirm `apps/guestflow/next.config.mjs` has no `typescript.ignoreBuildErrors`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema ensure + shared types before stories

- [ ] T003 Add `ensureSprint2WhatsappSchema` creating `wa_templates` (name, category, language, body, variable_mapping, content_sid, approval_status, whatsapp_approval_status, last_synced_at) and `property_knowledge` (property, section, key, value, source, last_updated_*) in `apps/guestflow/src/lib/sprint2-schema.ts`
- [ ] T004 [P] Add unused Production-safe migration script `apps/guestflow/scripts/migrate-sprint2-whatsapp.js` that refuses `libsql://` / production Turso URLs unless `ALLOW_PROD_TURSO=NEVER` (script is not run in this package)
- [ ] T005 [P] Extend `SendMessageRequest` with optional `contentSid` and `contentVariables` in `apps/guestflow/src/types/inbound.ts`

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - Staff see the WhatsApp 24h window (Priority: P1) 🎯 MVP

**Goal**: Per-thread Cloud window math + inbox/header/composer badges

**Independent Test**: Window unit tests + inbox fields on fixture threads

### Tests for User Story 1

- [ ] T006 [P] [US1] Write window math tests (open, exact 24h closed, 24h+1m closed, timezone UTC vs SAST, Web inbound does not open) in `apps/guestflow/src/lib/__tests__/whatsapp-care-window.test.ts`

### Implementation for User Story 1

- [ ] T007 [US1] Implement `computeCareWindow` / `formatWindowLabel` / `isWabaCloudInbound` in `apps/guestflow/src/lib/whatsapp-care-window.ts`
- [ ] T008 [US1] Load last WABA inbound timestamps and attach `careWindow` in `apps/guestflow/src/lib/umi-threads.ts` (`listInboxThreads`, `getThreadDetail`)
- [ ] T009 [US1] Show header + composer badge (`Window open, closes in Xh Ym` / `Window closed`) and inbox closed/closing-soon marks in `apps/guestflow/src/app/page.tsx`

**Checkpoint**: US1 independently testable

---

## Phase 4: User Story 2 - Free-text WhatsApp blocked when window closed (Priority: P1)

**Goal**: UI warning + 409 guard + comment fix

**Independent Test**: inbound-send-handler 409; email/SMS unaffected

### Tests for User Story 2

- [ ] T010 [P] [US2] Add 409 (no Twilio) and email/SMS unaffected cases in `apps/guestflow/__tests__/inbound-send-handler.test.ts`

### Implementation for User Story 2

- [ ] T011 [US2] Guard WhatsApp Cloud free-text in `apps/guestflow/src/app/api/inbound/send/route.ts` (409 before confirmToken consume; no Twilio)
- [ ] T012 [US2] Switch composer to template mode and warn in confirm dialog when closed or closing-soon in `apps/guestflow/src/app/page.tsx`
- [ ] T013 [US2] Replace the “Twilio does not have this restriction” comments in `apps/guestflow/src/lib/whatsapp.ts` and update `apps/guestflow/__tests__/whatsapp.test.ts` if it asserts the old note

**Checkpoint**: US1 + US2 work together

---

## Phase 5: User Story 3 - Templates catalogue, picker, fill, send (Priority: P1)

**Goal**: Seed 7 templates; picker approved-only; SoR fill; ContentSid send; read-only sync; unused submit script

**Independent Test**: picker filter + SoR fill tests; send uses ContentSid

### Tests for User Story 3

- [ ] T014 [P] [US3] Write picker filter tests in `apps/guestflow/src/lib/__tests__/wa-templates-picker.test.ts`
- [ ] T015 [P] [US3] Write SoR variable-fill tests (lockbox.property main-house despite “cottage” in suite name; missing property → no codes) in `apps/guestflow/src/lib/__tests__/wa-template-fill.test.ts`

### Implementation for User Story 3

- [ ] T016 [P] [US3] Seed seven Grant-approved bodies + mappings in `apps/guestflow/src/lib/wa-templates-seed.ts` (review URL static; status `approved_by_grant_unsubmitted`; no SIDs)
- [ ] T017 [US3] Implement catalogue helpers + approved-only filter + read-only Twilio Content fetch in `apps/guestflow/src/lib/wa-templates.ts`
- [ ] T018 [US3] Implement `resolveCodesFromLockboxProperty` (exact suite match; property from lockbox field only) in `apps/guestflow/src/lib/access-codes-from-lockbox.ts`
- [ ] T019 [US3] Add `GET /api/ops/wa-templates`, fill, and read-only sync routes under `apps/guestflow/src/app/api/ops/wa-templates/`
- [ ] T020 [US3] Add ContentSid + ContentVariables path (redirect still applies) in `apps/guestflow/src/lib/whatsapp.ts`
- [ ] T021 [US3] Wire template picker (empty-state copy) and template Approve&Send payload in `apps/guestflow/src/app/page.tsx` and `apps/guestflow/src/app/api/inbound/send/route.ts`
- [ ] T022 [US3] Add `apps/guestflow/scripts/submit-wa-templates.ts` requiring `--i-have-grant-go-ahead`; do not run it; add npm script `wa:submit-templates` in `apps/guestflow/package.json`

**Checkpoint**: US3 independently testable

---

## Phase 6: User Story 4 - Property knowledge + draft injection (Priority: P2)

**Goal**: Staff-editable KB, seed from real sources, inject into LLM prompt, 10-question fixture

**Independent Test**: knowledge tests + prompt-level no-fact guard

### Tests for User Story 4

- [ ] T023 [P] [US4] Write knowledge format/upsert tests in `apps/guestflow/src/lib/__tests__/property-knowledge.test.ts`
- [ ] T024 [P] [US4] Write prompt-level no-fact-outside-KB guard in `apps/guestflow/src/lib/__tests__/draft-prompt-kb.test.ts`

### Implementation for User Story 4

- [ ] T025 [P] [US4] Seed only sourced facts in `apps/guestflow/src/lib/property-knowledge-seed.ts` (unknowns empty/`ask staff`)
- [ ] T026 [US4] Implement ensure/list/upsert/format in `apps/guestflow/src/lib/property-knowledge.ts`
- [ ] T027 [US4] Add ops APIs `apps/guestflow/src/app/api/ops/property-knowledge/route.ts` and `upsert/route.ts`
- [ ] T028 [US4] Add staff UI `apps/guestflow/src/app/ops/property-knowledge/page.tsx` + manager and an Ops card in `apps/guestflow/src/app/ops/page.tsx`
- [ ] T029 [US4] Inject `{property_knowledge}` and no-invent instruction in `apps/guestflow/prompts/DRAFT_PROMPT.md` and `apps/guestflow/src/lib/batch-worker.ts`
- [ ] T030 [US4] Add 10-question fixture `apps/guestflow/__tests__/fixtures/kb-eval-questions.json`

**Checkpoint**: All stories independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T031 [P] List every seed source in `specs/019-sprint2-whatsapp/seed-sources.md`
- [ ] T032 Run GuestFlow targeted tests + `tsc --noEmit`; keep `ignoreBuildErrors` unset
- [ ] T033 Mark tasks complete and prepare PR body (how the warning works, Spec Kit evidence, test output, submit script usage NOT run, follow-ups)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: After Foundational
- **US2 (Phase 4)**: After US1 window helper exists
- **US3 (Phase 5)**: After Foundational; send path shares US2 route
- **US4 (Phase 6)**: After Foundational; independent of window
- **Polish**: After desired stories

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational
- **User Story 2 (P1)**: Uses US1 `computeCareWindow`
- **User Story 3 (P1)**: Independent of US1 except shared composer
- **User Story 4 (P2)**: Independent

### Parallel Opportunities

- T002, T004, T005 in parallel after T003 starts
- T006 // T014 // T015 // T023 // T024 once helpers exist
- T016 // T025 seed files

## Implementation Strategy

### MVP First (User Story 1 Only)

Window badges without templates still remove the “guess if WhatsApp will go through” ritual.

### Incremental Delivery

1. Setup + schema
2. Window math + UI
3. 409 guard
4. Templates + picker + fill
5. Knowledge + prompt
6. Tests + PR
