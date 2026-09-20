# Tasks: GuestFlow Email Control Center & WhatsApp Web Bridge

**Input**: Design documents from `/specs/005-email-wa-bridge/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by the launch prompt (send handler + webhook ingest + bridge jobs)

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

**Purpose**: Env and script hooks for the existing GuestFlow app

- [x] T001 Document `RESEND_WEBHOOK_SECRET` and `BRIDGE_JOB_SECRET` in `apps/guestflow/.env.example` without secret values
- [x] T002 Add `db:migrate:send-jobs` script in `apps/guestflow/package.json`

---

## Phase 2: Foundational

**Purpose**: Shared libraries and Turso-safe `send_jobs` — blocks all stories

- [x] T003 Create Turso-safe `send_jobs` DDL (`id`, `channel` `whatsapp_web|email`, `status` `pending|queued|claimed|sent|failed|blocked`, `thread_id`, `to_address`, `body_text`, `subject` nullable, `claim_token`, `claimed_at`, `completed_at`, `error_code`, `created_at`, `updated_at`) in `apps/guestflow/src/lib/send-jobs.ts` and `apps/guestflow/scripts/migrate-add-send-jobs.js`
- [x] T004 [P] Implement `sendEmail` + `fetchReceivedEmail` + payload helpers in `apps/guestflow/src/lib/email.ts` using only `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- [x] T005 [P] Implement shared `ingestInboundMessage` in `apps/guestflow/src/lib/inbound-ingest.ts` (dedupe, thread, classify, draft)
- [x] T006 Skip staff cookie for `/api/inbound/email` and `/api/bridge` in `apps/guestflow/src/middleware.ts`
- [x] T007 Extend `SendMessageRequest` / response types in `apps/guestflow/src/types/inbound.ts`

**Checkpoint**: Libraries and middleware ready

---

## Phase 3: User Story 1 - Send approved guest email (Priority: P1) 🎯 MVP

**Goal**: Human-gated Email Send from inbound-queue and Needs Approval

**Independent Test**: POST `/api/inbound/send` with `channel: email` (mocked Resend) updates thread and audit; UI confirm required; staff_ops unchanged

### Tests for User Story 1

- [x] T008 [P] [US1] Unit tests for `sendEmail` in `apps/guestflow/src/lib/__tests__/email.test.ts`
- [x] T009 [P] [US1] Handler tests for email channel in `apps/guestflow/__tests__/email-send-handler.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Extend `POST /api/inbound/send` in `apps/guestflow/src/app/api/inbound/send/route.ts` for `channel: email` (To/Subject/Body, confirm is UI-only, audit without inventing From)
- [x] T011 [US1] Add Email channel + To/Subject/Body + confirm dialog on `apps/guestflow/src/app/ops/inbound-queue/page.tsx`
- [x] T012 [US1] Add Email Send for non-copy-only inbound items on `apps/guestflow/src/app/needs-approval/page.tsx` without changing staff_ops copy-only

**Checkpoint**: Email Send works independently

---

## Phase 4: User Story 2 - Inbound guest email becomes a thread (Priority: P1)

**Goal**: Resend inbound events become GuestFlow threads

**Independent Test**: POST `/api/inbound/email` with fixture + secret creates thread `source: email`

### Tests for User Story 2

- [x] T013 [P] [US2] Webhook ingest tests in `apps/guestflow/__tests__/inbound-email-webhook.test.ts`

### Implementation for User Story 2

- [x] T014 [US2] Implement `POST /api/inbound/email` in `apps/guestflow/src/app/api/inbound/email/route.ts` (secret header, Resend envelope + normalized fixture, fetch body, ingest)

**Checkpoint**: Inbound email path coded + testable

---

## Phase 5: User Story 3 - Queue WhatsApp Web send (Priority: P2)

**Goal**: Confirm Send creates queued job; UI is Interim and fail-closed

**Independent Test**: POST send `channel: whatsapp_web` returns jobId + queued, not sent

### Tests for User Story 3

- [x] T015 [P] [US3] send-jobs unit tests in `apps/guestflow/src/lib/__tests__/send-jobs.test.ts`

### Implementation for User Story 3

- [x] T016 [US3] Handle `channel: whatsapp_web` in `apps/guestflow/src/app/api/inbound/send/route.ts` (queued job only)
- [x] T017 [US3] Add `GET /api/inbound/send-jobs/[id]` in `apps/guestflow/src/app/api/inbound/send-jobs/[id]/route.ts`
- [x] T018 [US3] Interim · WhatsApp Web selector, poll, and blocked/failed banner on `apps/guestflow/src/app/ops/inbound-queue/page.tsx` and `apps/guestflow/src/app/needs-approval/page.tsx`

**Checkpoint**: Queue/pending ≠ success in API and UI

---

## Phase 6: User Story 4 - Bridge claim/complete + inbound WA Web (Priority: P2)

**Goal**: CoS clicker can list, claim, complete; inbound `whatsapp_web` accepted

**Independent Test**: claim then complete `sent` is the only success path; webhook accepts `source: whatsapp_web`

### Tests for User Story 4

- [x] T019 [P] [US4] Bridge route tests in `apps/guestflow/__tests__/bridge-jobs.test.ts`

### Implementation for User Story 4

- [x] T020 [US4] Implement `GET /api/bridge/jobs` in `apps/guestflow/src/app/api/bridge/jobs/route.ts`
- [x] T021 [P] [US4] Implement claim in `apps/guestflow/src/app/api/bridge/jobs/[id]/claim/route.ts`
- [x] T022 [P] [US4] Implement complete in `apps/guestflow/src/app/api/bridge/jobs/[id]/complete/route.ts` (never callable from staff Send)
- [x] T023 [US4] Accept `source: whatsapp_web` on `apps/guestflow/src/app/api/inbound/webhook/route.ts` (same inbound shape)

**Checkpoint**: Clicker contract implementable

---

## Phase 7: Polish

- [x] T024 [P] Write `apps/guestflow/docs/EMAIL-CONTROL-CENTER.md` (env, webhook URL, 07:00 Send steps, Resend dashboard NeedsGrant)
- [x] T025 [P] Write `apps/guestflow/docs/WA-WEB-BRIDGE-CONTRACT.md` (payload, Shift+Enter, claim/complete, QR/Aw Snap → blocked)
- [x] T026 Confirm staff_ops copy-only regression still passes (`apps/guestflow/src/lib/__tests__/staff-ops-drafts.test.ts` + Needs Approval UI)
- [x] T027 Run `npm test` and `npm run build` in `apps/guestflow`
- [x] T028 Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md` with ritual removed (07:00 Gmail copy-paste / WA Web paste)

---

## Dependencies & Execution Order

- Setup → Foundational → US1 (email send) → US2 (inbound email) → US3 (WA queue) → US4 (bridge) → Polish
- US1 is the MVP. US3/US4 ship in the same PR if Email tests are green.

## Parallel Opportunities

- T004 / T005 after T003
- T008 / T009 before T010
- T020–T022 after send-jobs lib
- T024 / T025 anytime after contracts

## Implementation Strategy

MVP = US1 Email Send. Same PR continues to US2–US4 because Email research is green and the prompt prefers one PR.
