# Contract: WhatsApp Web Webhook Payload

**Endpoint**: `POST /api/inbound/webhook`  
**Authentication**: Bearer token via `Authorization: Bearer <INBOUND_WEBHOOK_SECRET>`  
**Content-Type**: `application/json`

## Purpose

Accepts inbound WhatsApp Web messages from CoS observer, validates sender against allowlist, and ingests metadata-only into GuestFlow.

## Request Schema

### Required Fields

```typescript
{
  from: string              // Sender phone number (will be normalized to E.164)
  timestamp: string         // ISO8601 timestamp when message was observed
  source: 'whatsapp_web'    // MUST be exactly 'whatsapp_web' for this flow
  externalMessageId: string // WhatsApp message ID for deduplication
}
```

### Optional Fields

```typescript
{
  metadata?: {
    observedOn?: string     // Phone number where message was observed (e.g., "+27836458313")
    [key: string]: any      // Additional observer metadata
  }
  mediaRefs?: string[]      // Array of media attachment IDs/URLs (no full media content)
}
```

### Forbidden Fields for `source=whatsapp_web`

These fields MUST NOT be present or will be stripped:

```typescript
{
  text: string              // ❌ FORBIDDEN: Full message body (metadata-only requirement)
  body: string              // ❌ FORBIDDEN: Alias for message body
  message: string           // ❌ FORBIDDEN: Any field containing full message content
}
```

**Enforcement**: Webhook handler will either:
- **Option A** (Recommended): Silently strip these fields if present
- **Option B**: Return `400 Bad Request` if body content detected

## Response Schema

### Success Response: Known Guest (Allowlisted)

**Status**: `200 OK`

```json
{
  "success": true,
  "messageId": 123,
  "threadId": 42,
  "allowlisted": true,
  "allowlistSource": "guest_contacts",  // or "booking" or "twilio_thread"
  "deduped": false,  // true if merged into existing Twilio thread
  "queuedForApproval": true,
  "status": "drafted"
}
```

### Success Response: Unknown Sender (Triaged)

**Status**: `200 OK`

```json
{
  "success": true,
  "triaged": true,
  "ticketId": 99,
  "reason": "Sender not in allowlist (guest_contacts, bookings, or open Twilio threads)"
}
```

### Error Response: Missing Required Fields

**Status**: `400 Bad Request`

```json
{
  "success": false,
  "error": "Missing required fields: externalMessageId"
}
```

### Error Response: Authentication Failure

**Status**: `401 Unauthorized`

```json
{
  "success": false,
  "error": "Unauthorized - invalid webhook secret"
}
```

### Error Response: Body Content Forbidden (Option B)

**Status**: `400 Bad Request`

```json
{
  "success": false,
  "error": "Message body content not allowed for source=whatsapp_web (metadata-only)"
}
```

### Error Response: Duplicate Message

**Status**: `200 OK` (idempotent)

```json
{
  "success": true,
  "duplicate": true,
  "messageId": 123
}
```

## Allowlist Logic

Messages are accepted if sender phone (normalized to E.164) matches **any** of:

1. **guest_contacts table**: `normalized_phone` column
2. **bookings table**: `guest_phone` column where `status != 'cancelled'`
3. **inbound_threads table**: Open Twilio thread (`source = 'twilio_whatsapp'` AND `status != 'closed'`) with matching `from_number`

**Evaluation Order**: Check all three in parallel; accept on first match.

**Unknown Sender**: If no match found, route to triage queue (create `guest_tickets` entry with `category=unknown_whatsapp_web`).

## Deduplication Logic

After allowlist validation passes:

1. **Check for open Twilio thread**: Query `inbound_threads` for `(from_number = <sender>, source = 'twilio_whatsapp', status != 'closed')`
2. **If found**: Insert message with `thread_id` of existing Twilio thread, mark `source=whatsapp_web` in message metadata
3. **If not found**: Create new thread with `source=whatsapp_web`

**Result**: Staff sees unified conversation regardless of inbound channel. Twilio remains canonical outbound sender.

## Metadata Storage

For `source=whatsapp_web`, only these fields are stored:

- `externalMessageId` (deduplication key)
- `timestamp` (when observed)
- `source` = 'whatsapp_web'
- `from` (normalized to E.164)
- `observedOn` metadata (+27836458313)
- `mediaRefs` (optional, array of IDs/links, no actual media content)

**Body Content**: Always NULL in database for this source.

## Security Requirements

- **Authentication**: `INBOUND_WEBHOOK_SECRET` required in `Authorization: Bearer` header
- **Fail-Closed**: Unknown senders never auto-create guest records
- **Rate Limiting**: Standard Next.js/Vercel limits apply (~100 req/min)
- **Idempotency**: Duplicate `externalMessageId` returns success with existing `messageId`

## Example Requests

### Valid Request: Known Guest

```bash
curl -X POST https://guestflow.vercel.app/api/inbound/webhook \
  -H "Authorization: Bearer $INBOUND_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "timestamp": "2026-09-20T14:30:00Z",
    "source": "whatsapp_web",
    "externalMessageId": "wamid.12345abcdef",
    "metadata": {
      "observedOn": "+27836458313"
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "messageId": 456,
  "threadId": 78,
  "allowlisted": true,
  "allowlistSource": "guest_contacts"
}
```

### Valid Request: Unknown Sender

```bash
curl -X POST https://guestflow.vercel.app/api/inbound/webhook \
  -H "Authorization: Bearer $INBOUND_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27829999999",
    "timestamp": "2026-09-20T14:35:00Z",
    "source": "whatsapp_web",
    "externalMessageId": "wamid.99999zzzzz",
    "metadata": {
      "observedOn": "+27836458313"
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "triaged": true,
  "ticketId": 12,
  "reason": "Sender not in allowlist"
}
```

### Invalid Request: Missing externalMessageId

```bash
curl -X POST https://guestflow.vercel.app/api/inbound/webhook \
  -H "Authorization: Bearer $INBOUND_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "timestamp": "2026-09-20T14:30:00Z",
    "source": "whatsapp_web"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Missing required fields: externalMessageId"
}
```

### Invalid Request: Body Content Included (Option B enforcement)

```bash
curl -X POST https://guestflow.vercel.app/api/inbound/webhook \
  -H "Authorization: Bearer $INBOUND_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "timestamp": "2026-09-20T14:30:00Z",
    "source": "whatsapp_web",
    "externalMessageId": "wamid.12345",
    "text": "Hello, I would like to book a room"
  }'
```

**Expected Response** (if Option B chosen):
```json
{
  "success": false,
  "error": "Message body content not allowed for source=whatsapp_web (metadata-only)"
}
```

**Or** (if Option A chosen): Silently strips `text` field and processes normally.

## Implementation Notes

- **Source Validation**: Check `payload.source === 'whatsapp_web'` early in handler
- **Phone Normalization**: Use `normalizeZaE164(payload.from)` before allowlist checks
- **Existing Patterns**: Follow same structure as Twilio webhook handling in current route
- **No New Endpoint**: Reuse existing `/api/inbound/webhook` with conditional logic
