# Feature Specification: Sprint 2 Delivery Status + Resend

**Feature Branch**: `cursor/sprint2-delivery-status-2304`

**Created**: 2026-09-25

**Status**: Ready for planning

**Input**: Queued CA #6 / Grant voice via GFM (24 Sep 18:28 CT). Store provider receipts, show bubble delivery states, poll when callbacks are missing, and let staff resend failed or stuck outbound messages with the same human Approve&Send + confirmToken gate. Parallel Sprint 2 PRs stay separate: user-mgmt #215, data fixes, contacts, WhatsApp 24h/templates, alerts, mobile.

## Clarifications

### Session 2026-09-25

Locked from the attached brief. No guest PII, rates, or live sends were invented.

- Q: Does resend skip Approve&Send? → A: No. Resend is a human action: confirm dialog + a **fresh** one-time confirmToken. No auto-send. Cron does not send.
- Q: What happens if the WhatsApp 24-hour window is closed? → A: Resend still runs the window guard. If the window is closed, offer a matching approved template. This package codes against a small interface (`getWindowState`, `findApprovedTemplateFor`) until the WhatsApp PR lands.
- Q: Who is recorded as pressing Resend? → A: The current staff identity helper. After user-mgmt #215 merges, that helper becomes the signed-in user email.
- Q: Do redirect-mode callbacks attach to a new message? → A: No. They map back to the original outbound message and are labelled “sent to test sink”.
- Q: Is the schema migration applied here? → A: Included in the repo, **not run** against Production Turso. No Production writes. No deploy. No live sends.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See whether the guest got the message (Priority: P1)

Staff open a booking thread and read each outbound bubble’s delivery state: **Pending** (queued / sent / accepted), **Delivered** (delivered, and **read** when the provider reports it), or **Failed** (failed / undelivered / bounced / complained) with the provider error in plain words (for example “outside 24h window” or “invalid number”).

**Why this priority**: Today staff cannot tell if Approve&Send actually reached the guest. That is the ritual this package removes.

**Independent Test**: Fixture an outbound message, apply a delivered receipt, then a failed receipt on another message. Confirm the bubbles show Delivered and Failed with a plain-language error. Confirm a “read” receipt still shows the Delivered bubble and indicates read.

**Acceptance Scenarios**:

1. **Given** an outbound message just accepted by the provider, **When** staff view the thread, **Then** the bubble shows Pending
2. **Given** a delivered receipt (and optionally a read receipt), **When** staff view the bubble, **Then** it shows Delivered and shows read when that receipt exists
3. **Given** a failed / undelivered / bounced / complained receipt, **When** staff view the bubble, **Then** it shows Failed and a plain-language reason
4. **Given** receipts arriving out of order (for example delivered then a late “sent”), **When** status is applied, **Then** the bubble does not regress to a weaker state

---

### User Story 2 - Trust only verified receipts (Priority: P1)

Every outbound stores the provider message id (Twilio SID, Resend email id). The system accepts Twilio StatusCallback only when the signature verifies, and Resend delivery webhooks only when the shared secret verifies. Redirect-mode receipts still update the original message and are labelled “sent to test sink”.

**Why this priority**: Unverified callbacks must not rewrite guest history. Redirect testing must not look like a second guest message.

**Independent Test**: Post a valid signed Twilio status and a valid secret Resend event and confirm the original message updates. Post the same payloads with a bad signature / secret and confirm 401 and no status change.

**Acceptance Scenarios**:

1. **Given** a signed Twilio StatusCallback for a stored SID, **When** it is received, **Then** that outbound’s status updates
2. **Given** a StatusCallback with a missing or invalid signature, **When** it is received, **Then** it is rejected and no message changes
3. **Given** a Resend delivery event with a valid webhook secret, **When** it is received, **Then** the matching outbound updates
4. **Given** a Resend event with an invalid secret, **When** it is received, **Then** it is rejected
5. **Given** redirect mode, **When** a callback arrives for the sink send, **Then** it maps to the original outbound and the bubble is labelled “sent to test sink”

---

### User Story 3 - Notice stuck sends and recover without guessing (Priority: P1)

If no callback arrives, the system polls the provider after 10 minutes. If a message is still Pending after 15 minutes (configurable), it is **stuck**. Failed or stuck messages mark the thread **Needs attention**. Staff can **Resend** a Failed or stuck-Pending message: same content, no re-draft, confirm dialog, fresh confirmToken. Redirect still applies. The 24-hour window guard still applies (closed window → offer the matching approved template). Stuck-pending resend warns that a duplicate may arrive. Only one resend is in flight per message. The new outbound links `resend_of` the original and records who pressed Resend.

**Why this priority**: This is the recovery path. Without it, staff copy-paste the same reply into WhatsApp/Gmail and lose the audit trail.

**Independent Test**: Mark a message pending older than the stuck threshold and confirm Needs attention + Resend. Confirm a second resend while one is in flight is rejected. Confirm a reused confirmToken does not send. Confirm a closed window stub offers a template and does not send.

**Acceptance Scenarios**:

1. **Given** an outbound still Pending with no callback after 10 minutes, **When** the poll runs, **Then** the system asks the provider for current status and applies the same mapping rules
2. **Given** an outbound still Pending after 15 minutes (config), **When** staff view the thread, **Then** it is treated as stuck, Resend is offered, and Needs attention is set
3. **Given** a Failed or stuck outbound, **When** staff confirm Resend and supply a fresh confirmToken, **Then** the same content is sent as a new outbound linked to the original, and the presser is recorded
4. **Given** a stuck-Pending resend, **When** the confirm dialog appears, **Then** it warns a duplicate may be delivered
5. **Given** a resend already in flight for that message, **When** staff press Resend again, **Then** the second attempt is rejected
6. **Given** a reused or missing confirmToken, **When** resend is requested, **Then** nothing is sent
7. **Given** a closed 24-hour window from the window interface, **When** staff resend on WhatsApp, **Then** the matching approved template is offered and free-form resend does not send
8. **Given** redirect mode, **When** a resend is approved, **Then** the sink still receives it and later callbacks still map to the original attempt they belong to

---

### Edge Cases

- Late “queued/sent” after “delivered” or “failed” must not regress the bubble
- “read” after “delivered” upgrades the Delivered bubble to show read; “delivered” after “read” must not hide read
- Unknown provider error codes fall back to a safe plain phrase, never a raw secret or guest PII dump
- Callback for an unknown provider id is acknowledged without creating a new guest thread
- Polling must not send, invent a new provider id, or rewrite message body
- WhatsApp Web queued jobs are out of this package’s live callback path; they stay queued/sent/failed via the existing bridge
- From identity stays `+27600200825` for Cloud WhatsApp; redirect never changes From
- Resend does not re-open a draft editor or require a second Approve of different copy

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store the provider message id (Twilio SID or Resend email id) on every successful outbound accept
- **FR-002**: System MUST accept Twilio StatusCallback only after signature verification
- **FR-003**: System MUST accept Resend delivery webhooks only after secret verification
- **FR-004**: System MUST map provider statuses to bubbles: Pending (queued/sent/accepted), Delivered (delivered/read, showing read when available), Failed (failed/undelivered/bounced/complained)
- **FR-005**: System MUST translate common provider errors into plain words (at least “outside 24h window” and “invalid number”)
- **FR-006**: System MUST ignore out-of-order status updates that would weaken a stronger bubble state
- **FR-007**: System MUST poll the provider for any outbound still lacking a callback after 10 minutes
- **FR-008**: System MUST treat Pending older than 15 minutes (configurable) as stuck
- **FR-009**: System MUST set Needs attention on a thread when any outbound is Failed or stuck
- **FR-010**: Staff MUST be able to Resend a Failed or stuck-Pending outbound with the same content, a confirm dialog, and a fresh confirmToken
- **FR-011**: Resend MUST keep redirect-mode sinks and the 24-hour window guard; a closed window MUST offer a matching approved template instead of sending free-form copy
- **FR-012**: System MUST allow only one resend in flight per original message and MUST link the new outbound as `resend_of` the original
- **FR-013**: System MUST record which staff identity pressed Resend (current staff helper; becomes user email after #215)
- **FR-014**: Redirect-mode callbacks MUST update the original outbound and MUST be labelled “sent to test sink”
- **FR-015**: System MUST expose an `onSendFailed` hook for the alerts package without sending alerts in this package
- **FR-016**: Approve&Send, one-time confirmToken, no auto-send, and Cloud From `+27600200825` MUST remain unchanged
- **FR-017**: 24-hour window and template lookup MUST go through a small interface so the WhatsApp PR can be wired later

### Key Entities

- **Outbound message**: A staff-approved send already stored on a thread; gains provider id, delivery state, optional read flag, plain error, test-sink label, and resend linkage
- **Provider receipt**: A verified Twilio or Resend status event (or a poll result) that updates one outbound
- **Resend attempt**: A new outbound with the same body, a fresh confirmToken, a pointer to the original, and the staff identity who pressed Resend
- **Window / template ports**: Read-only interfaces for “is the 24h window open?” and “which approved template matches?” — implemented here as stubs until the WhatsApp package lands

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can tell Pending vs Delivered vs Failed on an outbound bubble in one glance, without opening Twilio or Resend
- **SC-002**: 100% of verified receipts update the matching outbound; 100% of unsigned / secret-invalid receipts are rejected
- **SC-003**: A message still Pending after the configured 15-minute threshold is offered as Resend and flags Needs attention
- **SC-004**: A resend without a fresh confirmToken sends zero messages
- **SC-005**: A second resend while one is in flight is rejected
- **SC-006**: Closed-window resend offers a template and does not send free-form copy
- **SC-007**: Staff stop checking provider consoles to guess whether yesterday’s guest reply arrived — that ritual is replaced by in-thread bubbles + Resend

## Assumptions

- Official WhatsApp Cloud From remains `+27600200825`; personal `+27836458313` stays observe-only
- `OUTBOUND_MODE=redirect` stays on until a separate go-live CLEAR; this package does not flip live mode
- The WhatsApp PR will own the real 24h clock and approved-template catalogue; this package only defines the ports
- User-mgmt #215 will replace the staff identity helper with user email; this package records whatever the helper returns today
- The alerts PR will subscribe to `onSendFailed`; this package does not send staff email
- WhatsApp Web clicker jobs remain a separate completion path
- Schema migration is committed but not applied to Production Turso in this package
- No live guest, bank, or attorney send is performed by the implementing agent
