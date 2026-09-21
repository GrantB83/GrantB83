# Feature Specification: Nightsbridge Phone & Email Mapping Fix

**Feature Branch**: `cursor/guestflow-nb-phone-email-0114`

**Created**: 2026-09-21

**Status**: Draft

**Input**: Map Nightsbridge A&D Phone Number / Email columns into `bookings.guest_phone` (+ email) and `guest_contacts` so WA Web allowlist can match real guests.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Guest Contact Data from Nightsbridge (Priority: P1)

When SA Ops uploads the Nightsbridge arrivals & departures Excel file, the system should extract phone numbers and email addresses from the "Phone Number" and "Email" columns and store them in both the `bookings` table and the `guest_contacts` table. This enables the WhatsApp Web allowlist to match real guest phone numbers.

**Why this priority**: Critical for WA Web allowlist functionality. Currently 120/120 bookings have empty `guest_phone` and `guest_contacts=0`, making the allowlist non-functional.

**Independent Test**: Can be fully tested by uploading a real Nightsbridge Excel file with phone/email columns and verifying the data appears in both `bookings.guest_phone` and `guest_contacts` tables.

**Acceptance Scenarios**:

1. **Given** a Nightsbridge Excel file with "Phone Number" column, **When** the file is uploaded via the ingest endpoint, **Then** `bookings.guest_phone` is populated with normalized E.164 phone numbers
2. **Given** a Nightsbridge Excel file with "Email" column, **When** the file is uploaded, **Then** `bookings.guest_email` is populated with email addresses
3. **Given** a booking with a phone number, **When** the booking is processed, **Then** a `guest_contacts` record is created or updated via `upsertGuestContact`
4. **Given** a section without phone/email columns, **When** the file is uploaded, **Then** the import succeeds without errors and phone/email fields remain empty

---

### User Story 2 - Support Secondary Contact Fields (Priority: P2)

The Nightsbridge Excel may include "*2" variant columns for secondary contacts (e.g., "Phone Number *2", "Email *2"). These should be mapped to `guestPhone2` and `guestEmail2` fields.

**Why this priority**: Provides complete contact data for multi-guest bookings (e.g., couples with different phone numbers).

**Independent Test**: Can be tested by creating a fixture with "*2" columns and verifying `guestPhone2` and `guestEmail2` are populated.

**Acceptance Scenarios**:

1. **Given** a Nightsbridge Excel file with "Phone Number *2" column, **When** the file is uploaded, **Then** `bookings.guest_phone2` is populated with normalized phone numbers
2. **Given** a Nightsbridge Excel file with "Email *2" column, **When** the file is uploaded, **Then** `bookings.guest_email2` is populated

---

### User Story 3 - Normalize Phone Numbers to E.164 Format (Priority: P2)

Phone numbers from Nightsbridge should be normalized to E.164 format (e.g., "+27821234567") before being stored in the database to ensure compatibility with WhatsApp and other systems.

**Why this priority**: Ensures phone number consistency and WhatsApp API compatibility.

**Independent Test**: Can be tested by providing various phone number formats (local, international, with/without spaces) and verifying they are all normalized to E.164.

**Acceptance Scenarios**:

1. **Given** a phone number in local format "082 123 4567", **When** normalized, **Then** it becomes "+27821234567"
2. **Given** an empty or invalid phone number, **When** normalized, **Then** it remains empty (never invent PII)

---

### Edge Cases

- What happens when a section has no phone/email columns? (Should import successfully, leaving fields empty)
- What happens when phone number is invalid or unparseable? (Should remain empty, not crash)
- What happens when the same guest appears in multiple sections with different phone numbers? (Should use the first occurrence per existing deduplication logic)
- What happens when phone number is already in guest_contacts? (Should use existing `upsertGuestContact` logic to update)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST map "Phone Number" and "phone number" column headers (case-insensitive, space-normalized) to `booking.guestPhone`
- **FR-002**: System MUST map "Email" column header (case-insensitive) to `booking.guestEmail`
- **FR-003**: System MUST map "*2" variant columns ("Phone Number *2", "Email *2") to `guestPhone2` and `guestEmail2` fields
- **FR-004**: System MUST normalize header names the same way existing code does (lowercase, strip spaces)
- **FR-005**: System MUST normalize phone numbers to E.164 format before storing
- **FR-006**: System MUST call `upsertGuestContact` only when phone is present (keep existing behavior)
- **FR-007**: System MUST NOT invent or fabricate phone numbers or emails (empty stays empty)
- **FR-008**: System MUST support multi-section Excel files where some sections have phone/email columns and others don't

### Key Entities

- **Booking**: Represents a guest reservation with fields `guestPhone`, `guestEmail`, `guestPhone2`, `guestEmail2` (already exist in schema)
- **GuestContact**: Represents a guest's contact information for allowlist matching, created/updated via `upsertGuestContact`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After fix, production re-ingest of latest A&D populates `guest_phone` for ~48% of bookings (based on 2026-09-21 data nonempty rate)
- **SC-002**: WA Web allowlist can match real guest phone numbers from `guest_contacts` table
- **SC-003**: Import succeeds for multi-section files with and without phone/email columns (no crashes)
- **SC-004**: All existing tests pass, including sectioned parser tests

## Assumptions

- The Nightsbridge Excel header names are "Phone Number" (or "phone number") and "Email" based on the live 2026-09-21 pull
- Phone normalization should use existing `normalizeZaE164` or similar E.164 helper function
- The existing `upsertGuestContact` function correctly handles phone/email upserts
- Test fixtures should use synthetic E.164 phone numbers like "+27821234567" (never real PII)
- PR body should redact any phone numbers from test fixtures or examples
