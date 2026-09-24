# Tasks: GuestFlow Unified Messaging Interface (UMI v2.1)

**Input**: Design documents from `/specs/015-umi-chat-inbox/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — Preview/CI-HARD and SoR §9 require tests for new paths.

**Organization**: Tasks grouped by user story.

## Phase 1: Setup

- [ ] T001 Copy SoR brief into `specs/015-umi-chat-inbox/UMI-PRODUCT-SPEC-v2.1-2026-09-24.md` and add `apps/guestflow/docs/UMI-V21.md` stating retention **5 years after last stay then delete**
- [ ] T002 Confirm `.specify/feature.json` points at `specs/015-umi-chat-inbox` and constitution v1.0.0 is filled

---

## Phase 2: Foundational

- [ ] T003 Add additive UMI columns/indexes in `apps/guestflow/src/lib/umi-schema.ts` (`booking_id`, `thread_kind` booking|temp, `guest_contact_id`, `last_channel`, `last_inbound_channel`, `last_outbound_at`, `last_inbound_at`, `pending_reply`, `expires_at`, `nudged_at`, `hygiene_status`, `linked_at`, `linked_from_thread_id` on `inbound_threads`; `channel`, `sender_address`, `source_tag`, `dedup_key`, `is_spam`, `body_unavailable` on `inbound_messages`)
- [ ] T004 Add `apps/guestflow/scripts/migrate-umi-v21.js` Turso-safe apply script (no Production apply)
- [ ] T005 [P] Implement channel map + default outbound in `apps/guestflow/src/lib/umi-channels.ts`
- [ ] T006 [P] Implement spam/marketing fail-closed filter in `apps/guestflow/src/lib/umi-spam.ts`
- [ ] T007 [P] Implement Cloud↔Web `dedup_key` in `apps/guestflow/src/lib/umi-dedup.ts`
- [ ] T008 Implement booking/temp match, link-merge, pending_reply, 48h nudge / 14d expiry in `apps/guestflow/src/lib/umi-threads.ts`
- [ ] T009 Implement arriving→pending→recent sort (today+tomorrow SAST) in `apps/guestflow/src/lib/umi-sort.ts`
- [ ] T010 Extend `SendChannel` with `sms` in `apps/guestflow/src/types/inbound.ts`

**Checkpoint**: Schema + pure helpers exist; ingest/UI not switched yet

---

## Phase 3: User Story 1 - Chat-first home + slim nav (Priority: P1)

**Goal**: Staff land on inbox; Needs Approval off nav/ops primary; primary tools reachable.

**Independent Test**: Open `/` on Preview; no Needs Approval in nav; Arrivals/Bookings/Ops work.

- [ ] T011 [P] [US1] Slim `apps/guestflow/src/components/Navigation.tsx` (Inbox, Arrivals & Departures, Bookings, Ops; drop Needs Approval)
- [ ] T012 [P] [US1] Remove Needs Approval from primary tools in `apps/guestflow/src/app/ops/page.tsx`; keep More Tools
- [ ] T013 [US1] Replace staff home in `apps/guestflow/src/app/page.tsx` with chat inbox UI
- [ ] T014 [US1] Redirect `/comms` to `/` in `apps/guestflow/src/app/comms/page.tsx`
- [ ] T015 [P] [US1] Add nav slim regression test in `apps/guestflow/__tests__/umi-nav-slim.test.ts`

---

## Phase 4: User Story 2+3 - One thread per booking + inbox sort (Priority: P1)

**Goal**: One thread per booking; list sort arriving → pending → recent.

**Independent Test**: Fixture two bookings + unmatched; GET `/api/umi/inbox` order and headers.

- [ ] T016 [US2] Implement `GET /api/umi/inbox` in `apps/guestflow/src/app/api/umi/inbox/route.ts`
- [ ] T017 [US2] Implement `GET /api/umi/threads/[id]` in `apps/guestflow/src/app/api/umi/threads/[id]/route.ts`
- [ ] T018 [P] [US2] Thread/sort unit tests in `apps/guestflow/src/lib/__tests__/umi-threads.test.ts` and `apps/guestflow/src/lib/__tests__/umi-sort.test.ts`
- [ ] T019 [US3] Inbox API tests in `apps/guestflow/__tests__/umi-inbox.test.ts`

---

## Phase 5: User Story 4+6 - Auto-draft, channels, badges, no auto-send (Priority: P1)

**Goal**: All four channels land with badges; auto-draft after spam filter; Approve&Send only; redirect intact.

**Independent Test**: Ingest Cloud/Web/email/SMS fixtures; drafts unsent; send still gated.

- [ ] T020 [US4] Refactor `apps/guestflow/src/lib/inbound-ingest.ts` to UMI match + channel + spam skip + draft hold
- [ ] T021 [US6] Lift WA Web metadata-only in `apps/guestflow/src/app/api/inbound/webhook/route.ts`; persist full bodies; map SMS
- [ ] T022 [US6] Tag email source+sender in `apps/guestflow/src/lib/email.ts` and `apps/guestflow/src/app/api/inbound/email/route.ts`; lift HOLD in `apps/guestflow/docs/EMAIL-CONTROL-CENTER.md`
- [ ] T023 [US4] Add SMS outbound path + last-inbound default in `apps/guestflow/src/app/api/inbound/send/route.ts` without weakening confirmToken
- [ ] T024 [US4] In-thread compose + Approve&Send + channel override on `apps/guestflow/src/app/page.tsx`
- [ ] T025 [P] [US6] Update `apps/guestflow/__tests__/inbound-webhook-whatsapp-web.test.ts` for full-body (not `[metadata-only]`)
- [ ] T026 [P] [US4] Add `apps/guestflow/__tests__/umi-ingest.test.ts` (spam no-draft, auto-draft, no send)
- [ ] T027 [P] [US6] Add `apps/guestflow/__tests__/umi-dedup.test.ts`

---

## Phase 6: User Story 5 - Temp threads + link + hygiene (Priority: P1)

**Goal**: Unknown inbound → temp; staff link; 48h nudge / 14d expire.

**Independent Test**: Unknown number temp; link merge; stale expiry flag.

- [ ] T028 [US5] Implement `POST /api/umi/threads/[id]/link` in `apps/guestflow/src/app/api/umi/threads/[id]/link/route.ts`
- [ ] T029 [US5] Add Link-to-booking UI on temp threads in `apps/guestflow/src/app/page.tsx`
- [ ] T030 [US5] Hygiene helper invoked from inbox GET in `apps/guestflow/src/lib/umi-threads.ts`
- [ ] T031 [US5] Add `apps/guestflow/__tests__/umi-link-hygiene.test.ts`

---

## Phase 7: User Story 6 backfill + User Story 7 needs-attention (Priority: P2)

**Goal**: One-time 14-day WA Web backfill; in-chat needs-attention covers former approval cases.

**Independent Test**: Backfill twice idempotent; filter shows draft/temp/welcome/late.

- [ ] T032 [US6] Implement `POST /api/umi/backfill/wa-web` in `apps/guestflow/src/app/api/umi/backfill/wa-web/route.ts`
- [ ] T033 [US6] Add `apps/guestflow/__tests__/umi-wa-web-backfill.test.ts`
- [ ] T034 [US7] Project welcome/late-check-in pending drafts into thread + needs-attention in `apps/guestflow/src/lib/umi-threads.ts`
- [ ] T035 [US7] Needs-attention filter control on `apps/guestflow/src/app/page.tsx`
- [ ] T036 [US7] Keep `apps/guestflow/src/app/needs-approval/page.tsx` copy-only for staff_ops; do not add it back to nav
- [ ] T037 [P] [US7] Add `apps/guestflow/__tests__/umi-needs-attention.test.ts`

---

## Phase 8: Polish

- [ ] T038 Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md` (ritual: three-app reply + separate approvals page)
- [ ] T039 Run `apps/guestflow` `npm test`, `npm run lint`, `npm run build`
- [ ] T040 Map SoR §9 acceptance in the PR body to Preview verification steps from `quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 blocks all stories
- US1 nav/home can start after T009–T010
- US2/US3 APIs depend on T008–T009
- US4/US6 ingest depends on T005–T008
- US5 link depends on T008 + ingest
- US7 depends on inbox + draft projection
- Polish last

### User Story Dependencies

- **US1**: Foundational + UI
- **US2/US3**: Foundational match/sort
- **US4/US6**: Ingest + send + UI compose
- **US5**: Match + link API
- **US7**: Inbox filter + draft projection

### Parallel Opportunities

- T005/T006/T007; T011/T012/T015; T025/T026/T027; T033/T037

## Implementation Strategy

MVP = Phase 1–5 (chat home, one thread, sort, four channels, drafts hold). Then temps, backfill, needs-attention, polish.
