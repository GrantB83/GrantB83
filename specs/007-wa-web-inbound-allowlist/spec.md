# Feature Specification: WhatsApp Web Inbound Allowlist Bridge

**Feature Branch**: `cursor/wa-web-inbound-allowlist-b93e`

**Created**: 2026-09-20

**Status**: Draft

**Input**: Implement personal WhatsApp Web → inbound bridge with fail-closed allowlist gate, metadata-only storage, deduplication with existing Twilio threads, and triage queue for unknown senders. Optional: remove noreply email fallback for stay@ readiness.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Known Guest Message Ingestion (Priority: P1)

When a known guest (already in guest_contacts, has a booking, or has an open Twilio thread) sends a message to the personal WhatsApp number (+27836458313), the system must ingest it as metadata-only into GuestFlow and merge it with any existing Twilio thread for that contact.

**Why this priority**: Core requirement for Browns-only WhatsApp bridge. Ensures only verified guests can interact via personal WhatsApp while maintaining Twilio as the canonical outbound channel.

**Independent Test**: Can be fully tested by posting a webhook payload with `source=whatsapp_web` for a known guest phone number and verifying the metadata is stored without creating duplicate threads.

**Acceptance Scenarios**:

1. **Given** a guest exists in `guest_contacts` table, **When** a WhatsApp Web message arrives from that guest's E.164 phone number, **Then** the system stores message metadata and associates it with the guest
2. **Given** a guest has an active booking, **When** a WhatsApp Web message arrives from that guest's phone number, **Then** the system ingests the message metadata
3. **Given** an open Twilio thread exists for a phone number, **When** a WhatsApp Web message arrives from that same number, **Then** the system merges it into the existing thread (no duplicate thread created)
4. **Given** a known guest message is received, **When** staff views the thread, **Then** the message appears with metadata indicating it came from `whatsapp_web` source and was observed on `+27836458313`

---

### User Story 2 - Unknown Sender Triage Queue (Priority: P1)

When a message arrives from an unknown sender (not in guest_contacts, no booking, no open Twilio thread), the system must route it to a triage queue for staff review rather than auto-creating a guest record.

**Why this priority**: Critical security requirement. Prevents unauthorized contacts from entering the guest database. Maintains fail-closed approach for Browns-only communication.

**Independent Test**: Can be tested by posting webhook payload from an unknown phone number and verifying no guest record is created, but the message appears in triage queue with retention=0 flag.

**Acceptance Scenarios**:

1. **Given** a phone number not in any allowlist, **When** a WhatsApp Web message arrives from that number, **Then** the system does NOT create a guest record
2. **Given** an unknown sender message, **When** the system processes it, **Then** it appears in a triage queue for staff review
3. **Given** a triaged unknown sender, **When** staff reviews the message, **Then** they can manually approve or reject the sender
4. **Given** an unknown sender message, **When** stored, **Then** it is marked with retention=0 (no persistent guest row)

---

### User Story 3 - Metadata-Only Message Storage (Priority: P1)

All WhatsApp Web messages must be stored as metadata-only (external message ID, timestamp, sender info, observation metadata) with NO full message bodies persisted in the database.

**Why this priority**: Vault requirement for personal WhatsApp bridge. Minimizes PII storage and maintains compliance with data retention policies.

**Independent Test**: Can be tested by attempting to send a payload with message body content and verifying the body is either stripped or the request is rejected.

**Acceptance Scenarios**:

1. **Given** a webhook payload with a message body field, **When** `source=whatsapp_web`, **Then** the body content is stripped before storage
2. **Given** a stored WhatsApp Web message, **When** queried from database, **Then** only metadata fields (externalMessageId, timestamp, source, observedOn) are present
3. **Given** staff views a WhatsApp Web message, **When** displayed in UI, **Then** the interface shows metadata/link reference only, not full body
4. **Given** test fixtures for WhatsApp Web, **When** created, **Then** they use redacted stubs only, not real message content

---

### User Story 4 - Webhook Security and Reuse (Priority: P2)

The existing `/api/inbound/webhook` endpoint must accept WhatsApp Web messages using the same `INBOUND_WEBHOOK_SECRET` authentication, with required `source=whatsapp_web` and `externalMessageId` fields, plus metadata indicating `observedOn=+27836458313`.

**Why this priority**: Maintains single secure ingestion point. Avoids proliferation of webhook endpoints and secrets.

**Independent Test**: Can be tested by sending authenticated and unauthenticated requests with `source=whatsapp_web` and verifying auth enforcement and proper field validation.

**Acceptance Scenarios**:

1. **Given** the existing webhook endpoint, **When** a request arrives with `source=whatsapp_web`, **Then** it processes using the same authentication as Twilio webhooks
2. **Given** a WhatsApp Web webhook request, **When** missing required `externalMessageId`, **Then** the request is rejected with validation error
3. **Given** a WhatsApp Web webhook request, **When** missing `source=whatsapp_web`, **Then** it does not trigger WhatsApp Web-specific handling
4. **Given** an authenticated webhook request, **When** `source=whatsapp_web`, **Then** metadata includes `observedOn=+27836458313`

---

### User Story 5 - Remove Noreply Email Fallback (Priority: P3)

When `RESEND_FROM_EMAIL` environment variable is not set, the system should fail closed rather than falling back to `noreply@guestflow.thebrowns.co.za`, ensuring stay@ configuration is intentional.

**Why this priority**: Optional hardening for stay@ readiness. Prevents accidental use of wrong sender address before Resend domain verification completes.

**Independent Test**: Can be tested by removing `RESEND_FROM_EMAIL` from environment and verifying email send operations fail with clear error rather than using noreply fallback.

**Acceptance Scenarios**:

1. **Given** `RESEND_FROM_EMAIL` is not set, **When** system attempts to send email, **Then** operation fails with configuration error
2. **Given** noreply fallback code exists, **When** this feature is implemented, **Then** the fallback is removed from codebase
3. **Given** updated documentation, **When** developers read email configuration docs, **Then** noreply fallback is not mentioned

---

### Edge Cases

- What happens when a phone number cannot be normalized to E.164 format?
- How does the system handle duplicate `externalMessageId` values (replay attacks)?
- What happens when an open Twilio thread exists but the guest is deleted from `guest_contacts`?
- How does deduplication work when multiple Twilio threads exist for the same phone number?
- What happens when the webhook payload includes both `source=whatsapp_web` and Twilio-specific fields?
- How are messages handled during the SAST time window (07:00-21:00) vs outside it?
- What happens when a guest has both a booking and a guest_contacts entry?

## Requirements *(mandatory)*

### Functional Requirements

#### Allowlist Gate (P1)

- **FR-001**: System MUST normalize all incoming `from` phone numbers to E.164 format before allowlist checking
- **FR-002**: System MUST check if sender phone number exists in `guest_contacts` table before allowing ingestion
- **FR-003**: System MUST check if sender phone number has an active booking before allowing ingestion
- **FR-004**: System MUST check if sender phone number has an open Twilio inbound thread before allowing ingestion
- **FR-005**: System MUST reject messages from senders not matching any allowlist criteria (guest_contacts, bookings, or open Twilio threads)
- **FR-006**: Unknown sender messages MUST route to triage queue with retention=0 flag (no persistent guest record)

#### Webhook Integration (P1)

- **FR-007**: System MUST accept WhatsApp Web messages at existing `/api/inbound/webhook` endpoint
- **FR-008**: System MUST require `source=whatsapp_web` field for WhatsApp Web messages
- **FR-009**: System MUST require `externalMessageId` field for WhatsApp Web messages
- **FR-010**: System MUST accept metadata field `observedOn=+27836458313` indicating source number
- **FR-011**: System MUST enforce same `INBOUND_WEBHOOK_SECRET` authentication for WhatsApp Web as for Twilio webhooks
- **FR-012**: System MUST NOT create a second webhook endpoint or secret for WhatsApp Web ingestion

#### Metadata-Only Storage (P1)

- **FR-013**: System MUST strip or reject message body fields when `source=whatsapp_web`
- **FR-014**: System MUST store only metadata: externalMessageId, timestamp, source, observedOn, sender phone
- **FR-015**: System MUST NOT persist full message bodies for WhatsApp Web source in Turso database
- **FR-016**: Test fixtures MUST use redacted stubs only for message content, not real PII

#### Deduplication (P1)

- **FR-017**: When an open Twilio thread exists for sender phone number, system MUST merge WhatsApp Web message into that thread
- **FR-018**: System MUST NOT create duplicate threads for same sender when Twilio thread exists
- **FR-019**: Twilio (+27600200825) MUST remain the canonical outbound sender (never change to +27836458313)
- **FR-020**: Personal WhatsApp path MUST function as shadow/secondary inbound channel only

#### Triage Queue (P2)

- **FR-021**: System MUST provide staff UI to view messages from unknown senders
- **FR-022**: System MUST allow staff to manually approve or reject unknown senders
- **FR-023**: Unknown sender messages MUST NOT trigger automatic guest record creation
- **FR-024**: Triage queue MUST show message metadata (phone, timestamp, external ID) without full bodies

#### Email Fallback Removal (P3)

- **FR-025**: System MUST remove `noreply@guestflow.thebrowns.co.za` fallback from contact/email code paths
- **FR-026**: When `RESEND_FROM_EMAIL` is not set, email operations MUST fail closed with configuration error
- **FR-027**: Documentation MUST be updated to remove noreply fallback references

### Key Entities *(include if feature involves data)*

- **WhatsApp Web Message**: External message ID, timestamp, source indicator, observed-on phone number, sender phone (E.164), message type/status metadata
- **Guest Contact**: Existing entity - phone number (E.164), guest details, retention flag
- **Booking**: Existing entity - guest associations, check-in/check-out dates, status
- **Twilio Thread**: Existing entity - conversation thread, participant phone numbers, open/closed status
- **Triage Queue Entry**: Unknown sender message metadata, review status, staff actions (approve/reject)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System successfully ingests WhatsApp Web messages from known guests (in guest_contacts, has booking, or open Twilio thread) within 2 seconds of webhook receipt
- **SC-002**: System rejects 100% of messages from senders not in allowlist (no auto-created guests from WhatsApp-only contacts)
- **SC-003**: Zero full message bodies are stored in database for `source=whatsapp_web` messages (metadata-only enforcement)
- **SC-004**: When Twilio thread exists for sender, 100% of WhatsApp Web messages merge into existing thread (zero duplicate threads)
- **SC-005**: `npm run build` completes successfully in `apps/guestflow` with zero errors
- **SC-006**: All focused unit tests pass: allowlist validation, metadata-only strip, unknown→triage routing, webhook auth
- **SC-007**: When `RESEND_FROM_EMAIL` is not set, email send operations fail with clear error (no silent fallback to noreply@)

## Assumptions

- Existing `/api/inbound/webhook` endpoint and authentication mechanism are stable and tested
- Phone number normalization to E.164 format is available via existing utilities (likely `src/lib/phone.ts`)
- Turso database schema can be extended with migration consistent with Phase 0 patterns
- Middleware already skips auth for `/api/inbound/webhook` endpoint
- Test infrastructure supports focused unit tests without requiring full integration test suite
- Twilio thread detection can query existing Turso tables
- Staff triage UI can be minimal (table view with approve/reject buttons) for initial implementation
- WhatsApp Web observer/scraper (CoS computerUse) is out of scope - this feature handles ingestion only
- No conversion of +27836458313 to Cloud API or Twilio - this remains CoS WhatsApp Web session only
- No changes to Twilio outbound sender (+27600200825) - personal WhatsApp is inbound-only bridge
- Production environment variable setting and Resend DNS verification are operations tasks outside this PR
