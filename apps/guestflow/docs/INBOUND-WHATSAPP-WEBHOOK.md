# Inbound WhatsApp Webhook Integration Guide

**Purpose:** Document the source-agnostic ingest API for messages into GuestFlow  
**Status:** Ready for any bridge (Twilio webhooks preferred, manual paste for migration)  
**Security:** Requires `INBOUND_WEBHOOK_SECRET` environment variable

---

## Overview

GuestFlow provides a **solid core ingest/classify/draft/ops queue pipeline** that accepts normalized message payloads from ANY source. Messages are:

1. ✅ **Persisted** to database with thread grouping and deduplication
2. ✅ **Classified** using heuristic rules (booking inquiry, dates, suite, spam)
3. ✅ **Auto-drafted** replies (NEVER auto-sent; human approval required)
4. ✅ **Queued** for staff review at `/ops/inbound-queue`

**Source-Agnostic Design:**
- Accepts normalized JSON payload from any bridge
- Twilio/WABA webhooks (preferred long-term)
- Manual paste (migration/testing)
- Email forward, SMS, or other integrations
- Does NOT depend on WhatsApp Web scraping

**Hard Constraints (CoS Confirmed):**
- Old number (+27836458313) is **entrypoint/migrate only** — do NOT convert to WhatsApp Cloud API
- **NEVER auto-send** replies (all outputs are drafts; human approval required)
- **NEW Twilio/WABA number (pending) is preferred path** for future outbound webhooks
- Do NOT depend on WhatsApp Web scraping as long-term SoT
- CoS Web-bridge is **optional/fragile** — only if Grant asks before WABA live
- This webhook accepts normalized payloads from any source (Twilio webhooks preferred, manual paste for migration)

---

## Webhook Endpoint

```
POST https://guestflow.thebrowns.co.za/api/inbound/webhook
```

**Authentication:** Bearer token in `Authorization` header

```bash
Authorization: Bearer <INBOUND_WEBHOOK_SECRET>
```

---

## Payload Schema

```json
{
  "from": "+27836458313",
  "text": "Hi, I'd like to book the Browns for 15-17 Dec, 2 adults",
  "timestamp": "2026-12-10T14:30:00Z",
  "source": "legacy_wa",
  "mediaRefs": ["https://wa.me/media/xyz123"],
  "externalMessageId": "unique-msg-id-123"
}
```

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `from` | ✅ | string | Phone number with `+` or email address |
| `text` | ✅ | string | Message body (plain text) |
| `timestamp` | ✅ | string | ISO8601 datetime when message received |
| `source` | ❌ | string | Default `legacy_wa`. Options: `legacy_wa`, `twilio_sms`, `email_forward`, `manual_paste` |
| `mediaRefs` | ❌ | string[] | URLs to attached media (photos, PDFs) |
| `externalMessageId` | ❌ | string | Unique ID for deduplication |

---

## Response Schema

### Success (200 OK)

```json
{
  "success": true,
  "messageId": 123,
  "threadId": 45,
  "classification": {
    "intent": "booking_inquiry",
    "confidence": 0.85,
    "extractedData": {
      "checkIn": "15 Dec",
      "checkOut": "17 Dec",
      "adults": 2,
      "property": "browns"
    },
    "missingFields": ["guest_name", "check_out"]
  },
  "draftReply": {
    "text": "Hi there,\n\nThank you for your interest...",
    "requiresApproval": true,
    "missingInfo": ["guest_name", "rate_card"]
  },
  "status": "drafted"
}
```

### Duplicate (200 OK)

```json
{
  "success": true,
  "duplicate": true,
  "messageId": 123
}
```

### Error (400/401/500)

```json
{
  "success": false,
  "error": "Missing required fields: from, text, timestamp"
}
```

---

## Classification Intents

| Intent | Description | Example Signal |
|--------|-------------|----------------|
| `booking_inquiry` | Guest wants to book | "book", "reserve", "availability" + dates |
| `date_query` | Only asking about dates | Dates mentioned but no "book" keywords |
| `suite_preference` | Asking about properties | "browns", "rivendell", "trout", "suite" |
| `existing_guest` | Returning customer | "stayed before", "previous", "returning" |
| `general_question` | Other inquiry | No clear booking intent |
| `spam` | Promotional/spam | "congratulations", "winner", "prize", "bitcoin" |
| `unknown` | Cannot classify | Low confidence on all rules |

---

## Example curl Commands

### Basic Booking Inquiry

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/inbound/webhook \
  -H "Authorization: Bearer your_secret_here" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27836458313",
    "text": "Hi, I would like to book The Browns for 20-22 December for 2 adults. Do you have availability?",
    "timestamp": "2026-12-10T10:30:00Z",
    "source": "legacy_wa"
  }'
```

### Date Query

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/inbound/webhook \
  -H "Authorization: Bearer your_secret_here" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "text": "Are you available from 25 Jan to 28 Jan?",
    "timestamp": "2026-12-10T11:00:00Z",
    "source": "legacy_wa"
  }'
```

### Existing Guest

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/inbound/webhook \
  -H "Authorization: Bearer your_secret_here" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27829876543",
    "text": "Hi, I stayed with you last year. Can I book again for February?",
    "timestamp": "2026-12-10T12:00:00Z",
    "source": "legacy_wa",
    "externalMessageId": "wa-msg-abc123"
  }'
```

---

## Bridge Options (CoS Confirmed Priority)

**Preferred Path:** Twilio/WABA webhooks on NEW number (when live) → GuestFlow webhook  
**Migration Path:** Manual paste or optional CoS forwarder for old number → GuestFlow webhook

### ✅ Option A: Manual Paste (Immediate, Migration Only)

**Use for:** Migrating existing messages from old number to GuestFlow

1. Copy message from WhatsApp Web
2. Go to `/ops/inbound-queue` (future: add "Paste Message" button)
3. Paste text, fill from/timestamp
4. Click "Submit" → API call to webhook

**Status:** Works today, safe for migration period

---

### ⭐ Option B: Twilio/WABA Webhooks (PREFERRED — Future)

**Use for:** NEW Twilio SA number inbound messages (long-term solution)

When NEW Twilio/WABA number is live, configure webhook:

```python
# Flask/FastAPI webhook: Twilio → GuestFlow
from flask import Flask, request
import requests

@app.route('/twilio-inbound', methods=['POST'])
def twilio_webhook():
    msg = request.form
    requests.post('https://guestflow.thebrowns.co.za/api/inbound/webhook', json={
        'from': msg['From'],
        'text': msg['Body'],
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'source': 'twilio_waba',
        'externalMessageId': msg['MessageSid']
    }, headers={
        'Authorization': f'Bearer {os.getenv("INBOUND_WEBHOOK_SECRET")}'
    })
    return '<Response></Response>'
```

**Status:** Waiting on NEW number setup + WABA approval

---

### ⚠️ Option C: CoS WhatsApp Web Forwarder (OPTIONAL/FRAGILE)

**⚠️ WARNING:** Do NOT depend on this as long-term SoT. Only use if Grant explicitly requests before WABA is live.

**Why fragile:**
- WhatsApp Web updates break scrapers frequently
- Not officially supported by Meta
- Rate limits and blocks are common
- Maintenance burden

**Example (if Grant requests):**

```javascript
// Node.js script on CoS machine (OPTIONAL, NOT RECOMMENDED)
const axios = require('axios')

async function forwardWhatsAppMessage(msg) {
  await axios.post('https://guestflow.thebrowns.co.za/api/inbound/webhook', {
    from: msg.from,
    text: msg.body,
    timestamp: new Date().toISOString(),
    source: 'legacy_wa',
    externalMessageId: msg.id
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.INBOUND_WEBHOOK_SECRET}`
    }
  })
}
```

**Status:** Optional, only if Grant asks. Prefer manual paste until WABA live.

---

### 📧 Option D: Email Forward (Manual Fallback)

Forward WhatsApp screenshots or copy-paste to monitored email, then parse and POST.

**Status:** Manual fallback only

---

## Viewing Inbound Queue

Staff access: `https://guestflow.thebrowns.co.za/ops/inbound-queue`

**Features:**
- Mobile-friendly layout
- Filter by status: new, classified, drafted, approved, sent, closed
- View classification (intent, confidence, extracted data)
- Read draft replies
- Approve or close threads
- Refresh queue

**Status Flow:**
```
new → classified → drafted → approved → sent/failed
  ↘                                      ↓
    closed ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

---

## Environment Variables

Add to `.env` (development) or Vercel Environment Variables (production):

```bash
# Required for webhook security
INBOUND_WEBHOOK_SECRET=your_long_random_secret_here_min_32_chars

# Optional: disable auth for local testing (NOT recommended)
# Omit INBOUND_WEBHOOK_SECRET to allow unauthenticated requests
```

Generate secret:
```bash
openssl rand -base64 32
```

---

## Testing Locally

### 1. Run GuestFlow dev server

```bash
cd apps/guestflow
npm run db:init  # First time only
npm run dev
```

### 2. Open inbound queue

Visit: http://localhost:3100/ops/inbound-queue

### 3. POST test message

```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "text": "Hi, can I book for 15-17 Dec?",
    "timestamp": "2026-12-10T10:00:00Z",
    "source": "manual_paste"
  }'
```

### 4. Refresh queue page

You should see the new thread with classification and draft reply.

---

## Security Notes

1. **NEVER expose INBOUND_WEBHOOK_SECRET** in git, logs, or public repos
2. Use HTTPS only (Vercel provides free SSL)
3. Webhook validates Bearer token on every request
4. Guest data (names, phone numbers) stored in Turso DB (private)
5. Draft replies are NEVER auto-sent — staff approval required

---

## Troubleshooting

### Webhook returns 401 Unauthorized

- Check `Authorization: Bearer <secret>` header is present
- Verify secret matches `INBOUND_WEBHOOK_SECRET` env var
- Try omitting secret for local dev (only if `INBOUND_WEBHOOK_SECRET` is not set)

### Classification confidence is low (< 0.6)

- Expected for unclear messages
- Thread stays in `new` status until manually reviewed
- Staff can still approve draft reply from queue UI

### Draft reply shows `[RATE CARD REQUIRED]`

- Correct behavior — system never invents rates
- Staff must look up rate card and manually edit reply before sending

### No draft generated

- If intent is `spam`, no draft is created (correct)
- Thread auto-closed to `closed` status

---

## Next Steps

1. **Grant/CoS:** Choose bridge option (A/B/C/D) for old WhatsApp number
2. **Grant:** Set `INBOUND_WEBHOOK_SECRET` in Vercel env
3. **SA Ops:** Bookmark `/ops/inbound-queue` for daily review
4. **Future:** When Twilio WABA is live, connect approved replies to outbound send API

---

## Support

**Owner:** Grant Brown  
**Contact:** grant@thebrowns.co.za  
**Repo:** https://github.com/GrantB83/GrantB83  
**App:** apps/guestflow

---

**Last Updated:** 2026-12 (Inbound pipeline build)
