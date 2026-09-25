# Feature Specification: Sprint 3 Phase 1 Ultra-Only Drafts

**Feature Branch**: `cursor/guestflow-ultra-only-6420`

**Created**: 2026-09-25

**Status**: Ready for planning

**Input**: GuestFlow Sprint 3 item S. Realign the Phase 1 batch draft worker so Production pilot drafts burn Cursor Ultra Models only. Fail-closed: no third-party chat-completion key on the Production path. Refuse the whole batch if the Ultra path is unavailable. Prior open PR #201 is stale vs current main; this folder is the SoR for the realignment. Phase 1 queue and batch contract stay as already locked.

## Clarifications

### Session 2026-09-25

Locked by Grant / Sprint-3.md §S and the assigned Cloud Agent brief. No guest PII, rates, or access codes were invented.

- Q: May Production Phase 1 drafts use a third-party chat-completion key? → A: No. Fail-closed. Docs must not tell anyone to set that key for Production Phase 1.
- Q: If the Ultra path is missing, may the worker still claim jobs and mark them failed? → A: No. Refuse the entire batch without claiming.
- Q: Does this flip outbound redirect, stay@ From, ads, or go-live? → A: No. Redirect stays as configured. WhatsApp From stays `+27600200825`. Approve&Send stays human. No auto-send.
- Q: May the public webhook call a language model? → A: No. Webhook only enqueues `draft_jobs`.
- Q: Continue spec `008` or a new folder? → A: New sequential folder `027` is the SoR for this realignment. `008` remains the original Phase 1 queue/contract spec.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Production drafts never leave the Ultra meter (Priority: P1)

When Coding or Stay launches the Phase 1 batch, every guest draft that is written comes from a Cursor Ultra Cloud Agent using its own model. Staff never provision a third-party chat-completion key for Production Phase 1. The household’s Ultra model allowance is the only draft-generation meter.

**Why this priority**: Sprint 3 item S exists because the current Production path can fall back to an external chat-completion provider. That bills the wrong meter and recreates a secret Grant does not want on the pilot.

**Independent Test**: Review Production Phase 1 runbooks and the batch worker. Confirm no step requires a third-party chat-completion key, and a run with such a key set still refuses unless the Ultra path is present.

**Acceptance Scenarios**:

1. **Given** a Production Phase 1 batch launch, **When** staff or Coding read the runbook, **Then** the only draft-generation path described is a Cursor Ultra Cloud Agent
2. **Given** a third-party chat-completion key is present in the environment, **When** the batch worker runs without the Ultra path, **Then** the batch is refused and no draft is written from that key
3. **Given** the Ultra Cloud Agent generates replies from the QC’d prompt and message context, **When** drafts are saved, **Then** each saved draft is marked as model-generated and remains unsent

---

### User Story 2 - Missing Ultra path refuses the whole batch (Priority: P1)

If the worker is started as a standalone script, or the Ultra Cloud Agent cannot supply drafts, the batch does not claim any queued jobs. Jobs stay pending for a later Ultra launch. There is no silent fallback.

**Why this priority**: Claiming and failing jobs burns the queue and hides the real problem. Fail-closed means “do nothing to the queue.”

**Independent Test**: Run the worker without dry-run, without a supplied draft map, and without an injected test generator. Confirm zero jobs move from pending, and the skip reason names Cursor Ultra.

**Acceptance Scenarios**:

1. **Given** pending draft jobs exist and the Ultra path is unavailable, **When** the worker starts a live batch, **Then** it exits without claiming any job
2. **Given** the same pending jobs, **When** an operator later launches a Cursor Ultra Cloud Agent correctly, **Then** those jobs are still pending and can be claimed
3. **Given** dry-run mode, **When** the worker runs, **Then** it may exercise claim/window logic with placeholder text and must not save drafts to the live guest thread

---

### User Story 3 - Pilot scope and human send stay locked (Priority: P1)

Only `general_question`, `maintenance_other`, and low-confidence inbound items enter the batch queue. Batches still wait for at least five jobs or twenty minutes, run only 07:00–21:00 Johannesburg time, and stop at six batches per Johannesburg day. Drafts stay editable. Staff still Approve&Send. Nothing auto-sends. Outbound redirect and the WhatsApp From number do not change.

**Why this priority**: Item S is a meter realignment, not a go-live or scope expansion.

**Independent Test**: Confirm enqueue rules, batch contract, and send path are unchanged from the locked Phase 1 contract. Spot-check that Approve&Send still requires a human and a one-time confirm token.

**Acceptance Scenarios**:

1. **Given** an inbound message classified as `general_question`, `maintenance_other`, or confidence below 0.6, **When** the public webhook finishes, **Then** a pending draft job exists and no language model was called on that request
2. **Given** fewer than five pending jobs and the oldest is younger than twenty minutes, **When** the worker checks, **Then** it does not claim
3. **Given** Johannesburg time is before 07:00 or at/after 21:00, or six batches have already run that Johannesburg day, **When** the worker starts, **Then** it does not claim
4. **Given** a model-generated draft on a thread, **When** staff Approve&Send with a confirm token, **Then** the existing outbound path runs (redirect sink if redirect is on) and the worker itself does not send
5. **Given** this package, **When** it is reviewed, **Then** WhatsApp From is still `+27600200825` and outbound redirect / stay@ From / ads / go-live were not folded in

---

### User Story 4 - Coding can launch and GuestFlow Manager can dry-run (Priority: P2)

Coding launches one Cursor Ultra Cloud Agent when the batch contract is met. That agent reads the prompt template plus message context, writes editable replies, and saves them through the existing authenticated draft-upsert gate. GuestFlow Manager can dry-run claim logic and later spot-check Approve&Send on Preview after merge. Merge stays held for that acceptance.

**Why this priority**: A meter fix that nobody can operate still leaves Grant writing replies by hand.

**Independent Test**: Follow the launch note with a dry-run. Confirm the upsert gate still rejects the cron secret. On Preview after merge, GFM spot-checks one editable draft and does not send to a live guest.

**Acceptance Scenarios**:

1. **Given** Coding’s launch note, **When** a Cursor Ultra Cloud Agent is started, **Then** the steps name Ultra as the model, list only the existing draft-worker and database secrets, and never ask for a third-party chat-completion key
2. **Given** the agent has produced a reply, **When** it saves the draft, **Then** it uses the existing draft-upsert gate with the draft-worker secret and `draft_source=llm`
3. **Given** GuestFlow Manager runs a dry-run, **When** it finishes, **Then** no live guest thread received a saved draft and no message was sent

---

### Edge Cases

- Third-party chat-completion key is set: ignored; batch still refused unless Ultra path is present
- Dry-run while Ultra path would otherwise be missing: placeholders only; no live upsert
- Worker started outside 07:00–21:00 Johannesburg: skip for window; do not claim
- Six batches already recorded for the Johannesburg date: skip for cap; do not claim
- Another worker holds claimed jobs less than five minutes old: skip for one-in-flight
- Ultra path missing after jobs were already claimed by a crashed older worker: this package does not reclaim via a third-party key
- Prompt template or property knowledge missing: do not invent rates, phones, or facts; ask staff
- Draft map supplied for some claimed jobs but not others: those without a reply fail that job only after a valid Ultra path opened the batch
- Outbound redirect changes while drafts are being written: worker still only writes drafts; send path enforces the current mode
- stay@ From flip, ads, or redirect go-live requested in the same change: refuse; out of scope

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Production Phase 1 draft generation MUST use a Cursor Ultra Cloud Agent as the only language-model path
- **FR-002**: Production Phase 1 MUST NOT require, document, or call a third-party chat-completion key
- **FR-003**: If the Ultra path is unavailable, the worker MUST refuse the entire batch and MUST NOT claim any draft job
- **FR-004**: Presence of a third-party chat-completion key MUST NOT enable draft generation
- **FR-005**: Public inbound handling MUST only enqueue draft jobs for `general_question`, `maintenance_other`, and confidence below 0.6, and MUST NOT call a language model
- **FR-006**: Batch claim rules MUST stay ≥5 pending jobs OR 20 minutes since the oldest pending job
- **FR-007**: Batch window MUST stay 07:00–21:00 Africa/Johannesburg
- **FR-008**: Soft cap MUST stay ≤6 batches per Africa/Johannesburg date
- **FR-009**: Only one worker MAY be in flight at a time
- **FR-010**: Saved model drafts MUST go through the existing authenticated draft-upsert gate with the draft-worker secret and `draft_source=llm`
- **FR-011**: Drafts MUST remain editable and unsent until a human Approve&Send with a one-time confirm token
- **FR-012**: This package MUST NOT change outbound redirect, WhatsApp From (`+27600200825`), stay@ From, ads, or go-live
- **FR-013**: Dry-run MUST be able to exercise claim/window logic with placeholder replies and MUST NOT upsert live drafts
- **FR-014**: Tests MUST cover fail-closed refuse-batch, dry-run placeholders, and an injected mock generator
- **FR-015**: Production Phase 1 documentation MUST describe the Ultra Cloud Agent launch and MUST NOT tell anyone to set a third-party chat-completion key
- **FR-016**: Prompt context MUST keep the QC’d template plus property knowledge already on main; missing facts stay ask-staff
- **FR-017**: Merge MUST remain held for GuestFlow Manager acceptance (dry-run + Approve&Send spot-check)

### Key Entities

- **draft_job**: Existing Phase 0 queue row (`pending` | `claimed` | `done` | `failed`). This package does not add columns.
- **batch_run**: Existing daily cap row. Unchanged.
- **Ultra path**: Dry-run placeholders, or drafts supplied by the Cursor Ultra Cloud Agent / test generator. Anything else is unavailable.
- **Prompt envelope**: QC’d template plus message context plus property knowledge. Never a source of invented rates or phones.
- **Draft upsert**: Existing authenticated write of `draft_reply` + `draft_source=llm`. Never a send.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Production Phase 1 batch launches that write guest drafts do so via a Cursor Ultra Cloud Agent; 0% require a third-party chat-completion key
- **SC-002**: When the Ultra path is missing, 100% of live worker starts leave every draft job in `pending` (zero claims)
- **SC-003**: A third-party chat-completion key being present changes 0 drafts
- **SC-004**: 100% of webhook completions for the locked intents still enqueue only and finish without a language-model call
- **SC-005**: Batch contract remains 100% as locked: ≥5 or 20 minutes, 07:00–21:00 Johannesburg, ≤6 batches/day, one in flight
- **SC-006**: 0 auto-sends; every model draft still needs human Approve&Send
- **SC-007**: GuestFlow Manager can complete a documented dry-run the same week without setting a third-party chat-completion key
- **SC-008**: WhatsApp From and outbound redirect are unchanged by this package

## Assumptions

- Phase 0 draft-job schema, draft-upsert gate, and Approve&Send + confirm token are already on main
- Spec `008` remains the original Phase 1 queue/contract SoR; this folder realigns only the generation meter
- Property-knowledge injection already on main stays; this package does not invent a second knowledge store
- Coding sets `DRAFT_WORKER_SECRET` on Vercel after a later merge; this package does not print or rotate it
- Cursor plan is Ultra (`RUNTIME: cursor-plan=ultra`); Cloud Agents can be launched with that model
- Outbound redirect stays ON for the pilot until a separate CLEAR
- GuestFlow Manager acceptance is a merge hold, not an agent merge
- No Production Turso writes, no Production deploy, and no live guest send from this package
- Prior PR #201 design (Ultra agent is the model; no external chat-completion call) still holds; its branch is too far behind main to be the delivery branch

## Out of Scope

- stay@ From flip (Sprint 3 item R)
- Ads, redirect go-live, or flipping `OUTBOUND_MODE`
- Auto-send or allowlisted auto-send
- New intents beyond the Phase 1 allowlist
- Changing WhatsApp From
- New CRM, new inbox, or new upsert API
- Production schema migration
- Merging without GuestFlow Manager ACCEPT
