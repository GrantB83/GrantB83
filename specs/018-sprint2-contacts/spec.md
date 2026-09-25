# Feature Specification: Sprint 2 Contact Details

**Feature Branch**: `cursor/sprint2-contacts-1336`

**Created**: 2026-09-25

**Status**: Draft

**Input**: GuestFlow Sprint 2 item E. Persist guest phone and email from layered Nightsbridge sources with per-field provenance, flag OTA relay emails, fill withheld contacts via staff and guest self-fill (no sends), and keep one booker thread plus one contact set for a multi-room booking.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arrivals & Departures is the contact source of record (Priority: P1)

When staff upload the Nightsbridge Arrivals & Departures export, GuestFlow stores the guest phone and email on that booking and on the shared guest contact record. Booking.com relay mailboxes (and the other listed OTA relays) are marked as relay, not as a direct email. Empty cells stay empty.

**Why this priority**: Outreach and WhatsApp matching fail when email is dropped or when a relay address is treated as a personal inbox. A&D is the richest self-serve structured source.

**Independent Test**: Parse a synthetic A&D arrival row with phone plus email (including a `@guest.booking.com` address) and confirm the booking and guest contact store both values, with the email flagged as relay.

**Acceptance Scenarios**:

1. **Given** an A&D arrival row with a phone and a direct email, **When** the file is ingested, **Then** the booking stores both fields and a guest contact is created even if only one of the two is present
2. **Given** an A&D arrival row whose email is a Booking.com relay, **When** the file is ingested, **Then** the email is stored and marked relay rather than treated as a direct address
3. **Given** an A&D arrival row with empty phone and empty email, **When** the file is ingested, **Then** no contact value is invented
4. **Given** a BLOCK row, **When** the file is ingested, **Then** it is not treated as a guest contact gap

---

### User Story 2 - Client report fills gaps only (Priority: P2)

Staff can import a Nightsbridge Client report. It fills phone or email only when that field is still empty on the booking. It never overwrites an A&D value. Every filled field records Client-report provenance.

**Why this priority**: In-house or edited client records can supply a missing field after A&D, but must not clobber the source of record.

**Independent Test**: Apply a Client-report row to a booking that already has an A&D email and a missing phone; only the phone is filled, with Client-report provenance.

**Acceptance Scenarios**:

1. **Given** a booking with an A&D email and no phone, **When** a Client report supplies both, **Then** only the phone is written and the email is unchanged
2. **Given** a booking with no contacts, **When** a Client report supplies a valid phone and email, **Then** both are stored with Client-report provenance
3. **Given** a Client report cell that is empty or invalid, **When** imported, **Then** existing values are left alone and nothing is invented

---

### User Story 3 - stay@ inbound captures sender email for speed (Priority: P2)

When a guest email lands on stay@ and can be matched to a booking by name, booking reference, and/or stay dates, the sender address is stored as a contact with stay@ provenance. A direct A&D email is never overwritten. A stay@ value may stand in only when that field is still empty (or is only a relay and the sender is a direct address).

**Why this priority**: Booking-notification and guest mail arrive minutes after a booking, before the next A&D drop.

**Independent Test**: Match a synthetic stay@ message to a booking by reference and dates; confirm the sender is stored when the booking has no direct email, and is ignored when a direct A&D email already exists.

**Acceptance Scenarios**:

1. **Given** a stay@ message whose body or subject contains a booking reference and dates that uniquely match one booking with no email, **When** the inbound is processed, **Then** the sender email is stored with stay@ provenance
2. **Given** a booking that already has a direct A&D email, **When** a matching stay@ message arrives, **Then** the A&D email is unchanged
3. **Given** a stay@ message that does not uniquely match a booking, **When** processed, **Then** no contact is written from a guess

---

### User Story 4 - Staff entry and guest self-fill for withheld contacts (Priority: P2)

When Nightsbridge never received a usable contact, staff can enter a phone or email on the booking or conversation thread. A guest can submit the same fields on the guest portal. Both paths validate input, record provenance (`staff` or `guest`), and never send a message.

**Why this priority**: OTA-withheld contacts cannot be recovered from Nightsbridge. Staff and guest are the only remaining fill.

**Independent Test**: Reject invalid phone/email on both forms; accept valid values and persist them with the correct provenance without sending.

**Acceptance Scenarios**:

1. **Given** a booking with a missing phone, **When** staff submit a valid South African mobile on the booking or thread form, **Then** the phone is stored with staff provenance and no message is sent
2. **Given** a valid guest portal link, **When** the guest submits a valid email and phone, **Then** those fields are stored with guest provenance if they do not overwrite a higher-rank source
3. **Given** invalid input (empty, malformed email, unparseable phone), **When** either form is submitted, **Then** the save is rejected and existing contacts are unchanged

---

### User Story 5 - Multi-room booking keeps one thread and one contact set (Priority: P1)

A single Nightsbridge booking that occupies more than one room (fixture booking 5667: Garden and Cove) must remain one booking, one booker conversation thread, and one contact set. Extra rooms are recorded on the booking. Contacts and threads are neither duplicated nor dropped.

**Why this priority**: First-occurrence dedupe currently keeps one room and drops the other. That is a stay-ops defect even when the contact columns happen to match.

**Independent Test**: Ingest the 5667 two-room fixture and resolve the booker thread; expect one booking, both rooms listed, one thread, and one contact set.

**Acceptance Scenarios**:

1. **Given** an A&D file with two arrival rows sharing booking ID 5667 and different rooms, **When** ingested, **Then** GuestFlow stores one booking that lists both rooms
2. **Given** that booking, **When** a booker conversation is resolved, **Then** there is exactly one booking-kind thread
3. **Given** the same contacts on both room rows, **When** ingested, **Then** guest contacts are not duplicated

---

### Edge Cases

- Email-only A&D rows (no phone) still create a guest contact
- Phone-only A&D rows still create a guest contact
- Secondary Phone Number 2 / Email 2 fill a field only when the primary cell is empty
- Relay email is stored and flagged; it is usable for OTA email outreach but is not a direct CRM email
- Intermediary office mailboxes (LekkeSlaap/TravelGround generics) are not treated as guest-direct
- BLOCK / house-block rows never invent guest contacts
- Ambiguous stay@ matches (two bookings, same name, overlapping dates) write nothing
- Staff and guest values never overwrite a stored A&D value; A&D may refresh its own fields
- Guest self-fill cannot overwrite staff or A&D
- Client report and stay@ cannot overwrite staff, guest, or A&D
- Unparseable phones stay empty (fail closed; never invent PII)
- Redirect remains ON; Approve&Send stays a human click; no auto-send

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Arrivals & Departures ingest MUST persist guest phone and guest email onto the booking and onto `guest_contacts` whenever either value is present
- **FR-002**: The system MUST classify known OTA relay domains (including `@guest.booking.com` and the other domains listed in the research SoR) as relay on the email field
- **FR-003**: A&D MUST be the highest-rank contact source; later A&D values MAY refresh A&D-sourced fields and MUST NOT invent missing values
- **FR-004**: Client-report import MUST fill only empty contact fields and MUST record Client-report provenance per field
- **FR-005**: stay@ inbound matching MUST use name, booking reference, and/or stay dates; a unique match MAY store the sender email with stay@ provenance; a non-unique match MUST store nothing
- **FR-006**: stay@ MUST NOT overwrite a direct A&D email
- **FR-007**: Staff MUST be able to enter a validated phone and/or email on the booking record and on the conversation thread, with provenance `staff`, and with no send
- **FR-008**: A guest with a valid portal token MUST be able to submit a validated phone and/or email with provenance `guest`, and with no send
- **FR-009**: Precedence per field MUST be A&D, then staff, then guest self-fill, then Client report, then stay@
- **FR-010**: A multi-room booking MUST collapse to one booking identity, list every room, attach contacts to that booking, and keep one booker thread
- **FR-011**: The system MUST NEVER invent guest PII
- **FR-012**: Outbound redirect, confirmToken, and human Approve&Send MUST remain unchanged; this feature MUST NOT auto-send
- **FR-013**: Any schema migration or backfill script MUST default to dry-run and MUST NOT be executed against Production Turso by this package
- **FR-014**: Arrivals & Departures staff views MUST expose stored guest email (and relay flag) so email coverage is visible without a second query

### Key Entities

- **Booking**: Stay identity keyed by Nightsbridge booking id; holds rooms, dates, booker name, and current phone/email plus per-field provenance
- **Guest contact**: Shared allowlist/contact row used by WhatsApp and inbound match; mirrored from the booking contact set; never invented
- **Contact field provenance**: Per-field source (`arrivals_departures`, `staff`, `guest`, `client_report`, `stay_at`), optional relay kind, and source reference
- **Booker thread**: One conversation per booking, contact = booker
- **Relay email**: Address that reaches the guest only through an OTA proxy

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After an A&D ingest, every real-guest arrival row with a phone or email in the file has that value on the booking (100% of synthetic fixture rows)
- **SC-002**: Every Booking.com relay address in the fixture is flagged as relay; no relay is labelled as a direct email
- **SC-003**: Client-report import changes 0 already-filled A&D fields in the gap-fill fixture
- **SC-004**: stay@ unique-match fixture stores the sender; the no-overwrite fixture leaves the A&D email unchanged
- **SC-005**: Invalid staff and guest submissions are rejected; valid submissions persist with the correct provenance and produce zero outbound messages
- **SC-006**: The 5667 two-room fixture yields exactly one booking, both rooms listed, exactly one booker thread, and one contact set
- **SC-007**: Staff can see a booking's phone, email, relay flag, and source without leaving the booking or thread they already use that week

## Assumptions

- A&D remains the staff-upload / cron ingest already in GuestFlow; this package extends it rather than replacing Nightsbridge
- Client report columns vary; the parser maps labelled Phone/Email/Name/Booking ID cells and ignores unknown columns
- stay@ matching is deterministic (reference, normalised name, dates). LLM parsing of Notes is out of scope for this package
- Guest portal magic-link auth is unchanged; the self-fill form is an addition on that page
- Synthetic phones and emails only in tests and fixtures (never live guest PII)
- Parallel Sprint 2 packages own user management, WhatsApp windowing, and broader data-fix work; this diff stays on contacts, multi-room identity, and the docs for this feature
- Production Turso writes, deploys, and merges wait for a separate Grant / GFM gate
