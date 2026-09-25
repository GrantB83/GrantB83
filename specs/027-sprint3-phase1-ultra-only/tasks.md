# Tasks: Sprint 3 Phase 1 Ultra-Only Drafts

**Input**: Design documents from `/specs/027-sprint3-phase1-ultra-only/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required (FR-014). Write fail-closed / dry-run / mock-generator tests before swapping the OpenAI path.

**Organization**: Tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

**Purpose**: Pin the feature directory and keep delivery on latest main

- [x] T001 Write Spec Kit artefacts under `specs/027-sprint3-phase1-ultra-only/` (spec, plan, research, data-model, contracts, quickstart, checklist)
- [x] T002 Point `specs/008-guestflow-phase1-batch-drafts/spec.md` at `027` as the Ultra-only realignment SoR without rewriting Phase 1 enqueue contract

---

## Phase 2: Foundational

**Purpose**: Types and availability gate shared by every story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Remove `llmProvider` and `llmApiKey` from `BatchWorkerConfig` in `apps/guestflow/src/lib/batch-worker.ts`
- [x] T004 Add `DraftContext`, `DraftGenerator`, `draftsByMessageId`, optional `now`, and `ULTRA_PATH_UNAVAILABLE` in `apps/guestflow/src/lib/batch-worker.ts`
- [x] T005 Implement `isCursorUltraPathAvailable` in `apps/guestflow/src/lib/batch-worker.ts` (dry-run OR generator OR non-empty drafts map; never `OPENAI_API_KEY`)

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - Production drafts never leave the Ultra meter (Priority: P1) 🎯 MVP

**Goal**: Delete OpenAI `chat.completions`. Cursor Ultra CA is the model. Prompt keeps property knowledge.

**Independent Test**: Grep `apps/guestflow` for Production Phase 1 `OPENAI_API_KEY` setup. Confirm `generateDraftWithLLM` is gone.

### Tests for User Story 1

- [x] T006 [P] [US1] Add test that `OPENAI_API_KEY` does not enable generation in `apps/guestflow/__tests__/batch-worker.test.ts`

### Implementation for User Story 1

- [x] T007 [US1] Replace `generateDraftWithLLM` with `loadPromptForDraft` using `buildDraftPrompt` + property knowledge in `apps/guestflow/src/lib/batch-worker.ts`
- [x] T008 [US1] Add `generateDraftWithCursorUltra` (dry-run placeholder, drafts map, else throw `ULTRA_PATH_UNAVAILABLE`) in `apps/guestflow/src/lib/batch-worker.ts`
- [x] T009 [US1] Wire `processJob` to the Ultra generator / injected `draftGenerator` and keep upsert `draft_source=llm` in `apps/guestflow/src/lib/batch-worker.ts`

**Checkpoint**: No OpenAI path remains in the worker library

---

## Phase 4: User Story 2 - Missing Ultra path refuses the whole batch (Priority: P1)

**Goal**: Live run without Ultra path claims zero jobs.

**Independent Test**: `runBatch` without dry-run/generator/drafts map returns skip reason containing `Cursor Ultra` and leaves `draft_jobs` pending.

### Tests for User Story 2

- [x] T010 [P] [US2] Add refuse-batch test (no claim) and dry-run placeholder test in `apps/guestflow/__tests__/batch-worker.test.ts`

### Implementation for User Story 2

- [x] T011 [US2] Check `isCursorUltraPathAvailable` at the start of `runBatch` in `apps/guestflow/src/lib/batch-worker.ts` before window/claim/`batch_runs`
- [x] T012 [US2] Update `apps/guestflow/scripts/batch-worker.ts` to Cursor Ultra-only branding, `--drafts-file`, and non-zero exit on refuse

**Checkpoint**: Standalone live CLI cannot burn the queue

---

## Phase 5: User Story 3 - Pilot scope and human send stay locked (Priority: P1)

**Goal**: Batch contract, enqueue allowlist, redirect, and From stay unchanged.

**Independent Test**: Existing claim/window tests still pass. No outbound/From file edits.

- [x] T013 [P] [US3] Keep `isWithinBatchWindow` (optional `now`) and existing claim/cap/in-flight logic in `apps/guestflow/src/lib/batch-worker.ts`
- [x] T014 [P] [US3] Confirm webhook enqueue path in `apps/guestflow/src/app/api/inbound/webhook/route.ts` and `apps/guestflow/src/lib/inbound-ingest.ts` still has no LLM call
- [x] T015 [US3] Do not edit outbound redirect, WhatsApp From, stay@, or ads files

**Checkpoint**: Item S did not fold R / go-live / ads

---

## Phase 6: User Story 4 - Coding launch + GFM dry-run (Priority: P2)

**Goal**: Docs a Coding/Grok Ultra launch and a GFM dry-run without `OPENAI_API_KEY`.

**Independent Test**: Read `PHASE1-BATCH-DRAFTS.md` and `CURSOR-ULTRA-BATCH-LAUNCH.md`. No Production “set OPENAI_API_KEY” step.

### Tests for User Story 4

- [x] T016 [P] [US4] Add `runBatch` mock-generator dry-run test with deterministic `now` in `apps/guestflow/__tests__/batch-worker.test.ts`

### Implementation for User Story 4

- [x] T017 [US4] Rewrite `apps/guestflow/docs/PHASE1-BATCH-DRAFTS.md` to Ultra-only (no Production OpenAI setup)
- [x] T018 [P] [US4] Add `apps/guestflow/docs/CURSOR-ULTRA-BATCH-LAUNCH.md` for Coding/Grok + GFM dry-run
- [x] T019 [P] [US4] Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md` (ritual: third-party chat key for Phase 1 drafts)

**Checkpoint**: GFM has a same-week artefact

---

## Phase 7: Polish & Cross-Cutting

- [x] T020 Run `npm test -- __tests__/batch-worker.test.ts` and `npx tsc --noEmit` in `apps/guestflow`
- [x] T021 Grep `apps/guestflow` for Production Phase 1 `OPENAI_API_KEY` setup instructions
- [x] T022 Open or update draft PR with MERGE HOLD + GFM verify steps; comment on #201 that it is superseded

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on US1 generator swap
- **US3 (Phase 5)**: Can overlap US1/US2 (no file fight if T015 is a no-op)
- **US4 (Phase 6)**: Docs after worker behaviour exists
- **Polish**: After stories

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational
- **User Story 2 (P1)**: After US1 (`generateDraftWithCursorUltra` + `runBatch` gate)
- **User Story 3 (P1)**: Independent verification; do not change send/From
- **User Story 4 (P2)**: After US1/US2 so docs match code

### Parallel Opportunities

- T006 with T007–T009 after types exist
- T014 / T015 / T018 / T019 in parallel with docs vs no-op verification
- T016 after T004 `now` field exists

---

## Parallel Example: User Story 1

```bash
# After T003–T005:
Task: "Add OPENAI_API_KEY ignored test in apps/guestflow/__tests__/batch-worker.test.ts"
Task: "Replace generateDraftWithLLM in apps/guestflow/src/lib/batch-worker.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Types + availability gate
2. Remove OpenAI path
3. Refuse batch without claim
4. Validate with Vitest

### Incremental Delivery

1. Setup + Foundational
2. US1 generator swap
3. US2 refuse-batch
4. US3 contract freeze
5. US4 docs + STATUS

## Notes

- Tests requested by FR-014 / user brief
- Do not commit secrets
- MERGE HOLD for GFM ACCEPT
