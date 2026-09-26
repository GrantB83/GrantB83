# Tasks: WA Web Full Bodies + Source Display Names (Ship B)

**Input**: Design documents from `/specs/030-wa-web-full-bodies/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/wa-web-inbound.md

**Tests**: Required (FR-014) — sentinel rejection, idempotent backfill / in-place replace, source-name persistence.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

**Purpose**: Feature pointer and shared helper surface

- [x] T001 Persist Spec Kit feature pointer in `.specify/feature.json` to `specs/030-wa-web-full-bodies`
- [x] T002 Create shared WhatsApp Web body/name helper in `apps/guestflow/src/lib/wa-web-body.ts` (sentinel set exactly `[metadata-only]`, `[body unavailable]`, `[observe-probe]`; phone-like name rejection; extract contactName/pushName/notifyName/chatTitle/displayName; never invent)

---

## Phase 2: Foundational

**Purpose**: Blocking helpers used by every story

- [x] T003 [P] Unit-test sentinel detection, phone-like name rejection, and source-name extraction in `apps/guestflow/src/lib/__tests__/wa-web-body.test.ts`
- [x] T004 Extend `findDuplicateMessage` in `apps/guestflow/src/lib/umi-threads.ts` to return `message_text` (and channel when present) so ingest can distinguish sentinel replace vs real duplicate
- [x] T005 Add `displayName` to `ResolveInboundInput` / `IngestPayload` and apply source name onto temp `guest_name` when current value is empty or phone-like in `apps/guestflow/src/lib/umi-threads.ts` and `apps/guestflow/src/lib/inbound-ingest.ts`

**Checkpoint**: Helper + thread title hook exist; stories can share one sentinel definition

---

## Phase 3: User Story 1 - Staff read real WhatsApp Web guest text going forward (Priority: P1) 🎯 MVP

**Goal**: Observe ingest persists real bodies and never writes a sentinel row

**Independent Test**: Webhook with real text stores that text; empty/sentinel observe does not insert a fake row

### Tests for User Story 1

- [x] T006 [P] [US1] Rewrite `apps/guestflow/__tests__/inbound-webhook-whatsapp-web.test.ts` so empty/sentinel payloads must **not** ingest `[body unavailable]` (expect skip, not sentinel persist)
- [x] T007 [P] [US1] Add ingest cases in `apps/guestflow/src/lib/__tests__/umi-threads.test.ts`: real WhatsApp Web body stored; empty/sentinel WhatsApp Web creates zero inbound rows

### Implementation for User Story 1

- [x] T008 [US1] Stop rewriting empty/`[metadata-only]`/`[observe-probe]` to `[body unavailable]` in `apps/guestflow/src/app/api/inbound/webhook/route.ts`; extract source display name from payload + metadata; pass through to ingest
- [x] T009 [US1] In `apps/guestflow/src/lib/inbound-ingest.ts`, if WhatsApp Web text is empty or sentinel, skip insert (prefer no fake row); persist real `message_text` only; `body_unavailable` stays 0 on this path

**Checkpoint**: Going-forward observe cannot create a new sentinel row

---

## Phase 4: User Story 2 - Staff recover existing metadata-only threads (Priority: P1)

**Goal**: One-shot backfill updates sentinel rows in place

**Independent Test**: Seed `[metadata-only]`, backfill real text once → same row updated; second pass adds zero rows

### Tests for User Story 2

- [x] T010 [P] [US2] Extend `apps/guestflow/__tests__/umi-wa-web-backfill.test.ts` for `replaced` / `skippedEmpty` counters and replay-safe counts
- [x] T011 [P] [US2] Add in-place replace case in `apps/guestflow/src/lib/__tests__/umi-threads.test.ts` (externalMessageId or from+timestamp key; no extra insert)

### Implementation for User Story 2

- [x] T012 [US2] When ingest finds a WhatsApp Web sentinel by `external_message_id` or sender+timestamp, UPDATE `message_text` / `dedup_key` / `body_unavailable=0` in place in `apps/guestflow/src/lib/inbound-ingest.ts`
- [x] T013 [US2] Update `apps/guestflow/src/app/api/umi/backfill/wa-web/route.ts`: never write sentinels; count `replaced`, `skippedEmpty`; accept 14-day window **or** match to an existing open sentinel; pass display names

**Checkpoint**: Thread-28-class rows can be recovered without duplicate storms

---

## Phase 5: User Story 3 - Staff see a real name on unmatched WhatsApp Web threads (Priority: P2)

**Goal**: Temp / unmatched title uses source display name

**Independent Test**: Ingest/backfill with chat title → `bookerName` is that name; phone-only source keeps number

### Tests for User Story 3

- [x] T014 [P] [US3] Add name-persistence cases in `apps/guestflow/src/lib/__tests__/umi-threads.test.ts`: source name on temp `guest_name` / `bookerName`; phone-like name does not invent; replace refreshes phone-like title

### Implementation for User Story 3

- [x] T015 [US3] On ingest and sentinel replace, refresh `inbound_threads.guest_name` from source display name when current title is empty or phone-like in `apps/guestflow/src/lib/umi-threads.ts` / `apps/guestflow/src/lib/inbound-ingest.ts` (booking `guest_name` still wins when linked)

**Checkpoint**: Unmatched temps show a human name when WhatsApp Web has one

---

## Phase 6: User Story 4 - Same guest line is not stored twice across Cloud and Web (Priority: P2)

**Goal**: Cloud↔Web dedup after real-body replace

**Independent Test**: Cloud real body + Web same wording/time → one row; leftover Web sentinel removed

### Tests for User Story 4

- [x] T016 [P] [US4] Extend Cloud↔Web dedup in `apps/guestflow/src/lib/__tests__/umi-threads.test.ts`: real Cloud row + later Web real body is duplicate; Web sentinel + Cloud real body does not leave two real copies

### Implementation for User Story 4

- [x] T017 [US4] After computing real-text `dedup_key`, if a non-sentinel row already matches, return duplicate and delete a leftover WhatsApp Web sentinel on a different id in `apps/guestflow/src/lib/inbound-ingest.ts`

**Checkpoint**: No duplicate storms

---

## Phase 7: Polish & Cross-Cutting

- [x] T018 [P] Update inbound contract in `apps/guestflow/docs/WA-WEB-BRIDGE-CONTRACT.md` (no sentinel persist; display-name fields)
- [x] T019 [P] Write operator artefact `apps/guestflow/docs/WA-WEB-FULL-BODIES.md` (ritual removed + how to verify thread 28)
- [x] T020 [P] Update `docs/automation/STATUS.md` and `docs/automation/labor-ledger.md`
- [x] T021 Run Vitest targets in `apps/guestflow` per `specs/030-wa-web-full-bodies/quickstart.md`; fix failures
- [x] T022 Confirm locks unchanged (no edits to outbound redirect, send confirmToken, or From `+27600200825`)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocks stories)
- US1 (P1 going-forward) then US2 (P1 backfill) then US3 (names) then US4 (Cloud dedup)
- US3/US4 can start after T005; they share ingest files with US1/US2 so implement sequentially in this repo
- Polish after stories

### User Story Independent Tests

- **US1**: webhook/ingest skip sentinel; persist real body
- **US2**: in-place replace; replay adds zero rows
- **US3**: unmatched title = source name
- **US4**: Cloud + Web = one real line

### MVP

US1 only already stops new sentinels. Operator job this week also needs US2 + US3.

## Notes

- Do not invent thread-28 bodies in Production
- MERGE HOLD until GFM ACCEPT after QA job-script (open thread 28 + peers; read real text + names)

---

## Phase 8: Convergence (GFM evidence wording 26 Sep)

GFM confirmed kick — no product-scope change. Tighten S9/S10 evidence only.

- [x] T023 Align S9/S10 wording in `specs/030-wa-web-full-bodies/spec.md` and `specs/030-wa-web-full-bodies/plan.md` (S9: open thread 28 + peers read real text + names; S10: Prod `?thread=28` before/after or Preview same data + `whatsapp_web` metadata-only count) per GFM / S10 (`partial`)
- [x] T024 Write S10 evidence pack `specs/030-wa-web-full-bodies/EVIDENCE.md` with thread-28 before (kick 25 Sep all metadata-only), after HOLD for QA, and inbox scan count method per S10 / US1 (`missing`)
- [x] T025 Point artefact + STATUS + quickstart QA script at the evidence pack; MERGE HOLD until GFM ACCEPT after QA job-script in `apps/guestflow/docs/WA-WEB-FULL-BODIES.md` and `docs/automation/STATUS.md` per S9 / plan: MERGE HOLD (`partial`)

