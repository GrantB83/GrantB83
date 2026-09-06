# CoS Integration Guide — GuestFlow

**Version:** P1  
**Audience:** CoS (Chief of Staff) Bot and integration engineers  
**Purpose:** Document the always-on inbound webhook flow for autonomous guest message handling

---

## Overview

GuestFlow provides an **always-on inbound webhook** at `/api/inbound/webhook` that:
1. Receives WhatsApp messages from old number (+27836458313) or Guests WhatsApp group
2. Auto-classifies intent (booking_inquiry, date_query, existing_guest, outlier_exception, spam)
3. Auto-generates draft replies using rate cards + playbooks (never invents data)
4. Queues drafts in "Needs approval" for human review
5. Creates Exception tickets for missing data, timeouts, or unhandled cases

**Key principle:** AI works in the background. Humans only approve drafts or handle outliers. No silent drops. No auto-send.

---

## Inbound Webhook Endpoint

### POST `/api/inbound/webhook`

**Headers:**
```
Content-Type: application/json
x-webhook-secret: <INBOUND_WEBHOOK_SECRET>
```

**Request Body:**
```json
{
  "from": "+27836458313",
  "fromName": "John Smith",
  "text": "Hi, do you have availability for 2 adults from Dec 15-17?",
  "timestamp": "2026-09-06T14:30:00Z",
  "source": "whatsapp_old_number",
  "metadata": {
    "messageId": "wamid.ABC123",
    "groupId": null
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "messageId": 12345,
  "classified": true,
  "intent": "booking_inquiry",
  "confidence": 0.92,
  "draftCreated": true,
  "queuedForApproval": true
}
```

**Response (Exception Raised):**
```json
{
  "success": true,
  "messageId": 12346,
  "classified": true,
  "intent": "booking_inquiry",
  "exception": {
    "ticketId": 789,
    "category": "missing_rate_card",
    "reason": "No rate card found for Riverside Lodge, Dec 15-17",
    "nextStep": "Upload rate card in /ops/rate-cards or manually quote"
  }
}
```

---

## Classification Intent Types

| Intent | Trigger | AI Action | Output | Exception If |
|--------|---------|-----------|--------|--------------|
| **booking_inquiry** | Dates + guests mentioned | Extract dates/guests/property → Check rate card → Draft quote | Quote draft in Needs approval | Missing rate card → Exception ticket |
| **date_query** | "Do you have availability for..." | Check NB calendar → Draft yes/no | Availability draft | No calendar data |
| **suite_preference** | "What suites do you have?" | List properties from DB → Draft info | Property info draft | No properties configured |
| **existing_guest** | "I'm checking in" or returning guest | Match to NB booking → Draft welcome/late | Welcome/late draft | No booking found → Exception |
| **outlier_exception** | Lost key, gate access, maintenance, etc. | Classify category → Draft guest reply + staff brief | Ticket with 2 drafts | Always creates ticket (by design) |
| **spam** | Promotional, marketing, wrong number | Mark as spam | Nothing (auto-closed, not queued) | N/A |

---

## Rate Card Requirement

**Hard rule:** GuestFlow **never invents rates**. If a booking inquiry arrives and no rate card exists for the requested property + dates, the system:

1. **Does NOT draft a quote**
2. **Creates an Exception ticket** with:
   - Category: `missing_rate_card`
   - What asked: Original inquiry text
   - What AI found: Extracted dates/guests/property
   - Why stopped: "No rate card for [property] on [dates]"
   - Next step: "Upload rate card or manually quote"
3. **Queues the exception** in the Exceptions page
4. **Does NOT queue** in Needs approval (no draft to approve)

**Rate cards are uploaded at:** `/ops/rate-cards`

---

## Timeout Handling (P1)

If classification or draft generation takes > 30 seconds (e.g., external API timeout, slow NB query):

1. **Holds the partial draft** (if any)
2. **Never silent drops** the message
3. **Never auto-sends** a broken/incomplete draft
4. **Creates Exception ticket:**
   - Category: `timeout`
   - What asked: Original message
   - What AI found: Partial context (if any)
   - Why stopped: "Classification timeout after 30s"
   - Next step: "Manual review and classify"
5. **Queues in Exceptions** page → Filter "timeout"

**Human action:** Triage the timeout exception, manually classify, then draft reply.

---

## Auto-Enqueue from NightsBridge (P1)

When NB CSV is uploaded via `/ops/nightsbridge-import` or `/api/cron/nightsbridge-ingest`:

1. **Parse bookings** → Check for arrivals in next 24-48h
2. **Auto-generate welcome drafts** for same-day/next-day arrivals
3. **Auto-generate late check-in drafts** for guests who haven't arrived by check-in time + 2h
4. **Queue in Needs approval** with type `welcome` or `late_checkin`
5. **Sources show:** "NightsBridge sync YYYY-MM-DD HH:MM"

**NB sync schedule:** 05:00 and 19:00 SAST daily (Vercel cron)

---

## Never Auto-Send Rule

**All drafts are human-gated.**

- **Approve action** in Needs approval page marks draft as "approved"
- **It does NOT send** the message automatically
- Staff must:
  1. Copy the approved draft
  2. Manually send via WhatsApp or email
  3. (Future: Approved drafts may call `/api/whatsapp/send` with `H1` gate in sandbox mode)

**Sandbox mode (current):** Even after approval, `/api/whatsapp/send` logs a dry-run success without calling Meta API.

**Live mode (future):** After Meta WABA approval, `/api/whatsapp/send` will call WhatsApp Cloud API, but **only after human approve + explicit send action**.

---

## Guests WhatsApp Group Context

If messages come from the **Guests WhatsApp group** (not the old number):

1. **Check-in events** are inferred from:
   - "We've arrived"
   - "Just checked in"
   - Guest name + property match
2. **Late check-in detection**:
   - NB booking exists for today
   - Check-in time passed + 2h
   - No check-in event in group
   - → Auto-generate late check-in instructions draft
3. **Guest problems** (lost key, gate access, etc.) → Always create Exception ticket

**Group message classification uses same intent engine + context from NB bookings.**

---

## CoS Bridge vs Direct WABA

**Option A: CoS Bridge (Current)**
- CoS Bot watches WhatsApp
- Forwards messages to GuestFlow webhook
- GuestFlow returns draft
- CoS Bot holds draft until human approves in GuestFlow UI
- Human clicks "Approve" in GuestFlow → CoS Bot sends via its own WhatsApp session

**Option B: Direct WABA (Future)**
- WhatsApp Business API webhook → GuestFlow `/api/inbound/webhook`
- GuestFlow auto-classifies + drafts
- Human approves in GuestFlow UI
- GuestFlow calls `/api/whatsapp/send` → Meta WhatsApp Cloud API
- Still human-gated (sandbox mode until WABA live)

**Current status:** CoS Bridge is recommended until WABA is approved and Sandbox mode is disabled.

---

## Audit Log

All approval actions are logged in `audit_log` table:

| Field | Example |
|-------|---------|
| actor | "Grant" or "Liana" or "CoS Bot" |
| action | "approve", "reject", "escalate", "edit_and_approve" |
| item_type | "approval", "exception", "inbound" |
| item_id | Message ID or Ticket ID |
| content_before | Original draft (if edited) |
| content_after | Edited draft (if edited) |
| timestamp | ISO 8601 |

**Access audit log at:** `/api/audit-log` (future admin page)

---

## Security

**Webhook authentication:**
- Requires `x-webhook-secret` header
- Secret stored in `INBOUND_WEBHOOK_SECRET` env var (Vercel/Fly.io)
- Rotate quarterly or if compromised

**Sandbox mode:**
- `WHATSAPP_MODE=sandbox` (default)
- All `/api/whatsapp/send` calls log dry-run success without hitting Meta API
- Safe for demos and testing

**Live mode:**
- `WHATSAPP_MODE=live` (only after Meta WABA approval)
- Requires `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`
- Still human-gated: Approve in UI → Manual send action

---

## Testing the Webhook

**1. Send a test booking inquiry:**
```bash
curl -X POST https://guestflow.thebrowns.co.za/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET" \
  -d '{
    "from": "+27123456789",
    "fromName": "Test Guest",
    "text": "Hi, do you have availability for 2 adults from Dec 25-27?",
    "timestamp": "2026-09-06T14:30:00Z",
    "source": "test",
    "metadata": {}
  }'
```

**2. Check Needs approval page:**
- Should see a quote draft (if rate card exists)
- OR see an Exception ticket (if no rate card)

**3. Approve the draft:**
- Click item → Press **A** or click "Approve"
- Check that status changes to "approved"
- Verify draft does NOT auto-send

**4. Check audit log:**
- Query `/api/audit-log?item_id=<messageId>`
- Verify actor, action, timestamp recorded

---

## FAQ

**Q: What if a guest asks about something not in the playbook?**  
A: Creates an Exception ticket with category `general_problem`. Human triages and drafts manual reply.

**Q: What if NightsBridge data is stale (> 12h old)?**  
A: Today page shows "Stale" badge. Welcome/late drafts may be incomplete. Human should upload fresh NB CSV.

**Q: What if the webhook receives spam?**  
A: Auto-classified as `spam`, marked closed, never queued. Not visible in Needs approval.

**Q: What if a draft is edited before approval?**  
A: Audit log stores `content_before` (original AI draft) and `content_after` (human-edited version).

**Q: Can CoS Bot auto-approve low-confidence drafts?**  
A: No. All drafts require human approval in GuestFlow UI. CoS Bot may flag low-confidence for faster human attention.

**Q: What happens if webhook is down?**  
A: Messages buffer in CoS Bot or WABA queue. When webhook recovers, backlog is processed. No silent drops.

---

## Next Steps for CoS Integration

1. **Share webhook URL + secret** with CoS Bot team
2. **Configure CoS Bot** to forward WhatsApp messages to webhook
3. **Test with sample messages** (booking inquiry, spam, existing guest)
4. **Verify Needs approval queue** populates correctly
5. **Train staff** on Approve/Edit/Reject/Escalate workflow
6. **Monitor Exceptions** for missing rate cards and timeouts
7. **Set up NB cron** (05:00 and 19:00 SAST) for auto-welcome/late drafts
8. **Go live** once sample approvals are working smoothly

---

**Contact:** grant@thebrowns.co.za  
**Last updated:** 2026-09-06 (P1 release)
