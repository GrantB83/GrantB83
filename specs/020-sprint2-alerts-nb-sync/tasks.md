# Tasks: Sprint 2 Staff Alerts and Nightsbridge Layered Sync

**Input**: Design documents from `/specs/020-sprint2-alerts-nb-sync/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required (FR-028). Write failing tests before implementation where the task is a test.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Create `apps/guestflow/docs/STAFF-ALERTS.md` with what-alerts-and-when, recipient rules, named envs/tokens (no secret values)
- [x] T002 [P] Create `apps/guestflow/docs/NB-LAYERED-SYNC.md` with L1–L4 overview and stay@thebrowns.co.za / hospitality.partners forward dependency
- [x] T003 [P] Document `ALERT_FALLBACK_EMAIL`, `GITHUB_ALERTS_*`, `EDGE_CONFIG*`, `GUESTFLOW_HEALTH_URL`, `NB_USER`/`NB_PASS` names in `apps/guestflow/.env.example`

---

## Phase 2: Foundational

**Purpose**: Shared settings, schema, internal send, last-handler column. Blocks all stories.

- [x] T004 Implement frozen shared settings in `apps/guestflow/src/lib/ops-settings.ts` (30 min, 07:00–21:00 SAST exclusive end, 07:00 digest, 14h, 2h cooldown, 2 health failures, 0.5 mass-cancel, BBID 24299, `Africa/Johannesburg`)
- [x] T005 [P] Add sprint2 DDL + `ensureSprint2Schema()` in `apps/guestflow/src/lib/sprint2-schema.ts` (`staff_alerts`, `nb_email_raw`, `nb_email_events`, `nb_gaps`, `nb_sync_runs`, `booking_payments`, booking provenance columns)
- [x] T006 [P] Add `scripts/migrate-sprint2-alerts-nb.js` and `db:migrate:sprint2` in `apps/guestflow/package.json` (script ships; is not run against Production)
- [x] T007 Add `skipRedirect` to `sendEmail` in `apps/guestflow/src/lib/email.ts` and `sendStaffAlertEmail` in `apps/guestflow/src/lib/staff-alert-email.ts` (never include codes or payment text)
- [x] T008 Add `last_handler_email` in `apps/guestflow/src/lib/umi-schema.ts` and stamp it from `apps/guestflow/src/app/api/umi/threads/[id]/approve/route.ts` plus successful send / link paths
- [x] T009 Implement recipient resolution + dedupe/cooldown + `notifyFailedApproveSend` in `apps/guestflow/src/lib/staff-alerts.ts`

**Checkpoint**: Settings, schema, internal send, and recipient helpers exist

---

## Phase 3: User Story 1 - Shared settings and staff-only alert delivery (Priority: P1) 🎯 MVP

**Goal**: One settings module; recipients from users; fallback; removed user stops; cooldown; redirect bypass; safe body

**Independent Test**: Unit tests for settings import, recipient matrix, cooldown, body sanitiser

### Tests for User Story 1

- [x] T010 [P] [US1] Test shared settings values and SAST helpers in `apps/guestflow/src/lib/__tests__/ops-settings.test.ts`
- [x] T011 [P] [US1] Test recipient resolution (all users, fallback, removed user) and 2h cooldown in `apps/guestflow/src/lib/__tests__/staff-alerts-recipients.test.ts`
- [x] T012 [P] [US1] Test alert body never contains codes or payment text in `apps/guestflow/src/lib/__tests__/staff-alert-email.test.ts`

### Implementation for User Story 1

- [x] T013 [US1] Wire `publishActiveAlertEmails` in `apps/guestflow/src/lib/publish-alert-emails.ts` and call it from `apps/guestflow/src/app/api/staff/users/route.ts` and `apps/guestflow/src/app/api/staff/users/[id]/route.ts` after successful add/remove

**Checkpoint**: Recipients and cooldown are independently testable

---

## Phase 4: User Story 2 - Unanswered inbound and overnight digest (Priority: P1)

**Goal**: 30 min during staff hours; 07:00 digest; last handler; exclude spam/staff/test

**Independent Test**: Clock-edge unit tests with injected `now`

### Tests for User Story 2

- [x] T014 [P] [US2] Test 29 vs 30 minutes, 07:00 inclusive, 21:00 exclusive, overnight digest in `apps/guestflow/src/lib/__tests__/staff-alerts-unanswered.test.ts`
- [x] T015 [P] [US2] Test last-handler vs all-users and spam/staff/test exclusion in `apps/guestflow/src/lib/__tests__/staff-alerts-unanswered.test.ts`

### Implementation for User Story 2

- [x] T016 [US2] Implement unanswered scan + digest in `apps/guestflow/src/lib/staff-alerts.ts`
- [x] T017 [US2] Add idempotent `apps/guestflow/src/app/api/cron/alerts-evaluate/route.ts` and `*/10 * * * *` in `apps/guestflow/vercel.json`

**Checkpoint**: Unanswered and digest evaluate without sending guests

---

## Phase 5: User Story 3 - NB missed-import and batch-failure alerts (Priority: P2)

**Goal**: 14h + error / 0 rows / mass-cancel → all active users

### Tests for User Story 3

- [x] T018 [P] [US3] Test 13h59 vs 14h00 and batch error/zero/rowdrop in `apps/guestflow/src/lib/__tests__/staff-alerts-nb-14h.test.ts`

### Implementation for User Story 3

- [x] T019 [US3] Record `nb_sync_runs` from ingest/reconcile and evaluate missed-import in `apps/guestflow/src/lib/staff-alerts.ts`

**Checkpoint**: 14h rule uses `ops-settings.ts`

---

## Phase 6: User Story 4 - Failed Approve&Send hook (Priority: P2)

### Tests for User Story 4

- [x] T020 [P] [US4] Test hook emails only the acting user in `apps/guestflow/src/lib/__tests__/staff-alerts-failed-send.test.ts`

### Implementation for User Story 4

- [x] T021 [US4] Call `notifyFailedApproveSend` from failed Resend/Twilio paths in `apps/guestflow/src/app/api/inbound/send/route.ts` (confirmToken unchanged)

**Checkpoint**: Hook exported for delivery-status PR

---

## Phase 7: User Story 5 - Site-down and recovery (Priority: P2)

### Tests for User Story 5

- [x] T022 [P] [US5] Test 1-fail no alert, 2-fail alert, recovery in `apps/guestflow/src/lib/__tests__/staff-alerts-health.test.ts`

### Implementation for User Story 5

- [x] T023 [US5] Add uncached `apps/guestflow/src/app/api/health/deep/route.ts`
- [x] T024 [US5] Add `.github/workflows/guestflow-health-check.yml` using documented env/secret names only
- [x] T025 [US5] Implement health streak helpers in `apps/guestflow/src/lib/staff-alerts.ts`

**Checkpoint**: Deep health + GHA checker documented

---

## Phase 8: User Story 6 - NB email-primary ingest (Priority: P1)

### Tests for User Story 6

- [x] T026 [P] [US6] Test NEW / CANCEL / TravelIT / PAYMENT / ignore parse + property gate in `apps/guestflow/src/lib/__tests__/nb-email-parse.test.ts`
- [x] T027 [P] [US6] Test message-id and content-hash duplicates + stale/cancellation-wins in `apps/guestflow/src/lib/__tests__/nb-email-ingest.test.ts`

### Implementation for User Story 6

- [x] T028 [US6] Implement parsers in `apps/guestflow/src/lib/nb-email-parse.ts`
- [x] T029 [US6] Implement L1 apply/dedup/order in `apps/guestflow/src/lib/nb-email-ingest.ts`
- [x] T030 [US6] Add `apps/guestflow/src/app/api/inbound/nb-email/route.ts` and route NB senders in `apps/guestflow/src/app/api/inbound/email/route.ts` without creating UMI threads
- [x] T031 [US6] Allow `/api/inbound/nb-email` in `apps/guestflow/src/middleware.ts`

**Checkpoint**: Synthetic NB templates parse; no guest thread

---

## Phase 9: User Story 7 - Gap detection and fill (Priority: P2)

### Tests for User Story 7

- [x] T032 [P] [US7] Test missing / relay-only / placeholder / intermediary in `apps/guestflow/src/lib/__tests__/nb-gap-detection.test.ts`
- [x] T033 [P] [US7] Test verbatim fill, reject invented, no overwrite verified in `apps/guestflow/src/lib/__tests__/nb-gap-fill.test.ts`

### Implementation for User Story 7

- [x] T034 [US7] Implement L2 in `apps/guestflow/src/lib/nb-gaps.ts`
- [x] T035 [US7] Implement L3 (sources 1, 2, 4, 6) in `apps/guestflow/src/lib/nb-gap-fill.ts`

**Checkpoint**: Gaps fail-closed; nothing auto-sent

---

## Phase 10: User Story 8 - Batch reconciliation (Priority: P2)

### Tests for User Story 8

- [x] T036 [P] [US8] Test conflict matrix, duplicates, mass-cancel guard in `apps/guestflow/src/lib/__tests__/nb-reconcile.test.ts`

### Implementation for User Story 8

- [x] T037 [US8] Implement conflict matrix + `ROWDROP_GUARD` in `apps/guestflow/src/lib/nb-reconcile.ts` and call from `apps/guestflow/src/lib/nightsbridge-upsert.ts` / ingest without rewriting the whole route
- [x] T038 [US8] Add not-run `apps/guestflow/scripts/nb-batch-reconcile.ts` and `.github/workflows/guestflow-nb-batch.yml`

**Checkpoint**: Report wins/email-newer exception/verified freeze tested

---

## Phase 11: Polish

- [x] T039 [P] Add `apps/guestflow/__tests__/health-deep-route.test.ts` and `apps/guestflow/__tests__/alerts-evaluate-route.test.ts`
- [x] T040 Confirm `apps/guestflow/next.config.mjs` has no `typescript.ignoreBuildErrors`
- [x] T041 Run `npx tsc --noEmit`, `npm test`, `npx next lint`, `npx next build` in `apps/guestflow`
- [x] T042 Mark tasks complete after implement; converge until no remaining work

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocks stories) → US1 → US2 (evaluator) → US3–US5 can proceed in parallel with US6–US8
- US4 depends on T009 hook
- US3 depends on `nb_sync_runs` (T005) and evaluator (T017)
- US6 before US7 (gaps run after upsert)
- US8 can share T005 tables with US6
- Polish last

### User Story Dependencies

- **US1**: After Phase 2
- **US2**: After US1 helpers
- **US3**: After US1 + schema
- **US4**: After US1 hook
- **US5**: After US1 recipients
- **US6**: After Phase 2 schema/settings
- **US7**: After US6 upsert
- **US8**: After US6/US3 run table

### Parallel Opportunities

- T001–T003 docs
- T010–T012 tests
- T026–T027 parse/ingest tests
- US4/US5 after hook/recipients exist

## Implementation Strategy

MVP: Phase 1–4 (settings, schema, recipients, unanswered + evaluator). Then NB ingest + 14h + health + reconcile. One PR. No merge, no deploy, no Production writes.
