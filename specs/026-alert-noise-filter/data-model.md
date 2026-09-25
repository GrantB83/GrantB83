# Data Model: Alert Noise Filter

**Feature**: Alert Noise Filter for Test and Empty Threads

**Date**: 2026-09-25

## Overview

This feature extends existing GuestFlow database entities without schema modifications. All filtering logic operates on existing tables and columns.

## Existing Entities (Read-Only)

### InboundThread

Represents a conversation thread with a guest or contact.

**Table**: `inbound_threads`

**Key Fields**:
- `id` (integer, primary key): Unique thread identifier
- `tenant_id` (integer): Multi-tenant isolation
- `from_number` (string): Phone number or email of the peer
- `guest_name` (string, nullable): Display name for the guest
- `booking_id` (integer, nullable, foreign key): Link to bookings table
- `pending_reply` (integer, 0/1): Flag indicating thread needs staff response
- `last_inbound_at` (timestamp): When last inbound message received
- `last_outbound_at` (timestamp, nullable): When last outbound message sent
- `last_handler_email` (string, nullable): Staff member who last handled thread
- `thread_kind` (string): Type of thread ('booking', 'temp', etc.)
- `metadata` (string, nullable): JSON string for additional thread data
- `status` (string, nullable): Thread status ('drafted', etc.)

**Validation Rules** (for alert exclusion):
- Test phone detection: `from_number` matches test patterns
- Smoke marker detection: `guest_name` or `metadata.subject` matches test markers
- Empty BLOCK detection: `booking_id` links to BLOCK booking with 0 inbound messages

**Relationships**:
- Many-to-one with Booking (via `booking_id`)
- One-to-many with InboundMessage (thread owns messages)
- Referenced by StaffAlert (via dedupe_key pattern)

### InboundMessage

Represents individual messages within a thread.

**Table**: `inbound_messages`

**Key Fields**:
- `id` (integer, primary key): Unique message identifier
- `thread_id` (integer, foreign key): Link to inbound_threads
- `tenant_id` (integer): Multi-tenant isolation
- `direction` (string, nullable): 'inbound' or 'outbound'
- `is_spam` (integer, 0/1): Spam classification flag
- `message_timestamp` (timestamp): When message was sent/received
- `message_text` (string): Message content
- `channel` (string): Communication channel

**Validation Rules**:
- Empty BLOCK detection counts only where: `direction IS NULL OR direction = 'inbound'` AND `is_spam = 0`

**Relationships**:
- Many-to-one with InboundThread (via `thread_id`)

### Booking

Represents a guest reservation/stay.

**Table**: `bookings`

**Key Fields**:
- `id` (integer, primary key): Unique booking identifier
- `guest_name` (string): Name on the booking
- `nightsbridge_booking_id` (string, nullable): External booking system ID
- `status` (string): Booking status ('confirmed', 'cancelled', etc.)
- `check_in` (date): Arrival date
- `check_out` (date): Departure date

**Validation Rules** (for alert exclusion):
- BLOCK pattern detection: `UPPER(TRIM(guest_name))` matches patterns:
  - Exact "BLOCK"
  - "BLOCK" followed by numbers (e.g., "BLOCK 5376")
  - Known owner-block names (e.g., "Nomsa", "Sakhile") followed by numbers

**Relationships**:
- One-to-many with InboundThread (booking can have multiple communication threads)

### StaffAlert

Represents alert send records for deduplication and cooldown.

**Table**: `staff_alerts`

**Key Fields**:
- `id` (integer, primary key): Unique alert record identifier
- `tenant_id` (integer): Multi-tenant isolation
- `dedupe_key` (string): Unique key for alert deduplication
- `recipient_email` (string): Staff member receiving alert
- `kind` (string): Alert type ('unanswered', 'unanswered_digest', etc.)
- `status` (string): 'open' or 'resolved'
- `last_sent_at` (timestamp, nullable): When alert was last sent
- `payload_json` (string, nullable): JSON metadata about the alert

**Validation Rules**:
- 2-hour cooldown between alerts for same dedupe_key + recipient
- Resolved alerts don't re-fire until reopened

**Relationships**:
- Conceptual link to InboundThread via dedupe_key pattern (e.g., `unanswered:{thread_id}`)

## Pattern Matching Reference

### Test Phone Patterns

**Source**: `TEST_SINK_PHONES` set in `staff-alerts.ts`

**Current Patterns**:
- `+15124064300` / `15124064300`
- `+27600200825`

**New Patterns** (to be added):
- `+27000000001` / `27000000001`

**Matching Logic**: Exact match or digits-only match after normalization

### Smoke Test Markers

**Sources**: `guest_name` field, `metadata.subject` field

**Patterns** (case-insensitive regex):
- `T-\d+` (e.g., "T-44", "T-48")
- `THREAD \d+` (e.g., "thread 44")
- `GF-INBOUND-TEST`
- `SMOKE` (in subject/metadata)
- `TEST` (in subject/metadata)

**Matching Logic**: Regex match on uppercase-normalized strings

### BLOCK Booking Patterns

**Source**: `guest_name` field in `bookings` table

**Patterns** (case-insensitive):
- Exact: `BLOCK`
- Prefix: `BLOCK \d+` (e.g., "BLOCK 5376")
- Known owners: `NOMSA`, `SAKHILE` (with optional trailing numbers)

**Additional Validation**: Must have 0 inbound messages (not spam, direction='inbound')

## State Transitions (Alert Exclusion)

### Thread Alert Evaluation Flow

```
Thread with pending_reply=1
  │
  ├─> Is from_number in TEST_SINK_PHONES?
  │   └─> YES: EXCLUDE from alerts ✓
  │   
  ├─> Does guest_name or metadata match smoke test markers?
  │   └─> YES: EXCLUDE from alerts ✓
  │   
  ├─> Does booking_id link to BLOCK booking with 0 inbound messages?
  │   └─> YES: EXCLUDE from alerts ✓
  │   
  ├─> Is latestInboundIsSpam(thread)?
  │   └─> YES: EXCLUDE from alerts ✓ (existing filter)
  │   
  ├─> Is isStaffOrTestPeer(from_number, staffEmails)?
  │   └─> YES: EXCLUDE from alerts ✓ (existing filter)
  │
  └─> NONE of above: INCLUDE in alerts (evaluate unanswered threshold)
```

### BLOCK Booking Evolution

BLOCK bookings can transition between excluded and included states:

1. **Initial State**: Booking created with guest_name "BLOCK 5376"
   - Thread created, `booking_id` set, `pending_reply=1`
   - Message count = 0
   - **Status**: EXCLUDED from alerts

2. **Guest Message Arrives**: First actual inbound message received
   - Message count = 1
   - **Status**: INCLUDED in alerts (booking no longer empty)

3. **Booking Renamed**: Admin changes guest_name from "BLOCK 5376" to real guest name
   - **Status**: INCLUDED in alerts (no longer matches BLOCK pattern)

## No Schema Changes Required

This feature operates entirely on existing columns and tables. No migrations needed.

**Verification Strategy**: Test cases will create threads/bookings/messages with existing schema and verify exclusion logic.
