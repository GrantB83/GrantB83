# Data Model: WhatsApp Web Inbound Allowlist Bridge

**Date**: 2026-09-20  
**Feature**: WhatsApp Web → GuestFlow inbound bridge

## Overview

This feature primarily reuses existing schema with minor extensions for WhatsApp Web source tracking and triage queue categories. No major schema changes required.

## Entities

### 1. WhatsApp Web Inbound Message (extends `inbound_messages`)

**Description**: Represents a message received via personal WhatsApp Web observer, stored as metadata-only.

**Schema Extension**: None required. Existing `inbound_messages` table supports:
- `external_message_id` (deduplication)
- `source` (will use `'whatsapp_web'`)
- `message_text` (MUST be null for whatsapp_web source)
- `media_refs` (optional, JSON array of media IDs/links)
- `message_timestamp` (when message was observed)
- `thread_id` (link to thread, may be Twilio thread if dedupe applies)

**Metadata Storage Pattern**:
```typescript
{
  externalMessageId: string  // WhatsApp message ID from observer
  observedOn: '+27836458313' // Personal WA number
  source: 'whatsapp_web'     // Source identifier
  timestamp: string          // ISO8601
  // NO message body stored
}
```

**Validation Rules**:
- When `source = 'whatsapp_web'`:
  - `message_text` MUST be null (body stripped)
  - `external_message_id` REQUIRED (for deduplication)
  - `from_number` MUST normalize to valid E.164

**State Transitions**: N/A (messages are immutable once inserted)

---

### 2. Guest Contact (existing `guest_contacts`)

**Description**: Allowlist of known Browns guests. Used for inbound message authorization.

**Schema**: Already exists with:
- `normalized_phone` (E.164 format)
- `email`
- `display_name`
- `last_stay_at` (date of last stay)
- `source` ('nb' | 'inbound' | 'manual')
- `retention_years` (default 5)
- `retention_delete_after` (computed from last_stay_at + 5y)

**Relationships**:
- Referenced by allowlist check logic (no FK constraint)

**Validation Rules** (existing):
- At least one of: phone, email, or display_name must be present
- Phone stored in normalized E.164 format only
- Last stay date triggers retention timer

---

### 3. Booking (existing `bookings`)

**Description**: Guest reservations. Secondary allowlist source for guests with upcoming/recent stays.

**Schema**: Already exists with:
- `guest_name`
- `guest_phone` (should be normalized E.164)
- `guest_email`
- `check_in` (date)
- `check_out` (date)
- `status` ('confirmed' | 'checked_in' | 'checked_out' | 'cancelled')

**Relationships**:
- Referenced by allowlist check logic (no FK constraint)

**Allowlist Criteria**:
- Status != 'cancelled'
- Check-in within reasonable window (e.g., past 30 days or future 90 days)

---

### 4. Inbound Thread (existing `inbound_threads`)

**Description**: Conversation thread grouping messages from same sender. Used for deduplication and Twilio thread merging.

**Schema**: Already exists with:
- `source` ('twilio_whatsapp' | 'twilio_sms' | 'whatsapp_web' | etc.)
- `from_number` (E.164)
- `status` ('new' | 'classified' | 'drafted' | 'sent' | 'closed')
- `first_message_at`
- `last_message_at`
- `guest_name` (inferred)
- `metadata` (JSON for additional context)

**Relationships**:
- Has many `inbound_messages` via `thread_id` FK

**Deduplication Logic**:
- When WhatsApp Web message arrives from phone X:
  - Check if open thread exists for `(from_number = X, source = 'twilio_whatsapp', status != 'closed')`
  - If yes: use that `thread_id` for new message (cross-source merge)
  - If no: create new thread with `source = 'whatsapp_web'`

**State Transitions**:
- `new` → `classified` (after classification)
- `classified` → `drafted` (when draft reply generated)
- `drafted` → `sent` (after staff approval & send)
- Any → `closed` (manual close or spam detection)

---

### 5. Triage Queue Entry (extends `guest_tickets`)

**Description**: Unknown sender messages awaiting staff review. No full guest record created until approved.

**Schema Extension**: New category value:
- `category` = `'unknown_whatsapp_web'`

**Special Fields for Triage**:
- `guest_phone` (the unknown sender's phone)
- `description` (metadata: timestamp, externalMessageId, observedOn)
- `status` ('new' | 'approved' | 'rejected')
- Custom annotation (not in schema): `retention = 0` in ticket description/notes

**Validation Rules**:
- Must NOT create `guest_contacts` entry until ticket status = 'approved'
- Ticket closure (reject) does not persist phone to any table

**State Transitions**:
- `new` → `approved`: Staff approves; trigger guest_contacts creation + thread migration
- `new` → `rejected`: Staff rejects; close ticket, do not create guest

---

## Schema Migrations

### Migration: None required (reuse existing tables)

**Rationale**: Existing schema already supports:
- Variable `source` values in `inbound_threads` and `inbound_messages`
- `guest_tickets.category` accepts new enum values
- Metadata-only storage (null `message_text` is valid)

### Optional: Add Index for Allowlist Lookups

If performance testing shows slow allowlist checks, consider:

```sql
-- Index for guest_contacts phone lookup
CREATE INDEX IF NOT EXISTS idx_guest_contacts_phone 
ON guest_contacts(normalized_phone, tenant_id);

-- Index for bookings phone lookup
CREATE INDEX IF NOT EXISTS idx_bookings_phone 
ON bookings(guest_phone, tenant_id) 
WHERE status != 'cancelled';

-- Index for open thread lookup (deduplication)
CREATE INDEX IF NOT EXISTS idx_inbound_threads_dedup 
ON inbound_threads(from_number, source, status);
```

**Decision Point**: Add indexes if allowlist check exceeds 100ms in testing. Start without to avoid premature optimization.

---

## Data Retention

### WhatsApp Web Messages

- **Body Content**: Never stored (metadata-only)
- **Metadata Retention**: Follows same rules as Twilio messages (linked to guest_contacts retention)
- **Unknown Sender Metadata**: `retention = 0` annotation in triage ticket; purge on ticket close

### Guest Contacts

- **Deletion Trigger**: `retention_delete_after` (last_stay_at + 5 years)
- **Cascade**: Deleting guest_contacts should soft-delete or anonymize related messages (existing Phase 0 behavior)

---

## Relationships Diagram

```
guest_contacts (allowlist tier 1)
    ↓ (phone match)
inbound_threads ← WhatsApp Web allowlist check → bookings (allowlist tier 2)
    ↓ (thread_id)              ↓ (phone match)
inbound_messages          open Twilio threads (allowlist tier 3, dedup source)
    ↓ (if unknown)
guest_tickets (triage queue, category=unknown_whatsapp_web)
```

---

## Example Data Flows

### Flow 1: Known Guest Message (in guest_contacts)

```
1. POST /api/inbound/webhook 
   { from: "+27821234567", source: "whatsapp_web", externalMessageId: "wa123", ... }
   
2. Normalize phone: "+27821234567" (E.164)

3. Allowlist check:
   - guest_contacts.normalized_phone = "+27821234567" → MATCH ✅
   
4. Thread lookup:
   - No existing thread for (from="+27821234567", source="whatsapp_web")
   - Create new thread: id=42, source="whatsapp_web"
   
5. Insert message:
   - thread_id=42, external_message_id="wa123", message_text=NULL, metadata={observedOn:"+27836458313"}
   
6. Return: { success: true, messageId: 123, threadId: 42 }
```

### Flow 2: Guest with Open Twilio Thread (deduplication)

```
1. POST /api/inbound/webhook 
   { from: "+27829876543", source: "whatsapp_web", externalMessageId: "wa456", ... }
   
2. Normalize phone: "+27829876543"

3. Allowlist check:
   - guest_contacts → no match
   - bookings → no match
   - inbound_threads (from="+27829876543", source="twilio_whatsapp", status!="closed") → MATCH (thread_id=88) ✅
   
4. Reuse Twilio thread: thread_id=88 (do NOT create new thread)
   
5. Insert message:
   - thread_id=88 (existing Twilio thread), source="whatsapp_web", message_text=NULL
   
6. Return: { success: true, messageId: 124, threadId: 88, deduped: true }
```

### Flow 3: Unknown Sender (triage)

```
1. POST /api/inbound/webhook 
   { from: "+27821111111", source: "whatsapp_web", externalMessageId: "wa789", ... }
   
2. Normalize phone: "+27821111111"

3. Allowlist check:
   - guest_contacts → no match ❌
   - bookings → no match ❌
   - inbound_threads (open Twilio) → no match ❌
   
4. Create triage ticket:
   - guest_tickets: category="unknown_whatsapp_web", guest_phone="+27821111111", 
     description="Unknown sender metadata: wa789, observedOn +27836458313", 
     status="new", retention=0 annotation
   
5. Do NOT create guest_contacts entry
   
6. Return: { success: true, triaged: true, ticketId: 99 }
```

---

## Notes

- **No New Tables**: This feature extends existing schema only
- **Metadata JSON**: Use existing `metadata` JSON columns on threads/messages for WhatsApp Web-specific fields
- **Fail-Closed**: Unknown senders never auto-create guest records (security requirement)
- **Deduplication**: Cross-source thread merging ensures staff sees unified conversation
