# Tasks: Sprint 6 Inbox Bodies, Composer, and Load Time

**Input**: Design documents from `/specs/034-sprint6-inbox-composer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Requested in CA prompt — Vitest for limit honor, sentinel list, spam reclassify, UI contract.

## Phase 1: Setup

- [x] T001 Persist Spec Kit feature directory and confirm work stays in `apps/guestflow` plus `specs/034-sprint6-inbox-composer` and `specs/verify/sprint-6`

---

## Phase 2: Foundational

- [x] T002 Add shared sentinel constants and last4 helper in `apps/guestflow/src/lib/wa-web-body.ts` (exact `[body unavailable]` and `[metadata-only]` for the staff list)
- [x] T003 Add `shouldClearFilteredForRecoveredStay` in `apps/guestflow/src/lib/umi-spam.ts`

**Checkpoint**: Helpers exist; no product behavior change yet

---

## Phase 3: User Story 1 - Inbox first page in seconds (Priority: P1) 🎯 MVP

**Goal**: Honor limit/keyset; kill N+1; slim careWindow; skeleton.

**Independent Test**: `limit=10` vs `limit=25` change thread count; list uses batched queries.

- [x] T004 [P] [US1] Contract tests for inbox `limit` / `nextCursor` in `apps/guestflow/__tests__/umi-inbox.test.ts`
- [x] T005 [P] [US1] Unit tests that `listInboxThreads` honors limit/cursor and batches previews in `apps/guestflow/src/lib/__tests__/umi-threads.test.ts`
- [x] T006 [US1] Batch preview + unanswered + slim `careWindow` and apply limit/keyset in `apps/guestflow/src/lib/umi-threads.ts`
- [x] T007 [US1] Pass `limit`/`cursor` and return `nextCursor`/`hasMore` from `apps/guestflow/src/app/api/umi/inbox/route.ts`
- [x] T008 [US1] Fetch default `limit=25` and show loading skeleton in `apps/guestflow/src/app/page.tsx`

**Checkpoint**: First page is a page; warm path no longer does per-thread N+1

---

## Phase 4: User Story 2 - Read real WhatsApp Web stay text (Priority: P1)

**Goal**: Sentinel list + Refresh bodies via Ship B + Filtered hygiene.

**Independent Test**: Sentinel API exact bodies; replace + booking-linked clears Filtered; failure leaves sentinel.

- [x] T009 [P] [US2] Tests for sentinel list + reclassify in `apps/guestflow/__tests__/umi-wa-web-sentinels.test.ts` and `apps/guestflow/src/lib/__tests__/wa-web-body.test.ts`
- [x] T010 [US2] `listWaWebSentinelTargets` + `applyRecoveredStayHygiene` in `apps/guestflow/src/lib/wa-web-body.ts` / `apps/guestflow/src/lib/umi-threads.ts`
- [x] T011 [US2] GET `apps/guestflow/src/app/api/umi/wa-web/sentinels/route.ts`
- [x] T012 [US2] POST refresh-bodies using Ship B ingest in `apps/guestflow/src/app/api/umi/threads/[id]/refresh-bodies/route.ts`
- [x] T013 [US2] Apply booking-linked Filtered hygiene in `apps/guestflow/src/lib/inbound-ingest.ts`
- [x] T014 [US2] Staff Refresh bodies control + failure next-action in `apps/guestflow/src/app/page.tsx`
- [x] T015 [US2] Document hybrid observe hooks in `apps/guestflow/docs/WA-WEB-CHEAP-BODIES.md`

**Checkpoint**: Thread 46-class sentinels listable; on-demand persist; no invented bodies

---

## Phase 5: User Story 3 - Composer pop-out (Priority: P1)

**Goal**: Whole edit section in overlay/sheet; one draft store; Esc restores compact.

- [x] T016 [P] [US3] UI contract tests in `apps/guestflow/__tests__/sprint6-inbox-ui.test.ts`
- [x] T017 [US3] Pop-out overlay/sheet + one draft store in `apps/guestflow/src/components/inbox/ThreadComposer.tsx`
- [x] T018 [US3] Wire pop-out from `apps/guestflow/src/app/page.tsx` without a second draft store

**Checkpoint**: Pop-out round-trip preserves draft/channel/template; Approve&Send in overlay

---

## Phase 6: User Story 4 - Tooltips + denser list chrome (Priority: P2)

**Goal**: Exact tooltip copy; denser header; search clear of glass.

- [x] T019 [US4] Tooltip primitive in `apps/guestflow/src/components/inbox/ComposerTooltip.tsx`
- [x] T020 [US4] Exact SoR titles/aria on channel/templates/attach/pop-out in `apps/guestflow/src/components/inbox/ThreadComposer.tsx`
- [x] T021 [US4] Denser header + search padding-left ≥36–40px + Refresh inbox in `apps/guestflow/src/app/page.tsx` and `apps/guestflow/src/app/globals.css`

**Checkpoint**: No mystery icons; more rows above the fold; no chip-row return

---

## Phase 7: Polish

- [x] T022 [P] VERIFY PACK at `specs/verify/sprint-6/VERIFY-PACK.md` with S1–S10, Design #2–#4 ACCEPT, QA job-script, locks, re-run
- [x] T023 [P] Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md`
- [x] T024 Mark tasks complete; run Vitest for touched files

---

## Dependencies & Execution Order

- Setup → Foundational → US1 (perf) and US2 (bodies) can proceed after T003
- US3 depends on Sprint 5 `ThreadComposer` only
- US4 same files as US3 — after pop-out shell
- Polish last

## Parallel Example: User Story 1

```text
T004 inbox route tests
T005 listInboxThreads unit tests
```

## Implementation Strategy

MVP = US1 (inbox seconds) + US2 (readable WA Web stays). Then US3/US4 chrome. One PR, MERGE HOLD.

## Notes

- All tasks include file paths
- Tests requested by CA prompt
- Do not merge
