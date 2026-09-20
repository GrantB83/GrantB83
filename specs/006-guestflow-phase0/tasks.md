---
description: "Task list for GuestFlow Phase 0 safety and contact foundation"
---

# Tasks: GuestFlow Phase 0 Safety & Contact Foundation

**Input**: Design documents from `/specs/006-guestflow-phase0/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by CA-PROMPT-PHASE0 (send gate reject / accept once / reuse; migration idempotent; `npm test`)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Feature artifacts and env documentation already scoped to `apps/guestflow`

- [x] T001 Add `DRAFT_WORKER_SECRET` (distinct from `CRON_SECRET`) to `apps/guestflow/.env.example` with a comment that Coding sets Vercel after merge
- [x] T002 [P] Document `DRAFT_WORKER_SECRET` ≠ `CRON_SECRET` and Resend inbound HOLD in `apps/guestflow/README.md` and `apps/guestflow/docs/PHASE0-SAFETY.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, phone normalize, and table helpers MUST exist before story work

- [x] T003 Write idempotent Turso-safe migration `apps/guestflow/scripts/migrate-phase0-safety.js` creating `guest_contacts` (tenant_id, normalized_phone E.164 UNIQUE per tenant when non-null, email nullable, display_name, last_stay_at, last_suite, source `nb|inbound|manual`, nbid nullable, retention_years=5, retention_delete_after, last_activity_at, created_at, updated_at), `draft_jobs` (id, tenant_id, thread_id, message_id, intent, status `pending|claimed|done|failed`, attempts, error, created_at, updated_at), `send_confirm_tokens`, and `inbound_messages.draft_source` TEXT `heuristic|llm|human` defaulting existing rows to `heuristic`; comment 5-year DELETE policy; no chat PII dumps
- [x] T004 [P] Append the same Phase 0 tables/columns to `apps/guestflow/src/lib/db.ts` schema init
- [x] T005 [P] Add `db:migrate:phase0` script in `apps/guestflow/package.json`
- [x] T006 Implement ZA-friendly E.164 `normalizeZaE164` in `apps/guestflow/src/lib/phone.ts` (null on unparseable; never invent)
- [x] T007 [P] Unit tests for `normalizeZaE164` in `apps/guestflow/src/lib/__tests__/phone.test.ts`

**Checkpoint**: Migration reruns clean; phone helper tested

---

## Phase 3: User Story 1 - Approve then confirm before any guest send (Priority: P1) 🎯 MVP

**Goal**: Fail-closed send gate + UI token obtain

**Independent Test**: Reject send without token; accept once; reject reuse; all three channels

### Tests for User Story 1

- [x] T008 [P] [US1] Extend `apps/guestflow/__tests__/inbound-send-handler.test.ts` to expect 400 without `confirmToken`, 400 when status not in `{approved, ready}`, 200 once with token, 400 on reuse (WhatsApp path; mock provider)
- [x] T009 [P] [US1] Extend `apps/guestflow/__tests__/email-send-handler.test.ts` so email and `whatsapp_web` also require token + approved status and do not call provider/queue on 400

### Implementation for User Story 1

- [x] T010 [US1] Add `confirmToken` to `SendMessageRequest` in `apps/guestflow/src/types/inbound.ts`
- [x] T011 [US1] Implement issue/consume helpers in `apps/guestflow/src/lib/confirm-token.ts` (hash via `src/lib/token.ts`, 15-minute TTL, consume-before-send)
- [x] T012 [US1] Add `POST /api/inbound/confirm-token` in `apps/guestflow/src/app/api/inbound/confirm-token/route.ts` (staff cookie; approved/ready only)
- [x] T013 [US1] Gate `POST /api/inbound/send` in `apps/guestflow/src/app/api/inbound/send/route.ts` for whatsapp, email, and whatsapp_web: approved/ready + consume token; clear 400 otherwise
- [x] T014 [US1] Needs Approval `apps/guestflow/src/app/needs-approval/page.tsx`: after confirm dialog, obtain token then POST it; no send without token
- [x] T015 [US1] Inbound queue `apps/guestflow/src/app/ops/inbound-queue/page.tsx`: same Approve&Send token flow; do not send from drafted-only

**Checkpoint**: US1 independently testable

---

## Phase 4: User Story 2 - Persist draft_source (Priority: P1)

**Goal**: heuristic on classify; human on staff edit; no LLM writer

**Independent Test**: Ingest sets heuristic; edit sets human

- [x] T016 [P] [US2] Set `draft_source='heuristic'` when writing drafts in `apps/guestflow/src/lib/inbound-ingest.ts`
- [x] T017 [US2] When staff save/edit draft body (inbound-queue + approvals), set `draft_source='human'` in the touched write paths (`apps/guestflow/src/app/api/inbound/queue/route.ts` and/or send/approvals if they persist edits)
- [x] T018 [P] [US2] Cover heuristic vs human in `apps/guestflow/__tests__/inbound-classifier.test.ts` or a small ingest test

---

## Phase 5: User Story 3 - guest_contacts from NB A&D (Priority: P1)

**Goal**: Null-tolerant upsert; never invent phones

**Independent Test**: Phone+email upserts; name-only has null phone; duplicate phone updates

- [x] T019 [P] [US3] Implement `upsertGuestContact` in `apps/guestflow/src/lib/guest-contacts.ts` with retention_years=5 and delete-after from last stay
- [x] T020 [P] [US3] Tests in `apps/guestflow/src/lib/__tests__/guest-contacts.test.ts`
- [x] T021 [US3] Call upsert from `apps/guestflow/src/app/api/cron/nightsbridge-ingest/route.ts` for each parsed A&D row (null-tolerant; isolate errors)

---

## Phase 6: User Story 4 - draft_jobs queue only (Priority: P2)

**Goal**: Schema + enqueue helper from classify; no runner

- [x] T022 [P] [US4] Implement `enqueueDraftJob` in `apps/guestflow/src/lib/draft-jobs.ts` (skip if pending/claimed exists for message_id)
- [x] T023 [P] [US4] Tests in `apps/guestflow/src/lib/__tests__/draft-jobs.test.ts`
- [x] T024 [US4] Call enqueue from `apps/guestflow/src/lib/inbound-ingest.ts` after classify (non-spam); must not fail ingest

---

## Phase 7: User Story 5 - DRAFT_WORKER_SECRET stub (Priority: P2)

**Goal**: Upsert draft with dedicated secret only

- [x] T025 [P] [US5] Add `POST /api/drafts/upsert` in `apps/guestflow/src/app/api/drafts/upsert/route.ts`; allowlist in `apps/guestflow/src/middleware.ts`; reject missing/wrong/`CRON_SECRET`; no LLM
- [x] T026 [P] [US5] Tests in `apps/guestflow/__tests__/drafts-upsert-handler.test.ts`

---

## Phase 8: User Story 6 - Email unify HOLD (Priority: P3)

**Goal**: Keep shared ingest; document HOLD

- [x] T027 [US6] Confirm `apps/guestflow/src/app/api/inbound/email/route.ts` still uses `ingestInboundMessage` (draft_source + draft_jobs come for free); add HOLD note to `apps/guestflow/docs/EMAIL-CONTROL-CENTER.md`

---

## Phase 9: Polish & Cross-Cutting

- [x] T028 [P] Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md` with Phase 0 ritual (send-because-draft-exists → approve+confirmToken)
- [x] T029 Run `apps/guestflow` `npm test`; migration script twice for idempotency
- [x] T030 Open one PR with Spec Kit phases, confirmToken curl examples, Resend HOLD, hard-gate list

---

## Dependencies & Execution Order

- Setup (1) → Foundational (2) → US1 (MVP) → US2/US3/US4/US5 in parallel after T006/T003 → US6 → Polish
- US1 is the acceptance gate for GFM

### Parallel Opportunities

- T001/T002; T004/T005/T006/T007 after T003
- T008/T009; T019/T020; T022/T023; T025/T026

## Implementation Strategy

MVP = US1 send gate. Then schema consumers. No Phase 1 worker. No auto-send.
