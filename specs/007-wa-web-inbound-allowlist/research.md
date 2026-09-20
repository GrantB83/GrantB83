# Research: WhatsApp Web Inbound Allowlist Bridge

**Date**: 2026-09-20  
**Feature**: WhatsApp Web → GuestFlow inbound bridge with fail-closed allowlist

## Overview

This document consolidates technical research and decisions for implementing the personal WhatsApp Web inbound bridge feature.

## Key Decisions

### 1. Allowlist Implementation Strategy

**Decision**: Three-tier allowlist check (guest_contacts → bookings → open Twilio threads)

**Rationale**:
- **guest_contacts** table is authoritative source for known Browns guests
- **bookings** table captures guests with confirmed stays (may not yet be in contacts)
- **open Twilio threads** allow continued conversation with guests who messaged via official Twilio channel

**Alternatives Considered**:
- Single-tier (guest_contacts only): Too restrictive, would block guests with bookings but no contact record
- Two-tier (contacts + bookings): Would block ongoing Twilio conversations from merging
- Auto-add unknowns with flag: Violates fail-closed requirement, creates PII exposure

**Implementation**: Sequential checks with early return on match. Phone normalized to E.164 before any comparison.

---

### 2. Phone Normalization

**Decision**: Reuse existing `normalizeZaE164()` from `src/lib/phone.ts`

**Rationale**:
- Already handles ZA-specific patterns (0-prefixed 10-digit → +27)
- Fail-safe: returns null for unparseable input (never invents numbers)
- Tested in production with Phase 0 contact management

**Alternatives Considered**:
- libphonenumber-js: Heavy dependency, overkill for ZA-only use case
- Simple regex: Existing utility is more robust and battle-tested

**Best Practices**: Always normalize before database lookups. Store normalized form only.

---

### 3. Metadata-Only Storage

**Decision**: Strip/reject message body fields when `source=whatsapp_web`; store only externalMessageId, timestamp, source, observedOn metadata

**Rationale**:
- Vault requirement: minimize PII storage for personal WhatsApp channel
- Compliance with 5-year retention policy (easier to purge metadata than full bodies)
- Observer (CoS computerUse) already has access to full content for context

**Alternatives Considered**:
- Hash-only storage: Not useful for staff review, still retains some PII in hashes
- Full body with encryption: Adds key management complexity, doesn't satisfy "metadata-only" requirement
- Store bodies in separate table with shorter retention: Still violates metadata-only directive

**Implementation**: Webhook route checks `source=whatsapp_web` and either:
- **Option A**: Silently strips body fields before passing to ingest logic
- **Option B**: Rejects payload with 400 if body field present

**Recommended**: Option A (strip) for resilience - observer may accidentally include body.

---

### 4. Deduplication with Twilio Threads

**Decision**: When open Twilio thread exists for sender phone, merge WhatsApp Web message into existing thread; mark with `source=whatsapp_web` metadata

**Rationale**:
- Staff sees unified conversation regardless of inbound channel
- Prevents duplicate guest entries and split threads
- Twilio (+27600200825) remains canonical outbound sender (Phase 0 contract)

**Alternatives Considered**:
- Separate threads per source: Creates confusion, duplicates guest context
- Convert Twilio thread to WhatsApp Web source: Violates immutability, loses audit trail
- Create shadow thread with cross-reference: Overcomplicates UI and queries

**Implementation Details**:
- Query `inbound_threads` for `(from_number = ?, source = 'twilio_whatsapp')` with status != 'closed'
- If found: insert message with `thread_id` of Twilio thread, annotate with `source=whatsapp_web` in message metadata
- If not found: create new thread with `source=whatsapp_web`
- Thread query must check phone number match only (source is different), not compound key

---

### 5. Unknown Sender Triage Queue

**Decision**: Route unknown senders to `guest_tickets` table with `category=unknown_whatsapp_web` and `retention=0` annotation

**Rationale**:
- Reuses existing exception/ticket infrastructure (Phase 0)
- Staff already familiar with ticket review UI
- `retention=0` flag signals "do not persist full guest record"

**Alternatives Considered**:
- Separate `triage_queue` table: Adds complexity, duplicates ticket workflows
- Silent drop: Violates observability requirement (staff can't review/approve)
- Temporary in-memory queue: Lost on restart, no audit trail

**UI Requirements (Minimal)**:
- Staff ops page shows tickets with `category=unknown_whatsapp_web`
- Actions: "Approve & Add to Contacts" or "Reject & Close"
- Approve flow: creates guest_contacts entry, moves message to new thread

---

### 6. Email Fallback Removal

**Decision**: Remove `noreply@guestflow.thebrowns.co.za` fallback in `src/lib/email.ts`; fail closed if `RESEND_FROM_EMAIL` not set

**Rationale**:
- Prepares for stay@thebrowns.co.za migration
- Prevents accidental sends from wrong address before Resend domain verification
- Explicit configuration required (defense in depth)

**Alternatives Considered**:
- Keep fallback with warning log: Still allows unintended sends
- Add validation that From matches allowed domain list: More complex, requires maintaining list

**Implementation**: Replace `process.env.RESEND_FROM_EMAIL || 'noreply@guestflow.thebrowns.co.za'` with:
```typescript
const from = process.env.RESEND_FROM_EMAIL
if (!from) {
  throw new Error('RESEND_FROM_EMAIL environment variable not configured')
}
```

---

### 7. Webhook Reuse Strategy

**Decision**: Extend existing `/api/inbound/webhook` with conditional logic for `source=whatsapp_web`

**Rationale**:
- Single secured endpoint (one `INBOUND_WEBHOOK_SECRET`)
- Middleware already excludes `/api/inbound/webhook` from auth
- Existing Twilio and legacy_wa handling provides pattern to follow

**Alternatives Considered**:
- New `/api/inbound/whatsapp-web` endpoint: Proliferates secrets, duplicates auth logic
- Separate webhook service outside Next.js: Overengineering for Browns-only use case

**Validation**: Require `source=whatsapp_web` field + `externalMessageId` when that source detected.

---

### 8. Testing Strategy

**Decision**: Focused unit tests for allowlist gate logic + metadata-only enforcement + triage routing; extend existing webhook integration tests

**Rationale**:
- Critical security logic (allowlist) must have exhaustive unit coverage
- Integration tests already exist for webhook flow (twilio, email)
- No end-to-end CoS computerUse test (observer loop out of scope)

**Test Coverage Targets**:
- ✅ Known guest (in guest_contacts) → message ingested
- ✅ Guest with booking (not in contacts) → message ingested  
- ✅ Guest with open Twilio thread → message merged into thread
- ✅ Unknown sender → routed to triage, no guest created
- ✅ Payload with body content → body stripped/rejected
- ✅ Missing externalMessageId → validation error
- ✅ Webhook auth enforcement (secret required)

**Tools**: Vitest with in-memory SQLite for fast unit tests.

---

## Open Questions

None. All clarifications resolved during research phase.

---

## References

- Existing webhook route: `apps/guestflow/src/app/api/inbound/webhook/route.ts`
- Phone utils: `apps/guestflow/src/lib/phone.ts`
- Guest contacts: `apps/guestflow/src/lib/guest-contacts.ts`
- Phase 0 spec: `specs/006-guestflow-phase0/`
- Grant CLEAR artifacts: uploaded `PROPOSAL-GRANT-REVIEW-v1.md`, `COS-BOUNCE-MERGE-v1.md`
