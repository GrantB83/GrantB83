# Feature Specification: GuestFlow Phase 1 Cursor Ultra Batch Draft Pilot

**Feature Branch**: `cursor/guestflow-ultra-only-cfea`

**Created**: 2026-09-21

**Status**: Ready for implementation

**Input**: Grant CLEAR (21 Sep 2026) for GuestFlow Phase 1 Ultra-only realignment: Remove/disable OpenAI chat.completions path. Cursor Ultra CA generates drafts directly using its own model, then POSTs to /api/drafts/upsert (DRAFT_WORKER_SECRET only). Batch contract: ≥5 jobs OR 20 min wait, 07:00–21:00 Africa/Johannesburg window, one CA in flight, ≤6 batches/day soft cap Phase 1. Intents: general_question, maintenance_other, low-confidence only. No auto-send, From unchanged, respect outbound redirect. **No OPENAI_API_KEY required in Production.**

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Webhook enqueues draft jobs without LLM generation (Priority: P1)

When an inbound WhatsApp/SMS/email message is classified with a matching intent (general_question, maintenance_other, or low-confidence classification), the webhook handler creates a pending draft_job record and returns within 30 seconds without calling any language model or generating a draft inline.

**Why this priority**: Webhooks must complete quickly (≤30s) to avoid timeouts and stay within Vercel's function limits. Sync LLM generation on the hot path is explicitly forbidden by the batch contract and would bill incorrectly (Vercel function time instead of Cursor Ultra Models pool).

**Independent Test**: Send a test message that triggers general_question classification. Confirm a pending draft_job row exists, no draft_reply is written to the message, no LLM provider was called, and the webhook returned in under 30 seconds.

**Acceptance Scenarios**:

1. **Given** an inbound message classified as general_question with confidence ≥ 0.4, **When** the webhook completes, **Then** a pending draft_job is created for that message and no draft_reply exists
2. **Given** an inbound message classified as maintenance_other, **When** the webhook completes, **Then** a pending draft_job is created for that message
3. **Given** an inbound message classified with confidence < 0.6 (low-confidence), **When** the webhook completes, **Then** a pending draft_job is created for that message
4. **Given** an inbound message classified as booking_inquiry (high confidence), **When** the webhook completes, **Then** no draft_job is created (existing heuristic draft path continues)
5. **Given** the webhook handler runs, **When** draft_job enqueue logic executes, **Then** no OpenAI, Anthropic, or other LLM provider API is called and the webhook completes in under 30 seconds

---

### User Story 2 - Batch worker claims and processes draft jobs (Priority: P1)

A Cursor Ultra Cloud Agent discovers pending draft_jobs, claims a batch (≥5 jobs OR all pending if 20 minutes elapsed since last batch), generates drafts using its own Cursor Ultra model (no external API calls), and upserts each draft via the authenticated API endpoint with draft_source=llm. The worker enforces one-in-flight and respects the batch contract window and cap.

**Why this priority**: This is the core Phase 1 value: Cursor Ultra-generated drafts that bill Cursor Ultra Models pool instead of Vercel or per-message Cloud Agents. No OpenAI dependency. The batch contract keeps costs predictable and prevents resource contention.

**Independent Test**: Seed 5 pending draft_jobs in the test database. Run the batch worker script in dry-run mode to verify claim logic. For actual draft generation, launch as Cursor Ultra CA task and confirm all 5 jobs transition to claimed then done, each message has draft_reply populated with draft_source=llm, and no jobs remain pending.

**Acceptance Scenarios**:

1. **Given** 5 or more pending draft_jobs exist, **When** the Cursor Ultra CA batch worker runs, **Then** it claims and processes all pending jobs in one batch
2. **Given** fewer than 5 pending draft_jobs exist and 20 minutes have elapsed since the last batch, **When** the batch worker checks, **Then** it claims and processes all pending jobs
3. **Given** fewer than 5 pending draft_jobs exist and less than 20 minutes have elapsed, **When** the batch worker checks, **Then** it does not claim jobs and waits
4. **Given** a draft_job is being processed by the worker, **When** the Cursor Ultra CA generates the draft, **Then** it uses the QC'd prompt template from the repository and its own model context (never invents rates, phones, or facts)
5. **Given** the CA generates a draft reply, **When** the worker upserts, **Then** it POSTs to /api/drafts/upsert with DRAFT_WORKER_SECRET and draft_source=llm
6. **Given** the upsert succeeds, **When** the worker updates the job, **Then** the job status becomes done and the message draft_reply and draft_source are set
7. **Given** the upsert fails, **When** the worker handles the error, **Then** the job status becomes failed with error recorded and attempts incremented
8. **Given** the batch worker is run as a standalone script (not by Cursor Ultra CA), **When** it attempts to generate drafts, **Then** it fails closed with error message instructing to launch as Cursor Ultra CA

---

### User Story 3 - Batch contract enforces window, cap, and one-in-flight (Priority: P1)

The batch worker only runs during the Africa/Johannesburg 07:00–21:00 window, soft-caps at 6 batches per day, and ensures only one worker is in flight at any time to avoid duplicate claims and race conditions.

**Why this priority**: Cost control, predictable resource usage, and avoiding claim/idempotency races are hard requirements in the batch contract. Violating these creates unbounded cost and operational risk.

**Independent Test**: Run the batch worker outside the 07:00–21:00 SAST window and confirm it exits without claiming jobs. Seed 6 completed batch runs in one day and confirm the 7th run refuses to claim. Attempt to start two workers concurrently and confirm one blocks or exits to maintain one-in-flight.

**Acceptance Scenarios**:

1. **Given** the current time in Africa/Johannesburg is before 07:00 or after 21:00, **When** the batch worker is invoked, **Then** it exits without claiming any draft_jobs
2. **Given** 6 batches have already completed today (Africa/Johannesburg date), **When** the batch worker is invoked again, **Then** it exits without claiming jobs and logs the soft cap reached
3. **Given** one batch worker is already claiming or processing jobs, **When** a second worker is invoked, **Then** the second worker detects the in-flight lock and exits (or waits until the first finishes)
4. **Given** the in-flight lock is stale (e.g., previous worker crashed), **When** a new worker starts, **Then** it can reclaim the lock after a timeout or staleness check
5. **Given** the batch completes successfully, **When** the worker exits, **Then** it releases the in-flight lock so the next batch can run

---

### User Story 4 - Drafts upsert API authenticates and validates (Priority: P1)

The POST /api/drafts/upsert endpoint accepts only DRAFT_WORKER_SECRET (never CRON_SECRET or unauthenticated requests), validates the payload (threadId, draftReply, draftSource=llm), and upserts the draft_reply and draft_source on the target message. It never sends the draft to the guest.

**Why this priority**: Security and separation of concerns. Draft writes must be isolated from cron ingest and must never trigger auto-send.

**Independent Test**: Call /api/drafts/upsert with no secret, with CRON_SECRET, with a wrong secret, and with DRAFT_WORKER_SECRET. Only the correct DRAFT_WORKER_SECRET succeeds. Confirm the upserted message has draft_source=llm and no outbound send job was created.

**Acceptance Scenarios**:

1. **Given** the caller presents no Authorization header, **When** they POST to /api/drafts/upsert, **Then** the endpoint returns 401 Unauthorized
2. **Given** the caller presents CRON_SECRET as the bearer token, **When** they POST to /api/drafts/upsert, **Then** the endpoint returns 403 Forbidden (or 401) and does not upsert
3. **Given** the caller presents a wrong secret, **When** they POST to /api/drafts/upsert, **Then** the endpoint returns 401 and does not upsert
4. **Given** the caller presents DRAFT_WORKER_SECRET and a valid payload, **When** they POST to /api/drafts/upsert, **Then** the endpoint upserts the draft_reply and draft_source=llm on the specified message
5. **Given** the payload is missing threadId or draftReply, **When** the endpoint validates, **Then** it returns 400 Bad Request
6. **Given** the payload specifies draftSource=heuristic or draftSource=human, **When** the endpoint validates, **Then** it rejects with 400 (this endpoint is for LLM drafts only)
7. **Given** the draft is successfully upserted, **When** the endpoint completes, **Then** no WhatsApp send, email send, or send_job is created (drafts still require Approve & Send)

---

### User Story 5 - Staff review and approve LLM drafts (Priority: P2)

Staff open Needs Approval or the inbound queue, see threads with draft_source=llm, review the generated draft reply, and either approve & send (with confirmToken), edit (changing draft_source to human), or reject/redraft. The LLM draft is never auto-sent.

**Why this priority**: Human-in-the-loop approval is a hard gate. Phase 1 has no auto-send. This story confirms the review path works end-to-end with LLM-generated drafts.

**Independent Test**: Seed a thread with a message that has draft_reply populated and draft_source=llm. Open Needs Approval as staff. Confirm the draft is visible, shows source=llm, and can be approved/edited/rejected without auto-send.

**Acceptance Scenarios**:

1. **Given** a message with draft_reply and draft_source=llm, **When** staff open Needs Approval, **Then** the thread appears with the draft visible and a source indicator showing it was LLM-generated
2. **Given** staff approve the LLM draft and confirm Send, **When** they POST with confirmToken, **Then** the draft is sent via the existing outbound path (respecting outbound redirect mode)
3. **Given** staff edit the LLM draft, **When** they save the edited version, **Then** draft_source changes to human
4. **Given** staff reject or clear the draft, **When** they act, **Then** the draft_reply and draft_source are cleared (or draft_source remains as historical record)
5. **Given** no staff approval occurs, **When** time passes, **Then** the LLM draft remains in Needs Approval and is never auto-sent

---

### User Story 6 - Worker respects outbound redirect mode (Priority: P2)

When OUTBOUND_MODE=redirect is set, the batch worker and upsert endpoint behave normally (they still write drafts), but the drafts are never sent to real guest phone numbers. The existing outbound redirect logic on the send path handles test-mode routing.

**Why this priority**: Phase 0 outbound redirect (#194) is live. Phase 1 must not bypass it. The worker writes drafts; the send path enforces redirect.

**Independent Test**: Set OUTBOUND_MODE=redirect and OUTBOUND_REDIRECT_TARGET. Seed pending draft_jobs and run the batch worker. Confirm drafts are written. Have staff approve and send one. Confirm the send goes to OUTBOUND_REDIRECT_TARGET, not the original guest phone.

**Acceptance Scenarios**:

1. **Given** OUTBOUND_MODE=redirect, **When** the batch worker upserts drafts, **Then** it writes draft_reply and draft_source=llm normally without checking the mode
2. **Given** OUTBOUND_MODE=redirect and staff approve/send an LLM draft, **When** the send path runs, **Then** the existing outbound redirect logic routes to OUTBOUND_REDIRECT_TARGET
3. **Given** OUTBOUND_MODE=live, **When** staff approve/send an LLM draft, **Then** the send goes to the real guest phone number as expected

---

### User Story 7 - Visibility and monitoring for LLM drafts (Priority: P3)

Staff and SA Ops can see which drafts are LLM-generated vs heuristic vs human. GuestFlow Manager or Grant can count edit rates, failure rates, and batch sizes to measure Phase 1 success.

**Why this priority**: Measurability is required for Phase 1 pilot success evaluation. Without draft_source visibility, edit/reject rates cannot be tracked.

**Independent Test**: Query the database for messages with draft_source=llm. Confirm the count matches the number of processed draft_jobs. Generate a simple report of draft_source distribution.

**Acceptance Scenarios**:

1. **Given** a set of messages with mixed draft_source values, **When** staff or ops query the database, **Then** they can filter and count by draft_source
2. **Given** a period of Phase 1 operation, **When** GuestFlow Manager generates a report, **Then** the report includes: number of LLM drafts generated, number edited, number sent as-is, number rejected
3. **Given** draft_jobs with failed status, **When** ops review errors, **Then** error messages are visible in the draft_jobs table for debugging

---

### Edge Cases

- Worker crashes mid-batch: jobs remain claimed with stale timestamp; next worker reclaims after timeout
- LLM provider returns error (rate limit, timeout, invalid response): job marked failed with error; does not retry indefinitely
- Webhook and worker race on same message: unique constraint on draft_jobs.message_id prevents duplicate pending jobs
- Batch claims 5 jobs but only 3 upserts succeed: 3 marked done, 2 marked failed; next batch does not re-claim done jobs
- Worker runs at 06:59 or 21:01 SAST: window check refuses to claim jobs
- 7th batch in one day: soft cap exit, no claims
- OUTBOUND_MODE changes mid-batch: worker writes drafts normally; send path enforces current mode
- DRAFT_WORKER_SECRET rotation: old secret stops working immediately; in-flight batch may fail upserts
- Message already has draft_reply from heuristic: worker overwrites with draft_source=llm (or skips if job status already done)
- Staff edit draft while worker is upserting: last-write-wins (no optimistic lock in Phase 1)
- draft_job with intent not in the Phase 1 list: worker skips or marks failed (depends on implementation choice)
- Pending jobs older than 24 hours: worker processes as normal or optionally expires stale jobs

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Inbound webhook MUST enqueue a pending draft_job when classifying a message with intent general_question, maintenance_other, or confidence < 0.6 (low-confidence)
- **FR-002**: Webhook MUST NOT call any LLM provider API or generate draft_reply inline for the intents in FR-001
- **FR-003**: Webhook MUST complete in under 30 seconds including draft_job enqueue
- **FR-004**: Batch worker MUST claim draft_jobs only when: (a) ≥5 pending jobs exist OR (b) ≥20 minutes elapsed since last batch completion
- **FR-005**: Batch worker MUST only run during 07:00–21:00 Africa/Johannesburg time window
- **FR-006**: Batch worker MUST soft-cap at 6 batches per day (Africa/Johannesburg date)
- **FR-007**: Batch worker MUST enforce one-in-flight: only one Cursor Ultra CA claiming/processing at a time
- **FR-008**: Batch worker MUST use a single QC'd prompt template stored in the repository (apps/guestflow/prompts/DRAFT_PROMPT.md)
- **FR-009**: Prompt template MUST include instructions to never invent rates, phone numbers, stock levels, or legal advice; use [ASK STAFF] or [ASK GRANT] placeholders when facts are unknown
- **FR-010**: Prompt template MUST be QC'd by Coding or SuperGrok once before use; note QC status in a comment or template header
- **FR-011**: Cursor Ultra CA MUST generate drafts using its own model context (not external API calls to OpenAI or other providers)
- **FR-012**: Batch worker MUST call POST /api/drafts/upsert with DRAFT_WORKER_SECRET and payload: {threadId, messageId, draftReply, draftSource: "llm"}
- **FR-013**: POST /api/drafts/upsert MUST accept only DRAFT_WORKER_SECRET as Authorization (bearer token or dedicated header)
- **FR-014**: POST /api/drafts/upsert MUST reject requests with no secret, wrong secret, or CRON_SECRET
- **FR-015**: POST /api/drafts/upsert MUST upsert draft_reply and draft_source=llm on the specified message
- **FR-016**: POST /api/drafts/upsert MUST validate payload: threadId and draftReply are required; draftSource must be "llm" for this endpoint
- **FR-017**: POST /api/drafts/upsert MUST NOT create any send_job, WhatsApp send, or email send (drafts require human approval)
- **FR-018**: Batch worker MUST update draft_job status: pending → claimed (on claim) → done (on success) or failed (on error)
- **FR-019**: Batch worker MUST record error messages and increment attempts on draft_job when draft generation or upsert fails
- **FR-020**: System MUST NOT auto-send Cursor Ultra drafts; all drafts require staff Approve & Send with confirmToken (Phase 0 gate)
- **FR-021**: Staff MUST be able to review threads with draft_source=llm in Needs Approval and inbound queue
- **FR-022**: Staff editing a Cursor Ultra draft MUST change draft_source to human
- **FR-023**: Batch worker and upsert endpoint MUST NOT bypass OUTBOUND_MODE=redirect; send path enforces redirect
- **FR-024**: Batch worker MUST respect existing From number (+27600200825); no WhatsApp mode changes
- **FR-025**: Batch worker MUST fail closed if run as standalone script (not by Cursor Ultra CA) with clear error message
- **FR-026**: Production deployment MUST NOT require OPENAI_API_KEY or any external LLM provider API keys
- **FR-027**: Documentation MUST state that worker must be launched BY Coding/Grok as Cursor Ultra CA, not as standalone script with API keys
- **FR-028**: Automated tests MUST cover: webhook enqueue without LLM, upsert auth (reject CRON_SECRET), intent filter, job claim idempotency, batch size logic, no send side effects, fail-closed behavior

### Key Entities

- **draft_job**: Queue row with id, tenant_id, thread_id, message_id, intent, status (pending|claimed|done|failed), attempts, error, created_at, updated_at (already exists in Phase 0 schema)
- **inbound_message**: Existing table; adds or updates draft_reply (TEXT) and draft_source (heuristic|llm|human) when draft is upserted
- **Batch lock**: Ephemeral or database-backed lock to enforce one-in-flight (implementation choice: row lock, distributed lock, or file lock)
- **Batch run log**: Optional entity to track batch start, end, count, date for soft-cap enforcement (may be in-memory or persisted)
- **LLM prompt template**: File in repository (e.g., apps/guestflow/prompts/DRAFT_PROMPT.md) with QC status noted

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of webhook requests with general_question, maintenance_other, or low-confidence classification complete in under 30 seconds and enqueue a draft_job without calling any external LLM API
- **SC-002**: 100% of pending draft_jobs are claimed and processed in batches of ≥5 OR within 20 minutes of the last batch (whichever comes first), respecting the 07:00–21:00 SAST window
- **SC-003**: No more than 6 batches run in any single day (Africa/Johannesburg date) during Phase 1 pilot
- **SC-004**: 100% of draft upserts present DRAFT_WORKER_SECRET; 0% succeed with CRON_SECRET or no secret
- **SC-005**: All Cursor Ultra-generated drafts have draft_source=llm and appear in Needs Approval for staff review
- **SC-006**: Zero auto-sends occur; 100% of Cursor Ultra drafts require staff Approve & Send with confirmToken
- **SC-007**: Phase 1 pilot runs for at least one week with measurable edit/reject rate tracked (success = data exists; target rates are not set in Phase 1)
- **SC-008**: When OUTBOUND_MODE=redirect, 100% of approved Cursor Ultra draft sends go to OUTBOUND_REDIRECT_TARGET, not real guest phones
- **SC-009**: npm run build and focused tests pass in apps/guestflow before merge
- **SC-010**: Production deployment does NOT require OPENAI_API_KEY or any external LLM provider credentials
- **SC-011**: Attempting to run batch-worker as standalone script (not Cursor Ultra CA) fails with clear error message and instructions

## Assumptions

- Phase 0 (approve + confirmToken + draft_source + guest_contacts + draft_jobs schema + DRAFT_WORKER_SECRET) is live and stable in production
- Outbound redirect (#194) is live and OUTBOUND_MODE=redirect works correctly with Phase 0
- WhatsApp allowlist (#193) is merged and does not conflict with Phase 1 changes
- Cursor Ultra Cloud Agents have network egress to GuestFlow production API (allowlist approved)
- GuestFlow production has DRAFT_WORKER_SECRET set as an environment secret distinct from CRON_SECRET
- Coding or SuperGrok performs one-time QC on the Cursor Ultra prompt template before Phase 1 launch
- Cursor Ultra Cloud Agent provides the LLM capability - no external API provider (OpenAI, Anthropic, etc.) is needed
- Coding launches the batch worker AS a Cursor Ultra CA task, not as a standalone script with API keys
- GFM Bot never drafts; no per-message CA launch; no Bot poll-wait for CA completion (forbid encoded in Efficiency desk bounce)
- Batch contract parameters (≥5, 20min, 07:00–21:00, ≤6/day) are Phase 1 pilot values and may change in Phase 2 based on measured load and cost
- From stays +27600200825; no WA clicker; no Gmail enrich; no stock_order in Phase 1
- SA Ops retention = 5 years after last stay (Phase 0); Phase 1 does not change retention
- Coding sets the live DRAFT_WORKER_SECRET on Vercel Production after PR merge (no OPENAI_API_KEY required)
- One-in-flight enforcement uses a simple lock mechanism (database row lock, file lock, or distributed lock); does not require a complex orchestrator
- Stale lock timeout = 60 minutes (if worker crashes, next worker can reclaim after 60 min)
- Failed draft_jobs are not automatically retried; manual intervention or a future cron can retry (out of scope for Phase 1)
- Low-confidence threshold = confidence < 0.6 (matches existing classifier logic)
- Intents general_question and maintenance_other use existing classifier constants; no new classifier logic required
- GuestFlow remains system of record; no new CRM product
- Email inbound continues through shared ingest path; Phase 1 does not change email routing
- Resend inbound webhook remains HOLD (Phase 0 decision); Phase 1 does not unblock it
- Staff still use existing Needs Approval and inbound queue UI; no new review screen in Phase 1
- draft_source display in UI is nice-to-have; database queries are sufficient for Phase 1 pilot measurement
- Phase 1 ships as one PR for GFM acceptance; no incremental merges
- Tests run in apps/guestflow with vitest; CI must pass before merge

## Out of Scope

- Auto-send / allowlisted auto-send (Phase 2+)
- Changing Twilio From or WhatsApp mode
- Gmail Contacts enrich
- stock_order intent and draft template
- New staff UI for draft_source display (database queries sufficient for Phase 1)
- Complex distributed lock or orchestration system (simple lock acceptable)
- Automatic retry of failed draft_jobs (manual or future cron)
- Fine-tuned or custom LLM models (use provider defaults via Cursor Ultra)
- Multi-language drafts (English only for Phase 1)
- Guest satisfaction or edit rate targets (measurement only; no targets in Phase 1)
- Historical draft backfill (only new inbound after Phase 1 deploy)
- Webhook payload changes or new inbound sources
- Phase 2 intents (booking_inquiry, suite_preference, etc. stay on heuristic path)
- GFM Bot drafting or per-message CA launch (explicitly forbidden)
- Production database migration without Grant approval (`APPROVE APPLY MIGRATION`)
- Production deploy to live GuestFlow without Grant CLEAR on the PR
