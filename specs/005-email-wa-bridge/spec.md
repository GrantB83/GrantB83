# Feature Specification: GuestFlow Email Control Center & WhatsApp Web Bridge

**Feature Branch**: `cursor/email-wa-bridge-6cf2`

**Created**: 2026-09-20

**Status**: Ready for planning

**Input**: Overnight GuestFlow work for Browns Dullstroom: staff can Send approved guest email from Needs Approval / inbound queue (human-gated, existing mailbox identity), inbound guest email becomes GuestFlow threads, and WhatsApp Web Send creates a durable job that only becomes success after the CoS clicker reports delivered or sent. staff_ops daily brief stays copy-only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send approved guest email (Priority: P1)

Grant opens Needs Approval or the inbound queue at about 07:00 America/Chicago, reviews a guest reply, chooses Email, edits To / Subject / Body if needed, clicks Send, and confirms. The mailbox identity already used for GuestFlow contact mail delivers the message. The thread records that an outbound email was attempted and whether it succeeded.

**Why this priority**: This is the morning ritual to remove — copy-paste from GuestFlow into Gmail. Email is the P0 channel that can go live without a new phone number.

**Independent Test**: Seed an inbound thread with a draft, open thread detail, choose Email, confirm Send, and verify an audit row plus outbound status without any automatic send on approve or page load.

**Acceptance Scenarios**:

1. **Given** a drafted guest thread with a reply and a recipient address, **When** staff click Send on the Email channel and confirm the dialog, **Then** the system delivers the edited To / Subject / Body using the existing GuestFlow from-address and records status, recipient, provider message id, and timestamp
2. **Given** a drafted guest thread, **When** staff Approve only (no Send click), **Then** no outbound email is delivered
3. **Given** staff click Send and then cancel the confirm dialog, **Then** no outbound email is delivered
4. **Given** a staff_ops daily brief item, **When** staff open it on Needs Approval, **Then** there is still no Send control — only copy-only Approve / Copy WhatsApp text
5. **Given** delivery fails, **When** staff confirmed Send, **Then** the UI shows a clear failure (not a success state) and an audit row records the failed attempt

---

### User Story 2 - Inbound guest email becomes a thread (Priority: P1)

A guest emails the GuestFlow inbound mailbox. The control center creates or updates a conversation thread, stores the message as email, classifies it with the existing inbound rules, and queues a draft for the same Needs Approval / inbound-queue review Grant already uses for WhatsApp.

**Why this priority**: Outbound Send is only half of the 07:00 ritual. Inbound must land in the same queue or Grant still hunts Gmail.

**Independent Test**: Post a signed inbound-email sample (metadata plus body text) and verify a thread with source email, a stored inbound message, and a draft or exception using the existing classifier — without scanning a full inbox.

**Acceptance Scenarios**:

1. **Given** a valid inbound email event with sender, subject, and body, **When** the mailbox posts it to GuestFlow, **Then** a thread is created or updated and the message appears in the inbound queue with source email
2. **Given** the same provider message id is posted twice, **When** the second event arrives, **Then** GuestFlow does not create a duplicate message
3. **Given** an unsigned or wrong-secret inbound post, **When** it hits the email intake, **Then** it is rejected and no thread is written
4. **Given** a classified inbound email that needs a guest reply, **When** intake succeeds, **Then** a draft is available for human Send later (never auto-sent)

---

### User Story 3 - Queue WhatsApp Web send after confirm (Priority: P2)

Grant reviews a guest WhatsApp draft, selects **Interim · WhatsApp Web**, clicks Send, and confirms. GuestFlow does not treat that click as delivered. It creates a durable send job in queued state and shows interim status. Success appears only after the CoS clicker reports sent or delivered.

**Why this priority**: Removes the “paste into WhatsApp Web and hope” ritual without buying a live WhatsApp Cloud / Twilio number. Must not look like a live carrier send.

**Independent Test**: Confirm Send on WhatsApp Web, verify a queued job id is returned, and verify the UI does not show a Twilio-style success until the job is completed as sent.

**Acceptance Scenarios**:

1. **Given** a drafted thread and channel WhatsApp Web, **When** staff confirm Send, **Then** a durable job is created as queued and the UI shows Interim · WhatsApp Web plus pending/queued status
2. **Given** a job is queued or claimed, **When** staff look at the thread, **Then** the outcome is not shown as successfully sent
3. **Given** staff cancel the confirm dialog, **When** they had selected WhatsApp Web, **Then** no job is created
4. **Given** a staff_ops item, **When** staff view it, **Then** WhatsApp Web Send is also absent

---

### User Story 4 - CoS clicker claims and completes jobs (Priority: P2)

The CoS Chrome WhatsApp Web clicker asks GuestFlow for the next queued jobs, claims one, types the body (Shift+Enter for newlines, one bubble), and reports sent, failed, or blocked. Guest inbound lines observed on WhatsApp Web can be posted back into the same inbound pipeline with source WhatsApp Web.

**Why this priority**: Without claim/complete, the queue is a dead letter and the UI would have to lie about success.

**Independent Test**: Create a queued job, claim it with the bridge secret, complete it as sent, and verify the thread may then show sent. Repeat complete-as-blocked and verify an error banner, not a success badge.

**Acceptance Scenarios**:

1. **Given** one or more queued jobs, **When** the clicker lists queued jobs with a valid bridge secret, **Then** it receives the next jobs with payload fields needed to type one bubble
2. **Given** a queued job, **When** the clicker claims it, **Then** status becomes claimed and another claimer cannot take the same job
3. **Given** a claimed job, **When** the clicker completes with sent, **Then** the job is sent and the thread may show sent — only after this report
4. **Given** QR login or Aw Snap, **When** the clicker completes with blocked, **Then** the job is blocked, the UI shows an error banner, and it does not resemble a live-carrier success
5. **Given** a guest message observed on WhatsApp Web, **When** the clicker posts the existing inbound shape with source WhatsApp Web, **Then** it is ingested like other inbound sources
6. **Given** a missing or wrong bridge secret, **When** list/claim/complete is called, **Then** the request is rejected

---

### Edge Cases

- Missing recipient address on Email Send — reject with a clear error; do not invent an address
- Missing from-identity or mail credential in the environment — fail closed; do not invent a From address
- Double-click Send — one delivery or one job only (button disabled while in flight)
- Inbound email webhook that has metadata only (no body) — fetch or compose a usable body; if body cannot be obtained, store subject plus a visible “body unavailable” note rather than dropping the event
- Job complete called twice — second complete is rejected or treated as idempotent; status does not regress from sent
- Job complete as sent from GuestFlow UI alone — forbidden; UI Send on WhatsApp Web only queues
- WhatsApp Web job with empty body — reject
- staff_ops approve/copy path must remain unchanged from the copy-only approvals behaviour already live

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Staff MUST be able to Send an approved guest email from Needs Approval and inbound-queue thread detail after an explicit Send click plus confirm dialog
- **FR-002**: The Email Send draft MUST expose editable To, Subject, and Body before confirm
- **FR-003**: The system MUST NOT auto-send any outbound guest or staff message on classify, draft, approve, enqueue, page load, or cron
- **FR-004**: staff_ops daily brief items MUST remain copy-only (no Send control, no outbound send on approve)
- **FR-005**: Email Send MUST use the already-configured GuestFlow mailbox identity and secret; staff MUST NOT be asked to type a new From address
- **FR-006**: Each Email Send attempt MUST write an audit record with at least status, recipient, provider message id (when present), and timestamp
- **FR-007**: Inbound mailbox events MUST create or update a GuestFlow thread and inbound message with source email (or email-forward)
- **FR-008**: Inbound email intake MUST reject unauthenticated posts and MUST reuse the existing classifier / approval queue when a draft is appropriate
- **FR-009**: WhatsApp Web Send MUST create a durable send job (queued) only after human confirm, and MUST return the job id
- **FR-010**: WhatsApp Web Send MUST NEVER report success to staff unless the clicker has reported delivered or sent via the job complete path
- **FR-011**: The WhatsApp Web staff UI MUST be labelled **Interim · WhatsApp Web** and MUST show fail-closed error state for failed or blocked jobs
- **FR-012**: The clicker MUST be able to list queued jobs, claim a job, and complete it as sent, failed, or blocked, using a shared bridge secret (not a staff browser cookie)
- **FR-013**: GuestFlow MUST accept inbound posts in the existing inbound shape with source WhatsApp Web
- **FR-014**: The system MUST NOT enable live Twilio WhatsApp, Cloud API number buy, SMS vendors, or convert/port the existing guest WhatsApp number
- **FR-015**: Scope is Browns Dullstroom GuestFlow only — no retail or SaaS multi-tenant expansion

### Key Entities

- **Guest thread**: A conversation with a guest, already used for inbound WhatsApp; may now also be sourced from email or WhatsApp Web
- **Inbound message**: A single inbound or outbound line on a thread, with draft reply when classified
- **Email send attempt**: An audited outbound email (recipient, subject optional in audit, status, provider id, timestamp)
- **Send job**: A durable WhatsApp Web (or email, if queued) work item with status pending, queued, claimed, sent, failed, or blocked
- **Bridge clicker**: The CoS Chrome WhatsApp Web operator that claims jobs and reports completion
- **staff_ops brief**: Copy-only daily brief approval item; out of send scope

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Grant can finish a typical 07:00 guest-email reply (open thread → edit → confirm Send) in under 2 minutes without leaving GuestFlow for Gmail compose
- **SC-002**: 100% of outbound guest emails and WhatsApp Web jobs in this feature require an explicit Send click plus confirm; zero sends occur from approve-only or background jobs
- **SC-003**: After a labelled inbound-email sample of at least 3 messages, every authentic message appears as a GuestFlow thread within one refresh of the inbound queue
- **SC-004**: In 100% of WhatsApp Web Sends, the staff UI does not show success until the clicker reports sent or delivered
- **SC-005**: staff_ops items on Needs Approval remain copy-only for every sample in the existing daily-brief suite (no Send control, no outbound call)
- **SC-006**: A morning operator can follow a written one-page checklist (email Send, inbound email path, WhatsApp Web queue, clicker contract, staff_ops copy-only) without inventing mailbox addresses or buying a phone number

## Assumptions

- Production already has the GuestFlow mailbox secret and from-address; this feature reuses them and does not invent new identities
- Inbound mailbox domain / webhook pointing at Production may still need a human dashboard step; coding documents the URL and secret name
- The existing inbound classifier and approval queue are reused; no new AI model is required
- WhatsApp Web is interim only until a later, separately approved live-number decision
- staff_ops copy-only behaviour shipped in PR #189 stays unchanged
- Turso remains the production store; local SQLite remains the dev store
- Browns Dullstroom is the only tenant in scope
- Time zones: household decisions America/Chicago; SA operations Africa/Johannesburg

## Out of Scope

- Twilio ZA number buy, KYC edits, Meta Cloud WhatsApp live, SMSPortal/BulkSMS, Android SMS gateway
- Changing staff_ops to Send
- Afrihost / www SEO
- Auto-send of any guest or staff message
- Inventing rates, legal advice, or tax positions in drafts
