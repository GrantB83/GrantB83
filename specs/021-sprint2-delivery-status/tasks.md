# Tasks: Sprint 2 Delivery Status + Resend

**Input**: Design documents from `/specs/021-sprint2-delivery-status/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the feature brief (signatures, mapping + out-of-order, stuck, resend idempotency + confirmToken, window guard).

**Organization**: Tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Persist Spec Kit feature pointer in `.specify/feature.json` and confirm feature dir `specs/021-sprint2-delivery-status/`
- [x] T002 [P] Add unused migrate script `apps/guestflow/scripts/migrate-sprint2-delivery-status.js` and npm script `db:migrate:delivery-status` in `apps/guestflow/package.json` (do not run against Production)

---

## Phase 2: Foundational

- [x] T003 Add additive column list `provider_message_id TEXT`, `delivery_status TEXT` (`pending` \| `delivered` \| `failed`), `delivery_read INTEGER NOT NULL DEFAULT 0`, `delivery_error_code TEXT`, `delivery_error_plain TEXT`, `delivery_updated_at DATETIME`, `queued_at DATETIME`, `sent_to_test_sink INTEGER NOT NULL DEFAULT 0`, `resend_of INTEGER`, `resent_by TEXT`, `resend_in_flight INTEGER NOT NULL DEFAULT 0` in `apps/guestflow/src/lib/delivery-schema.ts`
- [x] T004 [P] Implement status ranks, mapping, plain-error dictionary, and `isStuckPending` in `apps/guestflow/src/lib/delivery-status.ts`
- [x] T005 [P] Add `getStaffIdentity()` in `apps/guestflow/src/lib/staff-identity.ts` (current helper; note #215 email)
- [x] T006 [P] Add stub `getWindowState` + `findApprovedTemplateFor` with WhatsApp-PR TODOs in `apps/guestflow/src/lib/wa-window.ts`
- [x] T007 [P] Add no-op `onSendFailed` hook in `apps/guestflow/src/lib/send-failed-hook.ts`
- [x] T008 [P] Extract Twilio HMAC-SHA1 verifier to `apps/guestflow/src/lib/twilio-signature.ts`
- [x] T009 [P] Add Resend delivery secret/Svix verify in `apps/guestflow/src/lib/resend-delivery-webhook.ts`
- [x] T010 Allow `/api/webhooks/twilio/status` and `/api/webhooks/resend` in `apps/guestflow/src/middleware.ts`

**Checkpoint**: Foundation ready — mapping and verify functions are importable

---

## Phase 3: User Story 1 - See whether the guest got the message (Priority: P1) 🎯 MVP

**Goal**: Outbound bubbles show Pending / Delivered (read) / Failed with plain errors and out-of-order safety.

**Independent Test**: Unit tests for mapping + ranks; inbox payload includes delivery fields.

### Tests for User Story 1

- [x] T011 [P] [US1] Write failing mapping + out-of-order + stuck-threshold tests in `apps/guestflow/__tests__/delivery-status.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Persist `provider_message_id`, `delivery_status`, `queued_at`, `sent_to_test_sink` on accept/fail in `apps/guestflow/src/app/api/inbound/send/route.ts`
- [x] T013 [US1] Append Twilio `StatusCallback` on live send in `apps/guestflow/src/lib/whatsapp.ts` and `apps/guestflow/src/lib/sms.ts` using `NEXT_PUBLIC_BASE_URL` / `VERCEL_URL`
- [x] T014 [US1] Return `redirected` from WhatsApp/email send results so send/resend can set `sent_to_test_sink` (`apps/guestflow/src/lib/whatsapp.ts`, `apps/guestflow/src/lib/email.ts`)
- [x] T015 [US1] Expose delivery fields on thread messages and OR Failed/stuck into `needsAttention` in `apps/guestflow/src/lib/umi-threads.ts`
- [x] T016 [US1] Render bubble states, read marker, plain error, and “sent to test sink” on `apps/guestflow/src/app/page.tsx`

**Checkpoint**: US1 independently testable via mapping tests + inbox fields

---

## Phase 4: User Story 2 - Trust only verified receipts (Priority: P1)

**Goal**: Signature-verified Twilio StatusCallback and secret-verified Resend delivery webhook update the original outbound.

**Independent Test**: Valid signatures update; invalid signatures 401.

### Tests for User Story 2

- [x] T017 [P] [US2] Write failing signature/secret tests in `apps/guestflow/__tests__/delivery-webhooks.test.ts`

### Implementation for User Story 2

- [x] T018 [US2] Implement `POST /api/webhooks/twilio/status` in `apps/guestflow/src/app/api/webhooks/twilio/status/route.ts`
- [x] T019 [US2] Implement `POST /api/webhooks/resend` delivery handler in `apps/guestflow/src/app/api/webhooks/resend/route.ts`
- [x] T020 [US2] Apply receipts through `applyProviderReceipt` in `apps/guestflow/src/lib/delivery-status.ts` (lookup by provider id, rank guard, `onSendFailed` on Failed)
- [x] T021 [US2] Label redirect receipts using stored `sent_to_test_sink` (no extra guest row)

**Checkpoint**: US2 independently testable via webhook tests

---

## Phase 5: User Story 3 - Stuck, poll, and resend (Priority: P1)

**Goal**: Poll after 10 minutes; stuck at 15 minutes; human Resend with confirmToken, window port, one-in-flight, `resend_of`, staff identity.

**Independent Test**: Resend tests cover confirmToken reuse, in-flight lock, closed window.

### Tests for User Story 3

- [x] T022 [P] [US3] Write failing resend/confirmToken/window tests in `apps/guestflow/__tests__/delivery-resend.test.ts`

### Implementation for User Story 3

- [x] T023 [US3] Implement poll selector + provider GET apply in `apps/guestflow/src/lib/delivery-poll.ts` (never send)
- [x] T024 [US3] Add `POST /api/cron/delivery-poll` in `apps/guestflow/src/app/api/cron/delivery-poll/route.ts` and document-only cron path in `apps/guestflow/vercel.json`
- [x] T025 [US3] Allow `purpose=resend` + `messageId` on `apps/guestflow/src/app/api/inbound/confirm-token/route.ts`
- [x] T026 [US3] Implement `POST /api/inbound/resend` in `apps/guestflow/src/app/api/inbound/resend/route.ts` (same body, redirect, window ports, in-flight, `resend_of`, `getStaffIdentity`)
- [x] T027 [US3] Add Resend button, confirm dialog, duplicate warning, and template-offer handling on `apps/guestflow/src/app/page.tsx`
- [x] T028 [US3] Call `onSendFailed` from send failures in `apps/guestflow/src/app/api/inbound/send/route.ts`

**Checkpoint**: US3 independently testable via delivery-resend tests

---

## Phase 6: Polish & Cross-Cutting

- [x] T029 [P] Write Grant artefact `apps/guestflow/docs/DELIVERY-STATUS.md` (ritual removed, webhook URLs, follow-ups)
- [x] T030 [P] Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md`
- [x] T031 Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` in `apps/guestflow` and fix without `typescript.ignoreBuildErrors`
- [x] T032 Mock new modules in existing send tests if they break (`apps/guestflow/__tests__/inbound-send-handler.test.ts`, `apps/guestflow/__tests__/email-send-handler.test.ts`)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocks stories)
- US1 mapping (T004/T011) can start as soon as T004 exists
- US2 depends on T008/T009 and apply helper
- US3 depends on schema + identity + window ports + confirm-token change
- Polish last

### User Story Dependencies

- **US1**: Foundational mapping + send persist + UI
- **US2**: Foundational verify + apply; uses US1 columns
- **US3**: US1 stuck helper + US2 apply for poll; resend is new

### Parallel Opportunities

- T004–T009 after T003
- T011, T017, T022 as soon as their libs exist
- T029/T030 during test fixes

## Implementation Strategy

MVP = US1 bubbles + US2 verified receipts. Resend (US3) ships in the same PR because the brief is one package.

## Notes

- Do not run `db:migrate:delivery-status` against Production Turso
- Do not merge, deploy, or send
- Keep WhatsApp template catalogue, user email table, contacts, alerts mailer, and mobile out of this diff
