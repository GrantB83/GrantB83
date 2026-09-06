# CoS Integration Guide — POST Messages to GuestFlow

**Audience:** CoS/SA Ops (bridge implementer)  
**Purpose:** Exact URL, auth header, and JSON schema to POST WhatsApp messages into GuestFlow  
**Updated:** 2026-12-10 (includes guests group + outlier extensions)

---

## Ingest Endpoint

### Production URL

```
POST https://guestflow.thebrowns.co.za/api/inbound/webhook
```

### Authentication

**Header:**
```
Authorization: Bearer <INBOUND_WEBHOOK_SECRET>
```

**Secret location:** Vercel Environment Variables (Grant has this)

**Example:**
```bash
Authorization: Bearer abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

---

## JSON Schema

### Required Fields

```json
{
  "from": "string (required)",
  "text": "string (required)",
  "timestamp": "string (required, ISO8601)"
}
```

### Optional Fields

```json
{
  "source": "string (optional, default: 'legacy_wa')",
  "mediaRefs": ["string array (optional)"],
  "externalMessageId": "string (optional, for deduplication)"
}
```

### Complete Example

```json
{
  "from": "+27836458313",
  "text": "Hi, I would like to book The Browns for 15-17 December, 2 adults",
  "timestamp": "2026-12-10T14:30:00Z",
  "source": "legacy_wa",
  "mediaRefs": [],
  "externalMessageId": "wa-msg-abc123"
}
```

---

## Field Specifications

| Field | Type | Required | Format | Description |
|-------|------|----------|--------|-------------|
| `from` | string | ✅ YES | `+27XXXXXXXXX` | Phone number with + prefix, or email address |
| `text` | string | ✅ YES | UTF-8 text | Message body (plain text, no HTML) |
| `timestamp` | string | ✅ YES | ISO8601 | When message was received: `YYYY-MM-DDTHH:MM:SSZ` |
| `source` | string | ❌ NO | enum | `legacy_wa`, `guests_group`, `twilio_waba`, `email_forward`, `manual_paste` (default: `legacy_wa`) |
| `mediaRefs` | array | ❌ NO | URL strings | Array of media URLs (photos, PDFs) |
| `externalMessageId` | string | ❌ NO | any string | Unique ID for deduplication (prevents duplicate processing) |

### `source` Values

| Source | When to Use | Description |
|--------|-------------|-------------|
| `legacy_wa` | Old WhatsApp number DMs | Direct messages from +27836458313 (entrypoint/migrate only) |
| `guests_group` | Guests WhatsApp group | Messages from The Browns' guests group (for check-in inference) |
| `twilio_waba` | NEW Twilio number (future) | When NEW Twilio/WABA number is live (preferred long-term) |
| `email_forward` | Email bridge | If forwarding via email |
| `manual_paste` | Manual entry | Staff manually entering messages |

**CoS Note:** Use `source=guests_group` for messages from the guests WhatsApp group. This triggers check-in inference logic.

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
      "guestName": "John Smith"
    },
    "missingFields": []
  },
  "draftReply": {
    "text": "Hi John Smith,\n\nThank you for your interest...",
    "requiresApproval": true,
    "missingInfo": ["rate_card"]
  },
  "checkinEvent": null,
  "ticket": null,
  "status": "drafted"
}
```

### Success with Check-in Event (200 OK)

From `source=guests_group`:

```json
{
  "success": true,
  "messageId": 124,
  "threadId": 46,
  "classification": {
    "intent": "checkin_event",
    "confidence": 0.85,
    "extractedData": {
      "eventType": "arrived",
      "guestName": "John Smith"
    }
  },
  "draftReply": null,
  "checkinEvent": {
    "id": 1,
    "eventType": "arrived",
    "matchedBooking": {
      "id": 10,
      "guestName": "John Smith"
    },
    "confidence": 0.85
  },
  "ticket": null,
  "status": "classified"
}
```

### Success with Outlier Ticket (200 OK)

For guest problem/request:

```json
{
  "success": true,
  "messageId": 125,
  "threadId": 47,
  "classification": {
    "intent": "outlier_exception",
    "confidence": 0.9,
    "extractedData": {
      "outlierCategory": "lost_key"
    }
  },
  "draftReply": {
    "text": "Hi there,\n\nSo sorry to hear about the key issue!...",
    "requiresApproval": true,
    "missingInfo": ["spare_key_location"]
  },
  "checkinEvent": null,
  "ticket": {
    "id": 1,
    "category": "lost_key",
    "priority": "high",
    "guestDraftReply": "Hi there, ...",
    "staffBrief": "🔑 LOST KEY — Guest cannot access room...",
    "staffBriefReady": false,
    "askStaffFlags": ["spare_key_location", "staff_availability"]
  },
  "status": "drafted"
}
```

### Duplicate (200 OK)

If `externalMessageId` already processed:

```json
{
  "success": true,
  "duplicate": true,
  "messageId": 123
}
```

### Error (400 Bad Request)

Missing required fields:

```json
{
  "success": false,
  "error": "Missing required fields: from, text, timestamp"
}
```

### Error (401 Unauthorized)

Invalid or missing auth token:

```json
{
  "success": false,
  "error": "Unauthorized - invalid webhook secret"
}
```

### Error (500 Internal Server Error)

Server error:

```json
{
  "success": false,
  "error": "Failed to process message"
}
```

---

## CoS Bridge Examples

### Example 1: Old WhatsApp Number DM (Booking Inquiry)

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/inbound/webhook \
  -H "Authorization: Bearer <INBOUND_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "text": "Hi, I would like to book The Browns for 20-22 December for 2 adults. Do you have availability?",
    "timestamp": "2026-12-10T10:30:00Z",
    "source": "legacy_wa",
    "externalMessageId": "wa-dm-abc123"
  }'
```

**Expected:** Booking inquiry classified, draft reply generated with `[RATE CARD REQUIRED]`

---

### Example 2: Guests Group Message (Check-in Event)

**CoS Note:** This is how you POST messages from The Browns' guests WhatsApp group.

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/inbound/webhook \
  -H "Authorization: Bearer <INBOUND_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27829876543",
    "text": "Hi everyone, John Smith here, just arrived at The Browns! Beautiful place!",
    "timestamp": "2026-12-10T15:30:00Z",
    "source": "guests_group",
    "externalMessageId": "wa-group-msg-456"
  }'
```

**Expected:** Check-in event detected, guest matched to NightsBridge booking, late-checkin flag updated

**How it works:**
1. GuestFlow detects "arrived" keyword
2. Extracts guest name "John Smith"
3. Matches to NightsBridge booking for today
4. Stores check-in event
5. Updates late-checkin queue (removes from "needs instructions" if present)

---

### Example 3: Outlier Ticket (Lost Key)

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/inbound/webhook \
  -H "Authorization: Bearer <INBOUND_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821111111",
    "text": "Help! I lost the key to my room",
    "timestamp": "2026-12-10T18:00:00Z",
    "source": "legacy_wa",
    "externalMessageId": "wa-dm-lost-key-789"
  }'
```

**Expected:** 
- Outlier ticket created (category: `lost_key`, priority: `high`)
- **Guest draft reply** generated (approve before sending to guest)
- **Staff brief** generated for Admin - The Browns (NO AUTO-SEND, draft only)

**Staff Brief Example:**
```
🔑 LOST KEY — Guest (The Browns)

**Issue:** Guest cannot access room
**Status:** new
**Priority:** HIGH

**Action Required:**
- [ ] Check spare key availability: [SPARE KEY LOCATION - ASK STAFF]
- [ ] Contact guest to confirm location
- [ ] Arrange key delivery or replacement
- [ ] If after-hours: [MAINTENANCE CONTACT - ASK STAFF]

**Guest Contact:** +27821111111
**Time:** 2026-12-10T18:00:00Z
```

**CoS Note:** Staff brief is a DRAFT for Admin - The Browns channel/group. Do NOT auto-post. Show in GuestFlow ops UI for staff approval.

---

## Integration Notes for CoS

### 1. Guests Group Check-in (CoS Confirmed)

**Current:** Existing after-hours check-in drafts assume NightsBridge bookings only.

**Updated:** Guests group "not checked in" signal now **augments/replaces** NightsBridge-only late-checkin targeting.

**How it works:**
- GuestFlow queries NightsBridge bookings (arriving today)
- GuestFlow checks guests group messages for check-in events
- If no "arrived" message from a guest, they're flagged `needsLateCheckinInstructions`
- Late check-in drafts target ONLY guests without check-in confirmation from group

**CoS Action:** POST all guests group messages with `source=guests_group` so GuestFlow can track who has/hasn't checked in.

---

### 2. Outlier Staff Briefs (CoS Confirmed)

**All outlier tickets generate TWO drafts:**

1. **Guest reply** (approve-gated, NEVER auto-sent to guest)
2. **Staff brief** (draft for Admin - The Browns, NO AUTO-SEND)

**Staff brief destinations:**
- Admin - The Browns WhatsApp channel/group
- Internal staff communication
- Maintenance contact (for urgent issues)

**CoS Note:** Staff briefs are DRAFTS ONLY. They appear in GuestFlow `/ops/inbound-queue` → Tickets view for staff to review and manually post to Admin channel.

**Do NOT auto-post to any channel.** Staff must approve first.

---

### 3. Deduplication

Use `externalMessageId` to prevent processing the same message twice:

```javascript
// Example: Track processed messages
const processedIds = new Set()

function forwardMessage(msg) {
  const msgId = `wa-${msg.id}`
  
  if (processedIds.has(msgId)) {
    console.log('Already processed, skipping')
    return
  }
  
  axios.post('https://guestflow.thebrowns.co.za/api/inbound/webhook', {
    from: msg.from,
    text: msg.body,
    timestamp: new Date().toISOString(),
    source: msg.isGroup ? 'guests_group' : 'legacy_wa',
    externalMessageId: msgId
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.INBOUND_WEBHOOK_SECRET}`
    }
  })
  
  processedIds.add(msgId)
}
```

---

### 4. Error Handling

```javascript
async function forwardMessage(msg) {
  try {
    const response = await axios.post(
      'https://guestflow.thebrowns.co.za/api/inbound/webhook',
      { /* payload */ },
      { headers: { 'Authorization': `Bearer ${process.env.INBOUND_WEBHOOK_SECRET}` } }
    )
    
    if (response.data.success) {
      console.log('✅ Forwarded:', response.data.messageId)
      
      if (response.data.ticket) {
        console.log('🎫 Ticket created:', response.data.ticket.category)
      }
      
      if (response.data.checkinEvent) {
        console.log('✅ Check-in recorded:', response.data.checkinEvent.eventType)
      }
    } else {
      console.error('❌ Failed:', response.data.error)
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ Auth failed - check INBOUND_WEBHOOK_SECRET')
    } else {
      console.error('❌ Network error:', error.message)
    }
  }
}
```

---

## Testing (CoS)

### 1. Health Check

```bash
curl https://guestflow.thebrowns.co.za/api/inbound/webhook
```

**Expected:**
```json
{
  "service": "GuestFlow Inbound Webhook",
  "version": "1.0",
  "status": "ready",
  "accepts": "POST with Bearer token",
  "secured": true
}
```

### 2. Test POST (without auth)

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{"from": "+27821234567", "text": "test", "timestamp": "2026-12-10T10:00:00Z"}'
```

**Expected:** `401 Unauthorized` (if `INBOUND_WEBHOOK_SECRET` is set)

### 3. Test POST (with auth)

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/inbound/webhook \
  -H "Authorization: Bearer <INBOUND_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "text": "Test message from CoS",
    "timestamp": "2026-12-10T10:00:00Z",
    "source": "manual_paste"
  }'
```

**Expected:** `200 OK` with classification result

---

## Summary for CoS

**What you need:**
1. ✅ URL: `https://guestflow.thebrowns.co.za/api/inbound/webhook`
2. ✅ Auth header: `Authorization: Bearer <INBOUND_WEBHOOK_SECRET>`
3. ✅ JSON payload: `{from, text, timestamp, source?, mediaRefs?, externalMessageId?}`

**Source values:**
- `legacy_wa` — Old number DMs (entrypoint/migrate)
- `guests_group` — The Browns' guests group (check-in inference)
- `twilio_waba` — NEW number (future preferred)

**What GuestFlow does:**
1. Classifies message (booking, check-in event, outlier, spam)
2. Generates drafts (guest reply, staff brief if outlier)
3. Stores in database
4. Shows in `/ops/inbound-queue` for staff review
5. **NO AUTO-SEND** — All drafts require human approval

**What you DO NOT need to do:**
- ❌ No WhatsApp Web scraping (optional/fragile)
- ❌ No classification logic (GuestFlow does this)
- ❌ No draft generation (GuestFlow does this)
- ✅ Just POST messages with correct `source` value

**When to POST:**
- Every message from old number (+27836458313)
- Every message from guests WhatsApp group (critical for check-in tracking)
- Future: Every message from NEW Twilio/WABA number

**Result:**
- Staff reviews everything in `/ops/inbound-queue`
- Guest replies approved before sending
- Staff briefs approved before posting to Admin - The Browns
- Late check-in instructions generated for guests who haven't checked in (via guests group signals)

---

## Support

**Questions:** grant@thebrowns.co.za  
**Repo:** https://github.com/GrantB83/GrantB83 — apps/guestflow  
**Docs:** `docs/INBOUND-WHATSAPP-WEBHOOK.md` (full API reference)

---

**Last Updated:** 2026-12-10 — CoS integration guide with guests group + outliers
