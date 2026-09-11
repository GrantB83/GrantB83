# Feature Specification: WhatsApp Approve & Send for Inbound Queue

**Feature Branch**: `cursor/whatsapp-approve-send-9a84`

**Created**: 2026-09-11

**Status**: Draft

**Input**: Wire Ops Hub inbound-queue so staff can Approve & Send the drafted reply over WhatsApp using the existing send path (src/lib/whatsapp.ts / Twilio provider), with human-gated send only (never auto-send).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff Reviews and Sends Draft Reply (Priority: P1)

An Ops Hub staff member receives a booking inquiry via WhatsApp. The system has already classified the message and generated a draft reply. The staff member reviews the queue, reads the draft, approves it, and sends it via WhatsApp with a single click.

**Why this priority**: This is the core value proposition - enabling staff to send approved replies quickly and safely through WhatsApp without manual copy/paste. This is the MVP that delivers immediate operational value.

**Independent Test**: Can be fully tested by creating a test inbound message, navigating to /ops/inbound-queue, clicking a thread, reviewing the draft reply, clicking "Send via WhatsApp", confirming the action, and verifying the message is sent (in sandbox mode, verifying a dry-run log entry is created; in live mode, verifying the WhatsApp API call succeeded).

**Acceptance Scenarios**:

1. **Given** a thread with status "drafted" and a valid draft reply, **When** staff clicks "Send via WhatsApp" and confirms, **Then** the message is sent via WhatsApp using the configured provider, the thread status updates to "sent", and the outbound message is persisted in the database
2. **Given** WHATSAPP_MODE=sandbox, **When** staff sends a message, **Then** a dry-run log entry is created without calling the live API, and the UI shows "Sandbox Mode: Message logged but not sent"
3. **Given** a send fails (e.g., API error), **When** staff attempts to send, **Then** the thread status updates to "failed", the error is persisted, and the staff sees a clear error message with retry option
4. **Given** a thread already has status "sent", **When** staff views the thread, **Then** the "Send via WhatsApp" button is replaced with "Resend" or disabled with a "Sent" badge

---

### User Story 2 - View Send History and Outcomes (Priority: P2)

Staff needs to verify whether a message was successfully sent and troubleshoot failures. They can view the send history, timestamp, provider used, and any error details for each thread.

**Why this priority**: Essential for operational transparency and debugging, but can be manually checked via logs initially. Not blocking for basic send functionality.

**Independent Test**: Can be tested by sending multiple messages (including intentional failures in sandbox mode), then viewing thread details and verifying send history, timestamps, providers, and error messages are displayed correctly.

**Acceptance Scenarios**:

1. **Given** a thread has been sent successfully, **When** staff opens the thread detail, **Then** they see "Sent via [provider] at [timestamp]" with message ID
2. **Given** a send failed with an error, **When** staff opens the thread detail, **Then** they see "Send failed: [error message]" with a "Retry" button
3. **Given** multiple send attempts (e.g., initial failure, then retry success), **When** staff views the thread, **Then** the send history shows all attempts in chronological order

---

### User Story 3 - Bulk Status Updates After Sends (Priority: P3)

After sending multiple replies, staff can mark threads as "closed" in bulk to keep the queue clean, or filter by "sent" status to review recently sent messages.

**Why this priority**: Quality-of-life improvement for queue management. Not critical for initial launch.

**Independent Test**: Can be tested by sending multiple replies, then using bulk selection and status update features to mark threads as closed or filter by status.

**Acceptance Scenarios**:

1. **Given** multiple threads with status "sent", **When** staff selects them and clicks "Bulk Close", **Then** all selected threads update to status "closed"
2. **Given** staff needs to review sent messages, **When** they filter by status "sent", **Then** only threads with sent status are displayed

---

### Edge Cases

- What happens when the WhatsApp API is unreachable or returns a 5xx error?
- How does the system handle rate limiting from the WhatsApp provider?
- What happens if staff clicks "Send" multiple times rapidly (double-click prevention)?
- How does the system handle messages that exceed WhatsApp's character limit?
- What happens when Twilio credentials expire or are invalid?
- How does the system distinguish between sandbox and live modes in the UI?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Send via WhatsApp" button in the inbound queue thread detail view for threads with status "drafted"
- **FR-002**: System MUST show a confirmation dialog before sending, displaying the recipient phone number, draft message preview, and current WHATSAPP_MODE (sandbox/live)
- **FR-003**: System MUST call the existing `sendWhatsAppMessage()` function from `src/lib/whatsapp.ts` when staff confirms send
- **FR-004**: System MUST persist the outbound message in the `inbound_messages` table with direction="outbound", including message text, timestamp, provider, and send outcome
- **FR-005**: System MUST update thread status to "sent" on successful send, or "failed" on error
- **FR-006**: System MUST prevent double-sends by disabling the send button after click until the API call completes or fails
- **FR-007**: System MUST display the send outcome (success, sandbox dry-run, or error) clearly in the UI after the send attempt
- **FR-008**: System MUST respect WHATSAPP_MODE=sandbox and log dry-run attempts without calling the live API
- **FR-009**: System MUST store error details (error message, timestamp, provider) for failed sends to enable debugging
- **FR-010**: System MUST show send history and outcomes in the thread detail view, including all send attempts, timestamps, providers, and message IDs or error messages
- **FR-011**: System MUST validate that the draft reply is non-empty before enabling the "Send via WhatsApp" button
- **FR-012**: System MUST log all send attempts (including sandbox dry-runs) with recipient, timestamp, provider, outcome, and message ID (when available) for audit trail

### Key Entities

- **Outbound Message**: An outbound reply sent via WhatsApp, stored in `inbound_messages` table with direction="outbound". Attributes: message_text, recipient phone number, send timestamp, provider (meta/twilio/sandbox), message ID (from provider), send outcome (success/failed), error message (if failed).
- **Send History**: A chronological list of all send attempts for a thread, including retries. Displayed in thread detail view. Each entry includes: timestamp, provider, outcome, message ID or error.
- **Thread Status**: Extended to include "sent" and "failed" statuses. "sent" = at least one successful send. "failed" = latest send attempt failed (but can be retried).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can send a WhatsApp reply in under 10 seconds from opening the thread to clicking confirm (excluding API call time)
- **SC-002**: 100% of send attempts are persisted in the database with full audit trail (timestamp, provider, outcome, message ID or error)
- **SC-003**: Sandbox mode logs all dry-run attempts without ever calling the live WhatsApp API
- **SC-004**: Failed sends display clear error messages to staff with a retry option, and error rate is logged for monitoring
- **SC-005**: Double-send prevention ensures no message is sent twice even if staff clicks the button multiple times rapidly

## Assumptions

- Existing authentication and authorization for `/ops/inbound-queue` is sufficient (staff already have access)
- The `sendWhatsAppMessage()` function in `src/lib/whatsapp.ts` is stable and handles sandbox/live modes correctly
- The `inbound_messages` table schema supports a "direction" field (or can be extended to add "outbound" messages)
- Staff are trained to review draft messages before sending and understand the difference between sandbox and live modes
- The existing WHATSAPP_MODE environment variable controls sandbox vs live behavior globally
- Rate limiting and retry logic for the WhatsApp API is handled by the provider (Twilio/Meta) or will be added as a future enhancement
- Character limit validation for WhatsApp messages (currently 4096 characters for Meta, varies for Twilio) will be added as a follow-up if needed
- The existing database migration script can be extended to add the "direction" column if it doesn't already exist
