# Extension: Guests Group & Outlier Resolution Pipeline

**Date:** 2026-12-10 (Extension to Inbound WhatsApp Pipeline PR)  
**Added by:** Grant's requirements  
**Purpose:** Handle guests WhatsApp group context for late check-in + outlier/exception guest messages

---

## What Was Added

This extension builds on the core inbound pipeline (messages, classification, drafts, ops queue) with two major features:

### 1. **Guests WhatsApp Group — Late Check-in Tracking**

Ingest structured events/messages from Browns' guests WhatsApp group to infer who has/hasn't checked in.

**Key Capabilities:**
- ✅ Detect check-in events: `arrived`, `in_house`, `late_arrival`, `checked_out`
- ✅ Match guest names from group messages to NightsBridge bookings
- ✅ Infer check-in status WITHOUT inventing check-ins
- ✅ Auto-flag guests needing late check-in instructions (2h+ past check-in time, not yet arrived)
- ✅ Wire to existing late-checkin/welcome-draft patterns
- ✅ Ops UI filter: `needs_late_checkin` view

**Sources:**
- `source=guests_group` messages via same inbound webhook
- NightsBridge bookings (arriving today / in-house)
- Check-in inference matches guest names to bookings

**CoS Note (Confirmed):**
Existing after-hours check-in drafts currently assume NightsBridge bookings only. Guests group "not checked in" signal now **augments/replaces** that for late-checkin targeting.

**How it works:**
1. Query NightsBridge bookings for today's arrivals
2. Check guests group messages for check-in events (who said they arrived)
3. If no "arrived" message from a guest → flag `needsLateCheckinInstructions`
4. Late check-in drafts target ONLY guests without check-in confirmation from group

**Hard Rules:**
- ❌ DO NOT invent check-ins
- ❌ Only infer from actual group messages
- ✅ Late-checkin instructions target ONLY guests not yet checked in (per guests group signals)

---

### 2. **Outlier/Exception Guest Messages → Resolution Pipeline**

Classify and handle guest problems/requests with ticket system and dual-draft generation.

**Categories (8 types):**
1. 🔑 **lost_key** — Guest locked out / lost room key (HIGH priority)
2. 🚪 **gate_access** — Can't open gate / entry code issues (HIGH priority)
3. 📍 **cant_find_entrance** — Lost / confused about location (MEDIUM priority)
4. ❄️ **refrigerator_space** — Extra cold storage request (LOW priority)
5. 🍽️ **restaurant_recs** — Dining recommendations (LOW priority)
6. 🎉 **special_event** — Birthday, anniversary, celebration (MEDIUM priority)
7. 🔧 **maintenance_other** — Broken / not working / repair needed (HIGH priority)
8. ❓ **general_problem** — Other guest issue / help request (MEDIUM priority)

**Resolution Pipeline:**

```
Inbound message (DM or group)
  ↓
Classify into outlier category
  ↓
Create GuestFlow ops ticket
  ↓
Generate TWO drafts autonomously:
  1. Guest reply (approve-gated, never auto-sent to guest)
  2. Staff/maintenance brief (draft for Admin - The Browns, NO AUTO-SEND)
  ↓
Status flow: new → triaged → staff_notified → in_progress → resolved
  ↓
Staff reviews in /ops/inbound-queue → Tickets view
  ↓
Approve guest reply + manually post staff brief to Admin - The Browns
```

**CoS Note (Confirmed):**
Outlier staff/maintenance briefs are **drafts for Admin - The Browns** (WhatsApp channel/group for internal staff communication). These are NEVER auto-posted. Staff must approve and manually forward to the Admin channel.

**Playbooks/Templates:**
- Each category has guest reply template + staff brief template
- Uses known Browns facts only (property name, location, check-in times)
- Flags `[ASK STAFF]` for unknown info (gate codes, contacts, restaurant lists)
- NEVER invents rates, contacts, or policies
- Escalation path included (maintenance contact stub, special-request packet)

**Hard Rules:**
- ❌ NO guest auto-send (all drafts require approval)
- ❌ NO invented rates or policies
- ❌ WhatsApp Web not scraped in-repo
- ✅ CoS/API feed only (same webhook as core inbound)

---

## Database Schema (3 New Tables)

**Migration:** `scripts/migrate-add-guest-tickets.js`  
**Run:** `npm run db:migrate:tickets`

### Table: `guest_tickets`

Outlier/exception cases with status flow.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Ticket ID |
| tenant_id | INTEGER FK | Tenant |
| thread_id | INTEGER FK | Link to inbound_threads |
| booking_id | INTEGER FK | Link to bookings (if matched) |
| guest_name | TEXT | Guest name |
| guest_phone | TEXT | Guest phone |
| category | TEXT | Outlier category (lost_key, gate_access, etc.) |
| priority | TEXT | low, medium, high, urgent |
| status | TEXT | new, triaged, staff_notified, in_progress, resolved |
| subject | TEXT | Ticket subject |
| description | TEXT | Issue description |
| guest_draft_reply | TEXT | Draft reply for guest (approve-gated) |
| staff_brief | TEXT | Internal brief for staff/maintenance |
| staff_brief_ready | BOOLEAN | Can staff brief be posted without review? |
| escalation_contact | TEXT | maintenance, property_manager, concierge, etc. |
| assigned_to | TEXT | Staff member assigned |
| resolved_at | DATETIME | When resolved |
| created_at | DATETIME | When created |
| updated_at | DATETIME | Last updated |

### Table: `guest_checkin_events`

Check-in events from guests WhatsApp group.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Event ID |
| tenant_id | INTEGER FK | Tenant |
| booking_id | INTEGER FK | Matched booking (if found) |
| guest_name | TEXT | Guest name from message |
| guest_phone | TEXT | Guest phone |
| event_type | TEXT | arrived, in_house, late_arrival, checked_out |
| event_timestamp | DATETIME | When event occurred |
| source | TEXT | guests_group (default) |
| message_text | TEXT | Original message |
| inferred_status | TEXT | pending_verification, verified |
| confidence | REAL | 0.0 to 1.0 |
| verified | BOOLEAN | Human verified? |
| created_at | DATETIME | When created |

### Table: `ticket_playbooks`

Templates for each outlier category (seeded from code).

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Playbook ID |
| tenant_id | INTEGER FK | Tenant |
| category | TEXT UNIQUE | Outlier category |
| guest_reply_template | TEXT | Guest reply template with {{vars}} |
| staff_brief_template | TEXT | Staff brief template |
| escalation_contact | TEXT | Who to escalate to |
| auto_priority | TEXT | Default priority |
| known_facts | TEXT | JSON array of known Browns facts |
| ask_staff_flags | TEXT | JSON array of info needing staff input |
| created_at | DATETIME | When created |
| updated_at | DATETIME | Last updated |

---

## New Libraries

### 1. `src/lib/checkin-inference.ts`

**Exports:**
- `inferCheckinStatuses()` — Infer who has/hasn't checked in from bookings + events
- `processCheckinEvent()` — Match guest name from group message to booking
- `generateLateCheckinInstructions()` — Draft late check-in instructions

**Logic:**
- Match guest names using fuzzy token matching (first + last name)
- Infer status from latest event type (arrived, in_house, late, checked_out)
- Flag `needsLateCheckinInstructions` if:
  - Check-in date is today
  - Status is `not_arrived` or `late`
  - Current time > expected check-in + 2 hours

**DO NOT INVENT:** If no event exists, status is `not_arrived` (never assume arrival without evidence).

### 2. `src/lib/ticket-playbooks.ts`

**Exports:**
- `TICKET_PLAYBOOKS` — Object with playbook for each outlier category
- `generateTicketDrafts()` — Generate guest reply + staff brief from playbook

**Playbook Structure:**
```typescript
{
  category: 'lost_key',
  priority: 'high',
  knownFacts: ['Spare key location available', ...],
  askStaffFlags: ['spare_key_location', 'staff_availability', ...],
  guestReplyTemplate: 'Hi {{guestName}}, ...',
  staffBriefTemplate: '🔑 LOST KEY — {{guestName}} ...',
  escalationContact: 'maintenance'
}
```

**Template Variables:**
- `{{guestName}}`, `{{guestPhone}}`, `{{property}}`, `{{suiteNumber}}`
- `{{bookingRef}}`, `{{issueDescription}}`, `{{occasionType}}`
- `{{emergencyContact}}`, `{{maintenanceContact}}`, `{{gateCode}}` (all `[ASK STAFF]` placeholders)

**Known Browns Facts (DO NOT INVENT):**
- Property: The Browns Luxury Guest Suites
- Location: Dullstroom, Mpumalanga, South Africa
- Check-in: 14:00, Check-out: 10:00
- Everything else: `[ASK STAFF]` placeholder until Grant provides

---

## Extended Classifier

**File:** `src/lib/inbound-classifier.ts`

**New Intents:**
- `checkin_event` — Guest group message indicating arrival/departure
- `outlier_exception` — Guest problem/request

**New Extracted Data:**
- `eventType` — arrived, in_house, late_arrival, checked_out
- `outlierCategory` — lost_key, gate_access, etc.

**Detection Order:**
1. Check-in event signals (highest priority for guests group)
2. Outlier category signals (problems/requests)
3. Spam
4. Booking inquiry
5. Date query / suite preference / existing guest
6. General question / unknown

**Confidence Scoring:**
- Check-in event: 0.6 to 0.9 based on keyword matches
- Outlier: 0.55 to 0.9 based on keyword matches
- Higher confidence if multiple keywords match

---

## Extended Webhook API

**File:** `src/app/api/inbound/webhook/route.ts`

**New Response Fields:**
```json
{
  "success": true,
  "messageId": 123,
  "threadId": 45,
  "classification": { ... },
  "draftReply": { ... },
  "checkinEvent": {
    "id": 1,
    "eventType": "arrived",
    "matchedBooking": { "id": 10, "guestName": "John Smith" },
    "confidence": 0.85
  },
  "ticket": {
    "id": 5,
    "category": "lost_key",
    "priority": "high",
    "guestDraftReply": "...",
    "staffBrief": "...",
    "staffBriefReady": false,
    "askStaffFlags": ["spare_key_location", ...]
  },
  "status": "drafted"
}
```

**Processing Logic:**

1. **Check-in Events:**
   - If intent = `checkin_event`, fetch today's bookings
   - Match guest name to booking using fuzzy matching
   - Store event in `guest_checkin_events`
   - Return matched booking info

2. **Outlier Tickets:**
   - If intent = `outlier_exception`, generate ticket drafts
   - Create ticket in `guest_tickets`
   - Store both guest reply and staff brief
   - Mark `staff_brief_ready` if no `[ASK STAFF]` flags
   - Return ticket info with drafts

3. **Regular Messages:**
   - Continue with existing booking inquiry / date query flow

---

## New API Endpoints

### GET /api/tickets

Fetch guest tickets (outlier/exception cases).

**Query params:**
- `tenant_id` — Filter by tenant (default 1)
- `status` — Filter by status (new, triaged, staff_notified, in_progress, resolved)
- `category` — Filter by outlier category
- `limit` — Max results (default 50)

**Response:**
```json
{
  "success": true,
  "tickets": [
    {
      "id": 5,
      "category": "lost_key",
      "priority": "high",
      "status": "new",
      "guest_name": "John Smith",
      "guest_phone": "+27821234567",
      "subject": "LOST KEY - John Smith",
      "description": "...",
      "guest_draft_reply": "...",
      "staff_brief": "...",
      "staff_brief_ready": false,
      "created_at": "2026-12-10T10:00:00Z"
    }
  ],
  "stats": {
    "total": 10,
    "byStatus": { "new": 5, "in_progress": 3, "resolved": 2 }
  }
}
```

### PATCH /api/tickets

Update ticket status or assignment.

**Body:**
```json
{
  "ticketId": 5,
  "status": "triaged",
  "assignedTo": "grant",
  "staffBriefReady": true
}
```

### GET /api/checkin-status

Get check-in statuses for today's arrivals.

**Query params:**
- `tenant_id` — Filter by tenant (default 1)
- `date` — Date to check (default today YYYY-MM-DD)
- `needs_late_checkin` — Filter only guests needing late instructions (true/false)

**Response:**
```json
{
  "success": true,
  "date": "2026-12-10",
  "statuses": [
    {
      "bookingId": 10,
      "guestName": "John Smith",
      "guestPhone": "+27821234567",
      "checkInDate": "2026-12-10T14:00:00Z",
      "expectedArrivalTime": "2026-12-10T14:00:00Z",
      "checkinStatus": "not_arrived",
      "lastEvent": null,
      "needsLateCheckinInstructions": true,
      "confidence": 0.5,
      "lateCheckinInstructions": "Hi John Smith, ..."
    }
  ],
  "stats": {
    "total": 5,
    "notArrived": 2,
    "arrived": 2,
    "inHouse": 1,
    "late": 0,
    "needsLateInstructions": 2
  }
}
```

---

## Extended Ops UI

**File:** `src/app/ops/inbound-queue/page.tsx`

**New View Modes:**

1. **💬 Messages** (existing, unchanged)
2. **🎫 Tickets** (new) — Show outlier/exception tickets
3. **⏰ Late Check-in** (new) — Show guests needing late check-in instructions

**Toggle buttons at top:**
```
[💬 Messages] [🎫 Tickets] [⏰ Late Check-in]
```

**Tickets View (planned):**
- Fetch from `/api/tickets`
- Filter by status: new, triaged, staff_notified, in_progress, resolved
- Card shows:
  - Category icon + name (🔑 Lost Key, 🚪 Gate Access, etc.)
  - Priority badge (HIGH, MEDIUM, LOW)
  - Guest name + phone
  - Subject line
  - Created time
- Click to open detail modal with:
  - Full issue description
  - Guest draft reply (approve button)
  - Staff brief (ready to post if no `[ASK STAFF]` flags)
  - Status update buttons

**Late Check-in View (planned):**
- Fetch from `/api/checkin-status?needs_late_checkin=true`
- Card shows:
  - Guest name + booking ref
  - Expected check-in time
  - Current status (not arrived, late)
  - Hours since expected check-in
- Click to open detail with:
  - Auto-generated late check-in instructions
  - Approve button to send via WhatsApp
  - Mark as "contacted" button

---

## Tests

### `__tests__/guests-group-checkin.test.ts`

**Coverage:**
- ✅ Check-in event detection (arrived, in_house, late, checked_out)
- ✅ Check-in inference from bookings + events
- ✅ Late check-in flag logic (2h+ past check-in, not arrived)
- ✅ Guest name matching to bookings (fuzzy matching)
- ✅ DO NOT invent check-ins (only infer from events)

**Test count:** ~10 tests

### `__tests__/outlier-tickets.test.ts`

**Coverage:**
- ✅ Outlier category detection (8 categories)
- ✅ Ticket draft generation (guest reply + staff brief)
- ✅ NEVER invent rates, contacts, or policies
- ✅ Priority levels correct per category
- ✅ Escalation contacts set for urgent issues
- ✅ `staff_brief_ready` flag logic

**Test count:** ~15 tests

**Run tests:**
```bash
npm test
```

---

## Updated Documentation

### `docs/STAFF-RUNBOOK.md`

Added sections:
- **💬 Messages View** — Existing + new check-in event + outlier icons
- **🎫 Tickets View** — 8 outlier categories, dual-draft workflow
- **⏰ Late Check-in View** — Inferred from guests group, NightsBridge bookings

### `docs/INBOUND-WHATSAPP-WEBHOOK.md`

Updated:
- Payload schema now supports `source=guests_group`
- Response includes `checkinEvent` and `ticket` fields
- curl examples for guests group messages

---

## Commands for Grant

### Step 1: Run New Migration

```bash
cd apps/guestflow
npm run db:migrate:tickets
```

**Expected:**
```
✅ Migration completed successfully
Created tables:
  - guest_tickets
  - guest_checkin_events
  - ticket_playbooks
```

### Step 2: Run Tests

```bash
npm test
```

**Expected:** All tests pass (~55+ tests total)

### Step 3: Test Guests Group Check-in Event

```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "text": "Hi everyone, John Smith here, just arrived at The Browns!",
    "timestamp": "2026-12-10T15:00:00Z",
    "source": "guests_group"
  }'
```

**Expected:**
```json
{
  "success": true,
  "classification": {
    "intent": "checkin_event",
    "extractedData": { "eventType": "arrived", "guestName": "John Smith" }
  },
  "checkinEvent": {
    "id": 1,
    "eventType": "arrived",
    "matchedBooking": { "id": 10, "guestName": "John Smith" },
    "confidence": 0.85
  }
}
```

### Step 4: Test Outlier Ticket (Lost Key)

```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27829999999",
    "text": "Help! I lost the key to my room",
    "timestamp": "2026-12-10T16:00:00Z",
    "source": "legacy_wa"
  }'
```

**Expected:**
```json
{
  "success": true,
  "classification": {
    "intent": "outlier_exception",
    "extractedData": { "outlierCategory": "lost_key" }
  },
  "ticket": {
    "id": 1,
    "category": "lost_key",
    "priority": "high",
    "guestDraftReply": "Hi there, ...",
    "staffBrief": "🔑 LOST KEY — ...",
    "staffBriefReady": false,
    "askStaffFlags": ["spare_key_location", "staff_availability"]
  }
}
```

### Step 5: Check Late Check-in Status

```bash
curl http://localhost:3100/api/checkin-status?needs_late_checkin=true
```

**Expected:** List of guests who need late check-in instructions (if any bookings + no check-in events)

### Step 6: View in Ops UI

1. Open http://localhost:3100/ops/inbound-queue
2. Click **🎫 Tickets** tab → See placeholder for tickets view
3. Click **⏰ Late Check-in** tab → See placeholder for late check-in view
4. Both views will fetch from new API endpoints

---

## Success Criteria (Extension)

✅ **Guests Group Check-in:**
- [x] Detect check-in events from `source=guests_group`
- [x] Match guest names to bookings
- [x] Infer check-in status WITHOUT inventing
- [x] Flag guests needing late check-in instructions
- [x] API endpoint `/api/checkin-status`
- [x] Ops UI has Late Check-in view (placeholder)
- [x] Tests for check-in inference

✅ **Outlier Resolution Pipeline:**
- [x] 8 outlier categories detected
- [x] Create tickets with status flow
- [x] Dual drafts: guest reply + staff brief
- [x] Playbooks per category (no invented rates/facts)
- [x] `[ASK STAFF]` flags for unknown info
- [x] Escalation contacts per category
- [x] API endpoint `/api/tickets`
- [x] Ops UI has Tickets view (placeholder)
- [x] Tests for outlier classification + drafts

✅ **Hard Constraints Respected:**
- [x] No guest auto-send (all drafts approve-gated)
- [x] No invented check-ins (only infer from messages)
- [x] No invented rates, contacts, or policies
- [x] CoS/API feed only (no WhatsApp Web scraping)
- [x] Webhook accepts `source=guests_group`

---

## CoS Integration

**For CoS bridge implementers:**

See **`docs/COS-INTEGRATION-GUIDE.md`** for:
- ✅ Exact ingest URL: `POST https://guestflow.thebrowns.co.za/api/inbound/webhook`
- ✅ Auth header format: `Authorization: Bearer <INBOUND_WEBHOOK_SECRET>`
- ✅ Complete JSON schema with all fields
- ✅ `source` values: `legacy_wa`, `guests_group`, `twilio_waba`
- ✅ Response schema for each message type
- ✅ curl examples for booking inquiry, check-in event, outlier ticket
- ✅ Error handling and deduplication patterns
- ✅ Testing instructions

**Key CoS notes:**
- Use `source=guests_group` for guests WhatsApp group messages (enables check-in inference)
- Staff briefs are drafts for Admin - The Browns (NO AUTO-SEND)
- Guests group signals augment/replace NightsBridge-only late-checkin targeting

---

## Next Steps (Grant)

1. ✅ **Test locally** — Run migration + tests + curl examples above
2. ✅ **Review playbooks** — Check `src/lib/ticket-playbooks.ts` and update `[ASK STAFF]` placeholders with real Browns info:
   - Emergency contact phone
   - Maintenance contact
   - Gate codes
   - Spare key location
   - Restaurant recommendations
   - Fridge policy
3. ✅ **Feed guests group messages** — Configure CoS bridge to POST `source=guests_group` messages
4. ✅ **Full UI implementation** — Extend `/ops/inbound-queue` page to:
   - Fetch and render tickets from `/api/tickets`
   - Fetch and render late check-in from `/api/checkin-status`
   - Add approve/triage/resolve buttons
5. ✅ **Commit & push** — Add to same PR branch

---

## Files Added/Modified (Extension)

### Added (9 files):
- `scripts/migrate-add-guest-tickets.js`
- `src/lib/checkin-inference.ts`
- `src/lib/ticket-playbooks.ts`
- `src/app/api/tickets/route.ts`
- `src/app/api/checkin-status/route.ts`
- `__tests__/guests-group-checkin.test.ts`
- `__tests__/outlier-tickets.test.ts`
- `docs/EXTENSION-GUESTS-GROUP-OUTLIERS.md` (this file)

### Modified (5 files):
- `src/lib/inbound-classifier.ts` — Added check-in + outlier intents
- `src/app/api/inbound/webhook/route.ts` — Handle check-in events + tickets
- `src/app/ops/inbound-queue/page.tsx` — Added view mode toggle
- `docs/STAFF-RUNBOOK.md` — Added tickets + late check-in sections
- `package.json` — Added `db:migrate:tickets` script

---

**Extension Status:** Ready for Grant review + testing  
**Commit:** Add to same `cursor/inbound-whatsapp-pipeline-67f2` branch  
**Next:** Full Tickets + Late Check-in UI implementation (if Grant approves)
