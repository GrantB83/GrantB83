# Feature Specification: GuestFlow Phase 0 Safety & Contact Foundation

**Feature Branch**: `cursor/guestflow-phase0-1280`

**Created**: 2026-09-20

**Status**: Ready for planning

**Input**: Grant CLEAR (20 Sep 2026) for GuestFlow Phase 0: hard approve + one-time confirm on every guest send; persist draft origin; add past-guest contacts and a draft-job queue (schema only); dedicated draft-worker secret (not the cron secret); upsert contacts from Nightsbridge arrivals-and-departures; align email inbound to the same review path. No auto-send. No Phase 1 language-model batch writer. No Gmail Contacts merge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Approve then confirm before any guest send (Priority: P1)

Grant or Liana opens Needs Approval or the inbound queue, reviews a drafted guest reply, marks it approved, and only then confirms Send. The system issues a one-time confirmation token at that confirm step and consumes it on send. WhatsApp live, email, and WhatsApp Web queue all refuse to go out if the conversation is not in an approved/ready state or if the token is missing, invalid, or already used.

**Why this priority**: Today a staff cookie plus a draft body can send. That is the Phase 0 safety hole. Closing it is the ritual this package removes: “click Send because the draft exists.”

**Independent Test**: With a drafted conversation, attempt send without approval or without a fresh token and observe a clear refusal. Approve, obtain one token, send once successfully, then attempt the same token again and observe refusal.

**Acceptance Scenarios**:

1. **Given** a conversation with a draft body and staff signed in, **When** they send without an approved/ready status or without a confirmation token, **Then** the system refuses with a clear failure and no WhatsApp, email, or WhatsApp Web job is created
2. **Given** staff have approved the conversation and confirmed in the review screen, **When** the screen obtains a fresh token and posts Send with that token, **Then** the existing channel path (WhatsApp live, email, or WhatsApp Web queue) may proceed
3. **Given** a token was already consumed on a send attempt, **When** the same token is posted again, **Then** the system refuses and does not send or queue again
4. **Given** staff cancel the confirm dialog, **When** they never request a token, **Then** nothing is sent
5. **Given** a staff-ops copy-only brief, **When** staff open it, **Then** there is still no Send control

---

### User Story 2 - Know whether a draft was heuristic or human (Priority: P1)

Staff reviewing a reply can tell whether the draft came from the existing rule-based writer or from a later human edit. Existing drafts are treated as heuristic. Editing a draft in the review screens records human origin. Language-model origin is reserved for a future worker and is not produced in this phase.

**Why this priority**: Phase 1 cannot measure edit/reject rates without an origin field. Phase 0 only persists the field and sets heuristic/human.

**Independent Test**: Ingest a message that produces a draft and confirm origin is heuristic. Edit that draft as staff and confirm origin becomes human. Confirm no language-model writer ran.

**Acceptance Scenarios**:

1. **Given** an inbound message classified by the existing rules, **When** a draft is stored, **Then** its origin is heuristic
2. **Given** an existing draft with no origin recorded, **When** the store is upgraded, **Then** that draft is treated as heuristic
3. **Given** staff edit a draft in Needs Approval or the inbound queue, **When** they save, **Then** origin is human
4. **Given** this phase is live, **When** inbound is processed, **Then** no language-model writer is invoked

---

### User Story 3 - Remember past-guest contacts from Nightsbridge without inventing phones (Priority: P1)

When SA Ops ingest an arrivals-and-departures export, GuestFlow upserts a past-guest contact for each row that has a real phone and/or email. Missing phones stay empty. South African numbers are stored in a consistent international form when they can be parsed. Contacts are kept for five years after last stay, then deleted. Chat and logs do not dump contact lists.

**Why this priority**: Grant CLEAR set retention at five years after last stay. Recognition density compounds only if every ingest upserts null-tolerant contacts.

**Independent Test**: Ingest a fixture row with a ZA mobile and email and see one contact upserted. Ingest a row with name only and see a contact with no invented phone. Ingest the same phone again and see an update, not a duplicate.

**Acceptance Scenarios**:

1. **Given** an arrivals-and-departures row with a parseable phone and/or email, **When** ingest succeeds, **Then** a tenant-scoped contact is created or updated with display name, last stay, last suite, source nightsbridge, and a delete-after date five years after last stay
2. **Given** a row with no phone, **When** ingest runs, **Then** no phone is invented and a contact may still be stored with email or name only
3. **Given** the same non-empty phone for the same property, **When** a later ingest arrives, **Then** the existing contact is updated rather than duplicated
4. **Given** a number such as `082 123 4567`, **When** it is stored, **Then** it is stored as `+27821234567` when parseable; unparseable values are left empty rather than guessed

---

### User Story 4 - Queue draft jobs without running a writer (Priority: P2)

After inbound classify, GuestFlow may record a pending draft job for a later batch worker. This phase only stores the job and provides a helper to enqueue. No worker claims jobs. No language model runs.

**Why this priority**: Phase 1 needs a queue. Phase 0 must not launch the batch.

**Independent Test**: Classify an inbound sample and confirm a pending job row exists (or the enqueue helper is callable). Confirm no worker process or language-model call exists in this package.

**Acceptance Scenarios**:

1. **Given** inbound classify produces an intent for a guest message, **When** ingest finishes, **Then** a pending draft job may be recorded for that thread and message
2. **Given** Phase 0 is deployed, **When** jobs sit pending, **Then** no batch worker claims them and no draft is written by a language model
3. **Given** enqueue is called twice for the same open message, **When** a pending job already exists, **Then** a duplicate in-flight job is not created

---

### User Story 5 - Dedicated secret for future draft writes (Priority: P2)

A future Cursor Ultra worker will upsert drafts using its own secret. Staff and cron secrets must not unlock that door. The stub accepts a valid dedicated secret and can store a provided draft marked as language-model origin. It rejects a missing secret, a wrong secret, and the cron secret even if that cron secret is otherwise valid for Nightsbridge ingest.

**Why this priority**: Coding’s P0: draft writes must not reuse the cron secret.

**Independent Test**: Call the stub with no secret, with the cron secret, and with the dedicated secret. Only the dedicated secret may update a draft. No language-model call occurs.

**Acceptance Scenarios**:

1. **Given** the dedicated draft-worker secret is unset or wrong, **When** the stub is called, **Then** it refuses and does not change drafts
2. **Given** the caller presents the cron secret, **When** the stub is called, **Then** it refuses even if that cron secret is correct for ingest
3. **Given** the dedicated secret is presented and a draft body is supplied, **When** the stub accepts, **Then** it may store that body as language-model origin without calling a language model
4. **Given** operators read the environment example and README, **When** they look for the new secret name, **Then** it is documented as distinct from the cron secret and Coding sets the live value after merge

---

### User Story 6 - Email inbound stays on the same review path (HOLD webhook) (Priority: P3)

Guest email that already reaches GuestFlow continues through the same thread, ticket, and playbook review path as WhatsApp. The Resend inbound webhook remains HOLD: this phase does not invent dashboard configuration. Partial alignment is acceptable.

**Why this priority**: Grant’s 07:00 ritual is one queue. Dashboard wiring is a human gate.

**Independent Test**: An already-coded inbound email sample still becomes a thread with a draft for human send. Documentation states Resend inbound webhook is HOLD.

**Acceptance Scenarios**:

1. **Given** a signed inbound email payload the app already accepts, **When** it is posted, **Then** it becomes or updates a thread and a draft for human review (never auto-sent)
2. **Given** this phase ships, **When** operators read the pull request and email control-center note, **Then** they see Resend inbound webhook is HOLD and no invented dashboard steps were added

---

### Edge Cases

- Send with a valid token but conversation status still drafted or new — refuse
- Send with approved status but empty or whitespace token — refuse
- Rapid double-click Send — only the first consumed token may proceed; the second request fails closed
- WhatsApp Web queue path must apply the same gates before a job is created
- Email send must apply the same gates before the mail provider is called
- Unparseable or private-looking phone strings are stored as empty, never guessed
- Contact upsert with both phone and email null still records name/source when a stay exists, without inventing a phone
- Draft-worker stub must not treat an empty dedicated secret as “open in development” in production
- Staff-ops copy-only items remain without Send
- Failed send after a consumed token does not resurrect that token; staff must confirm again

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST refuse guest outbound on the existing inbound send path unless the conversation or its latest draft is in an approved/ready set AND a one-time confirmation token is presented
- **FR-002**: System MUST issue that token only when staff confirm in Needs Approval or the inbound queue, and MUST consume the token on the send attempt so reuse fails
- **FR-003**: System MUST apply FR-001/FR-002 to WhatsApp live, email, and WhatsApp Web queue on that same send path
- **FR-004**: System MUST fail closed with a clear client error when the token is missing, invalid, expired, or already used, or when status is not approved/ready
- **FR-005**: Needs Approval and inbound queue Send actions MUST obtain a token after staff confirm, then post it with Send
- **FR-006**: System MUST persist draft origin as one of heuristic, language-model, or human on inbound drafts (and guest ticket drafts if those drafts are edited in this phase)
- **FR-007**: Existing drafts without origin MUST be treated as heuristic; rule-based classify/draft paths MUST set heuristic; staff edits MUST set human
- **FR-008**: This phase MUST NOT implement a language-model draft writer or a batch worker that claims draft jobs
- **FR-009**: System MUST store tenant-scoped past-guest contacts with optional international phone (unique per tenant when present), optional email, display name, last stay, last suite, source (nightsbridge, inbound, or manual), optional nightsbridge id, retention delete-after, and timestamps
- **FR-010**: Retention MUST be five years after last stay, then delete; delete-after MUST be computed on upsert from last stay; no contact-list dumps in chat
- **FR-011**: Contact upserts MUST be null-tolerant and MUST NEVER invent phone numbers
- **FR-012**: System MUST store draft jobs with identity, tenant, thread, message, intent, status (pending, claimed, done, failed), attempts, error, and timestamps — queue only
- **FR-013**: Classify/ingest MUST be able to enqueue a pending draft job (helper required; skip if a pending job already exists for that message)
- **FR-014**: Environment docs MUST name a dedicated draft-worker secret that is not the cron secret
- **FR-015**: A stub draft-upsert interface MUST accept only that dedicated secret (bearer or dedicated header) and MUST reject the cron secret
- **FR-016**: The stub MAY store a supplied draft as language-model origin and MUST NOT call a language model
- **FR-017**: Nightsbridge arrivals-and-departures ingest MUST upsert contacts from parsed phone/email using ZA-friendly international normalization, never inventing phones
- **FR-018**: Email inbound MUST remain on the shared ingest/classify/draft review path already used for WhatsApp; Resend inbound webhook stays HOLD
- **FR-019**: Auto-send, allowlists, Gmail Contacts enrich, stock-order stubs, and WhatsApp From/mode changes are out of scope
- **FR-020**: Automated tests MUST cover send refusal without token, one successful consume, and reuse refusal

### Key Entities

- **Guest conversation**: Existing inbound thread/message under review; must be approved/ready before send
- **Send confirmation token**: One-time staff-issued proof of confirm; consumed on send
- **Draft origin**: heuristic | language-model | human on a stored draft
- **Past-guest contact**: Tenant-scoped recognition record from nightsbridge/inbound/manual; phone unique when present; five-year retention after last stay
- **Draft job**: Queue row for a future batch writer; pending until a later phase

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of guest send attempts without approval or without a fresh confirmation fail closed (no live send, no email delivery, no WhatsApp Web job)
- **SC-002**: A valid confirmation is usable for exactly one send attempt; a second use of the same confirmation fails
- **SC-003**: Staff can complete Approve → confirm → Send on the existing review screens without a new product or a second queue
- **SC-004**: After ingest of an arrivals-and-departures file, every row with a real phone or email has a matching contact and zero invented phones
- **SC-005**: Operators can distinguish heuristic vs human drafts on stored replies
- **SC-006**: The cron secret cannot write drafts through the new stub; only the dedicated secret can
- **SC-007**: No silent guest send is possible from classify, ingest, cron, or page load
- **SC-008**: This phase names and reduces the ritual “send because a draft body exists” to “send only after approve + confirm”

## Assumptions

- Grant CLEAR 20 Sep 2026 applies: Phase 0 only; Phase 1 batch writer is a separate later CLEAR
- Gmail Contacts enrich is disallowed in this phase (Vault path not approved here)
- Retention is 5 years after last stay, then DELETE (Grant CLEAR)
- Existing staff cookie/password gate remains; this phase adds approve + token on top, it does not replace staff auth
- Approved/ready set is the existing review statuses `approved` and `ready` (plus explicit ready-equivalent already used by staff)
- Email inbound webhook dashboard configuration remains a human/CoS HOLD
- Coding sets the live dedicated secret on Vercel after merge
- GuestFlow remains system of record; no new CRM product
- South Africa default country code `+27` when a local mobile (e.g. 0xx) is parseable; otherwise leave phone empty
- Draft-job enqueue is best-effort and must not fail inbound ingest
- `staff_ops` remains copy-only

## Out of Scope

- Phase 1 Ultra batch language-model drafts / launch from webhook
- Auto-send / allowlists
- Gmail Contacts match-only enrich
- `stock_order` stub
- Changing Twilio/WhatsApp From or WhatsApp mode
- Reusing the cron secret for draft writes
- Production deploy or applying Turso migration without Grant (`APPROVE APPLY MIGRATION`)
