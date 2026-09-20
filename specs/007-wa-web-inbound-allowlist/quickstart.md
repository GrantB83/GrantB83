# Quickstart: WhatsApp Web Inbound Allowlist Bridge

**Feature**: Personal WhatsApp Web → GuestFlow inbound bridge  
**Date**: 2026-09-20

## Purpose

This guide provides runnable validation scenarios to prove the WhatsApp Web allowlist feature works end-to-end. It does NOT include full implementation code or migration scripts (those belong in implementation phase).

## Prerequisites

- GuestFlow app running locally or on Vercel
- `INBOUND_WEBHOOK_SECRET` configured
- Turso database with Phase 0 schema (guest_contacts, inbound_threads, inbound_messages, guest_tickets)
- Test guest records seeded in database
- `curl` or HTTP client for webhook testing

## Setup Commands

### 1. Install Dependencies

```bash
cd apps/guestflow
npm install
```

### 2. Configure Environment

```bash
# apps/guestflow/.env.local
INBOUND_WEBHOOK_SECRET=test-secret-12345
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

### 3. Seed Test Data

```bash
# Create test guest contacts for allowlist validation
npm run seed:test-guests

# Or manually insert via SQL:
# INSERT INTO guest_contacts (tenant_id, normalized_phone, display_name, source)
# VALUES (1, '+27821234567', 'Test Guest', 'manual');
```

### 4. Start Development Server

```bash
npm run dev
# Server starts on http://localhost:3000
```

## Validation Scenarios

### Scenario 1: Known Guest Message (Allowlist Pass)

**Objective**: Verify message from guest in `guest_contacts` is accepted and stored metadata-only.

**Test Command**:
```bash
curl -X POST http://localhost:3000/api/inbound/webhook \
  -H "Authorization: Bearer test-secret-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "timestamp": "2026-09-20T10:00:00Z",
    "source": "whatsapp_web",
    "externalMessageId": "wamid.test001",
    "metadata": {
      "observedOn": "+27836458313"
    }
  }'
```

**Expected Outcome**:
- HTTP 200 response
- JSON contains: `"success": true, "allowlisted": true, "allowlistSource": "guest_contacts"`
- Database check: `inbound_messages` has new row with `message_text = NULL`, `external_message_id = 'wamid.test001'`
- Database check: `inbound_threads` has thread with `source = 'whatsapp_web'`

**Validation Query**:
```sql
SELECT * FROM inbound_messages WHERE external_message_id = 'wamid.test001';
-- Verify: message_text IS NULL (metadata-only)

SELECT * FROM inbound_threads WHERE from_number = '+27821234567' AND source = 'whatsapp_web';
-- Verify: thread exists
```

---

### Scenario 2: Unknown Sender (Triage Queue)

**Objective**: Verify message from unknown sender is rejected from ingestion and routed to triage.

**Test Command**:
```bash
curl -X POST http://localhost:3000/api/inbound/webhook \
  -H "Authorization: Bearer test-secret-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27829999999",
    "timestamp": "2026-09-20T10:05:00Z",
    "source": "whatsapp_web",
    "externalMessageId": "wamid.test002",
    "metadata": {
      "observedOn": "+27836458313"
    }
  }'
```

**Expected Outcome**:
- HTTP 200 response
- JSON contains: `"success": true, "triaged": true, "ticketId": <number>`
- Database check: NO row in `guest_contacts` with phone `+27829999999`
- Database check: `guest_tickets` has new row with `category = 'unknown_whatsapp_web'`, `guest_phone = '+27829999999'`

**Validation Query**:
```sql
SELECT * FROM guest_contacts WHERE normalized_phone = '+27829999999';
-- Verify: NO ROWS (unknown sender not auto-created)

SELECT * FROM guest_tickets WHERE category = 'unknown_whatsapp_web' AND guest_phone = '+27829999999';
-- Verify: ticket exists with status = 'new'
```

---

### Scenario 3: Message with Body Content (Metadata-Only Enforcement)

**Objective**: Verify body content is stripped when `source=whatsapp_web`.

**Test Command**:
```bash
curl -X POST http://localhost:3000/api/inbound/webhook \
  -H "Authorization: Bearer test-secret-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "timestamp": "2026-09-20T10:10:00Z",
    "source": "whatsapp_web",
    "externalMessageId": "wamid.test003",
    "text": "This body content should be stripped",
    "metadata": {
      "observedOn": "+27836458313"
    }
  }'
```

**Expected Outcome** (Option A: Silent Strip):
- HTTP 200 response
- JSON contains: `"success": true`
- Database check: `inbound_messages` has `message_text = NULL` (body was stripped)

**Expected Outcome** (Option B: Reject):
- HTTP 400 response
- JSON contains: `"error": "Message body content not allowed for source=whatsapp_web"`

**Validation Query** (if Option A):
```sql
SELECT message_text FROM inbound_messages WHERE external_message_id = 'wamid.test003';
-- Verify: message_text IS NULL
```

---

### Scenario 4: Deduplication with Twilio Thread

**Objective**: Verify message merges into existing open Twilio thread instead of creating duplicate.

**Setup**:
```sql
-- Create open Twilio thread for test phone
INSERT INTO inbound_threads (tenant_id, source, from_number, status, first_message_at, last_message_at)
VALUES (1, 'twilio_whatsapp', '+27827777777', 'drafted', '2026-09-19T12:00:00Z', '2026-09-19T12:00:00Z');
```

**Test Command**:
```bash
curl -X POST http://localhost:3000/api/inbound/webhook \
  -H "Authorization: Bearer test-secret-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27827777777",
    "timestamp": "2026-09-20T10:15:00Z",
    "source": "whatsapp_web",
    "externalMessageId": "wamid.test004",
    "metadata": {
      "observedOn": "+27836458313"
    }
  }'
```

**Expected Outcome**:
- HTTP 200 response
- JSON contains: `"success": true, "deduped": true, "threadId": <existing_twilio_thread_id>`
- Database check: Message inserted with `thread_id` matching existing Twilio thread (NOT new thread)
- Database check: Only ONE thread exists for `+27827777777` (no duplicate)

**Validation Query**:
```sql
SELECT COUNT(*) FROM inbound_threads WHERE from_number = '+27827777777';
-- Verify: COUNT = 1 (no duplicate thread)

SELECT thread_id, source FROM inbound_messages WHERE external_message_id = 'wamid.test004';
-- Verify: thread_id matches existing Twilio thread, source metadata indicates 'whatsapp_web'
```

---

### Scenario 5: Missing Required Field (Validation)

**Objective**: Verify webhook rejects payload missing `externalMessageId`.

**Test Command**:
```bash
curl -X POST http://localhost:3000/api/inbound/webhook \
  -H "Authorization: Bearer test-secret-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "timestamp": "2026-09-20T10:20:00Z",
    "source": "whatsapp_web"
  }'
```

**Expected Outcome**:
- HTTP 400 response
- JSON contains: `"error": "Missing required fields: externalMessageId"`
- Database check: NO new rows in `inbound_messages`

---

### Scenario 6: Authentication Failure

**Objective**: Verify webhook enforces `INBOUND_WEBHOOK_SECRET`.

**Test Command**:
```bash
curl -X POST http://localhost:3000/api/inbound/webhook \
  -H "Authorization: Bearer wrong-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "timestamp": "2026-09-20T10:25:00Z",
    "source": "whatsapp_web",
    "externalMessageId": "wamid.test005"
  }'
```

**Expected Outcome**:
- HTTP 401 response
- JSON contains: `"error": "Unauthorized - invalid webhook secret"`

---

### Scenario 7: Noreply Email Fallback Removed (Optional)

**Objective**: Verify email send fails when `RESEND_FROM_EMAIL` not set (no silent fallback to noreply@).

**Setup**:
```bash
# Remove RESEND_FROM_EMAIL from .env.local temporarily
unset RESEND_FROM_EMAIL
```

**Test Command** (trigger email send via staff ops):
```bash
# Navigate to http://localhost:3000/ops/drafts
# Attempt to approve and send a draft

# Or via API if available:
curl -X POST http://localhost:3000/api/drafts/send \
  -H "Authorization: Bearer <staff_token>" \
  -d '{"draftId": 1}'
```

**Expected Outcome**:
- Error response: `"RESEND_FROM_EMAIL environment variable not configured"`
- Email is NOT sent
- No email sent from `noreply@guestflow.thebrowns.co.za`

---

## Running Unit Tests

```bash
cd apps/guestflow
npm run test -- whatsapp-web-allowlist.test.ts
```

**Expected Test Results**:
- ✅ Known guest (guest_contacts) → message ingested
- ✅ Guest with booking → message ingested
- ✅ Guest with open Twilio thread → message merged
- ✅ Unknown sender → triaged, no guest created
- ✅ Body content stripped for whatsapp_web source
- ✅ Missing externalMessageId → validation error
- ✅ Invalid auth secret → 401 response
- ✅ Duplicate externalMessageId → idempotent (returns existing messageId)

**Test Coverage Target**: 95%+ for allowlist gate logic + metadata enforcement.

---

## Build Verification

```bash
cd apps/guestflow
npm run build
```

**Expected Outcome**: Build succeeds with zero errors.

---

## Deployment Verification (Vercel)

### 1. Deploy to Preview

```bash
vercel deploy --scope browns-family
```

### 2. Test Against Preview URL

```bash
PREVIEW_URL="https://guestflow-preview-xyz.vercel.app"
curl -X POST "$PREVIEW_URL/api/inbound/webhook" \
  -H "Authorization: Bearer $INBOUND_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "timestamp": "2026-09-20T11:00:00Z",
    "source": "whatsapp_web",
    "externalMessageId": "wamid.preview001",
    "metadata": {"observedOn": "+27836458313"}
  }'
```

**Expected Outcome**: Same as Scenario 1 (200 response, allowlisted=true).

---

## Next Steps After Validation

1. **Manual Testing**: Staff tests triage UI for unknown sender approval workflow
2. **CoS Integration**: CoS observer configured to POST to webhook endpoint
3. **Monitoring**: Check Vercel logs for webhook requests, errors, triage queue length
4. **Phase 1 LLM Draft** (future): Separate feature after this Phase 0 validation passes

---

## Troubleshooting

### Issue: "Unknown sender not triaged"

**Check**:
- Guest with that phone exists in `guest_contacts`, `bookings`, or open `inbound_threads`
- Phone normalization: raw input → E.164 format

**Fix**: Ensure allowlist check queries use normalized phone format.

---

### Issue: "Body content stored despite metadata-only requirement"

**Check**:
- `source` field is exactly `'whatsapp_web'` (case-sensitive)
- Webhook route strips body before calling ingest logic

**Fix**: Add explicit null assignment for `message_text` when `source=whatsapp_web`.

---

### Issue: "Duplicate threads created for same sender"

**Check**:
- Deduplication query checks `from_number` match + `source='twilio_whatsapp'` + `status!='closed'`
- Phone normalization consistent between Twilio and WhatsApp Web payloads

**Fix**: Normalize phone in both paths; ensure query uses normalized form.

---

## References

- Feature Spec: [spec.md](spec.md)
- Data Model: [data-model.md](data-model.md)
- Webhook Contract: [contracts/whatsapp-web-webhook.md](contracts/whatsapp-web-webhook.md)
- Existing Webhook Route: `apps/guestflow/src/app/api/inbound/webhook/route.ts`
