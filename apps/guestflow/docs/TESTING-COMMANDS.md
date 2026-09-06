# Inbound WhatsApp Pipeline — Testing Commands

**Purpose:** Step-by-step commands to test the core ingest/classify/draft/ops queue pipeline  
**Audience:** Grant (for testing before production deploy)

**CoS Confirmed:** These tests validate the solid core pipeline. Bridge choice (manual paste vs Twilio webhooks) is separate and tested via the same webhook API.

---

## Prerequisites

Ensure you're in the guestflow directory:

```bash
cd /workspace/apps/guestflow
```

---

## Step 1: Install Dependencies

```bash
npm install
```

**Expected result:** Vitest and other new dev dependencies installed  
**Continue when you see:** "added X packages"

---

## Step 2: Run Database Migration

Create the new inbound tables:

```bash
npm run db:migrate:inbound
```

**Expected result:**
```
Running migration: add-inbound-whatsapp
Database path: /workspace/apps/guestflow/data/guestflow.db
✅ Migration completed successfully
Created tables:
  - inbound_threads
  - inbound_messages
  - message_classifications
```

**Continue when you see:** ✅ Migration completed successfully

---

## Step 3: Run Tests

Test the classifier and draft generator:

```bash
npm test
```

**Expected result:** All tests pass (should see ~30+ passing tests)

**Sample output:**
```
✓ __tests__/inbound-classifier.test.ts (32)
   ✓ Message Classification (10)
   ✓ Draft Reply Generation (8)
   ✓ Edge Cases (4)

Test Files  1 passed (1)
     Tests  32 passed (32)
```

**Continue when you see:** All tests green

---

## Step 4: Start Dev Server

```bash
npm run dev
```

**Expected result:** Server running on http://localhost:3100

**Continue when you see:** "Local: http://localhost:3100"

---

## Step 5: Open Inbound Queue (in browser)

Open a new terminal tab/window and visit:

```
http://localhost:3100/ops/inbound-queue
```

**Expected result:** Empty queue page with "No messages in queue" and filter tabs

**Continue when you see:** Inbound WhatsApp Queue page loaded

---

## Step 6: POST Test Message #1 (Booking Inquiry)

In a NEW terminal (keep dev server running):

```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "text": "Hi, my name is John Smith. I would like to book The Browns for 15-17 December for 2 adults. Do you have availability?",
    "timestamp": "2026-12-10T10:00:00Z",
    "source": "manual_paste"
  }'
```

**Expected result:**
```json
{
  "success": true,
  "messageId": 1,
  "threadId": 1,
  "classification": {
    "intent": "booking_inquiry",
    "confidence": 0.85,
    "extractedData": {
      "guestName": "John Smith",
      "checkIn": "15",
      "checkOut": "17",
      "adults": 2,
      "property": "browns"
    },
    "missingFields": []
  },
  "draftReply": {
    "text": "Hi John Smith,\n\nThank you for your interest...",
    "requiresApproval": true,
    "missingInfo": ["rate_card_lookup"]
  },
  "status": "drafted"
}
```

**Continue when you see:** `"success": true` and `"intent": "booking_inquiry"`

---

## Step 7: Refresh Queue Page

Go back to browser (http://localhost:3100/ops/inbound-queue) and refresh.

**Expected result:**
- 1 thread in queue
- Status: "drafted" (yellow badge)
- Intent: 📅 booking_inquiry
- Confidence: ~85%
- Guest name: "Unknown Guest" (will be extracted later) or "John Smith"
- Phone: +27821234567
- Latest message preview visible

**Continue when you see:** Thread card with booking inquiry

---

## Step 8: Click Thread to View Detail

Click on the thread card.

**Expected result:** Modal opens with:
- Classification section showing:
  - Intent: booking_inquiry (85%)
  - Extracted data: guestName, checkIn, checkOut, adults, property
  - Missing fields: (none or rate_card)
- Message section showing: "Hi, my name is John Smith..."
- Draft Reply section showing:
  - ⚠️ Requires Approval badge
  - Draft text including `[RATE CARD REQUIRED]`
  - Mentions John Smith, dates, 2 guests
- Actions: "Approve & Mark Ready" and "Close" buttons

**Continue when you see:** Full draft reply with guest name and dates

---

## Step 9: Test Approval

Click "Approve & Mark Ready" button.

**Expected result:**
- Modal closes
- Queue refreshes
- Thread status changes to "approved" (green badge)

**Continue when you see:** Green "approved" badge

---

## Step 10: POST Test Message #2 (Spam)

```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27829999999",
    "text": "Congratulations! You have won a lottery prize. Click here to claim your bitcoin winnings now!",
    "timestamp": "2026-12-10T11:00:00Z",
    "source": "manual_paste"
  }'
```

**Expected result:**
```json
{
  "success": true,
  "messageId": 2,
  "threadId": 2,
  "classification": {
    "intent": "spam",
    "confidence": 0.9,
    ...
  },
  "draftReply": null,
  "status": "closed"
}
```

**Continue when you see:** `"intent": "spam"` and `"status": "closed"`

---

## Step 11: Verify Spam Auto-Closed

Refresh queue page and click "closed" filter tab.

**Expected result:**
- Spam thread appears in "closed" status
- No draft reply generated
- Intent: 🚫 spam

**Continue when you see:** Spam thread in closed filter

---

## Step 12: POST Test Message #3 (Date Query)

```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27823456789",
    "text": "Are you available from 25 Jan to 28 Jan?",
    "timestamp": "2026-12-10T12:00:00Z",
    "source": "manual_paste"
  }'
```

**Expected result:** Intent: `date_query`, draft asks for guest count

**Continue when you see:** `"intent": "date_query"`

---

## Step 13: Filter by Status

On queue page, click different status tabs:
- All (3)
- new (0)
- drafted (1)
- approved (1)
- closed (1)

**Expected result:** Queue filters correctly, showing only threads matching selected status

**Continue when you see:** Filters working

---

## Step 14: Test Deduplication

Re-POST the exact same message from Step 6 with an `externalMessageId`:

```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "text": "Hi, my name is John Smith. I would like to book The Browns for 15-17 December for 2 adults. Do you have availability?",
    "timestamp": "2026-12-10T10:00:00Z",
    "source": "manual_paste",
    "externalMessageId": "test-msg-123"
  }'
```

**Expected result:**
```json
{
  "success": true,
  "messageId": 1,
  "threadId": 1,
  "classification": {...},
  "draftReply": {...},
  "status": "approved"
}
```

POST again with SAME externalMessageId:

```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "text": "Hi, my name is John Smith. I would like to book The Browns for 15-17 December for 2 adults. Do you have availability?",
    "timestamp": "2026-12-10T10:00:00Z",
    "source": "manual_paste",
    "externalMessageId": "test-msg-123"
  }'
```

**Expected result:**
```json
{
  "success": true,
  "duplicate": true,
  "messageId": 1
}
```

**Continue when you see:** `"duplicate": true` on second POST

---

## Step 15: Test Webhook Security (Optional)

Set webhook secret:

```bash
export INBOUND_WEBHOOK_SECRET=test_secret_123
```

Restart dev server (Ctrl+C, then `npm run dev` again).

Try POST without auth header:

```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821111111",
    "text": "Test",
    "timestamp": "2026-12-10T13:00:00Z"
  }'
```

**Expected result:**
```json
{
  "success": false,
  "error": "Unauthorized - invalid webhook secret"
}
```

Try POST WITH auth header:

```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Authorization: Bearer test_secret_123" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821111111",
    "text": "Test",
    "timestamp": "2026-12-10T13:00:00Z"
  }'
```

**Expected result:** `"success": true`

**Continue when you see:** Auth working correctly

---

## Step 16: Verify Database

Check that data was persisted:

```bash
sqlite3 data/guestflow.db "SELECT COUNT(*) FROM inbound_threads;"
sqlite3 data/guestflow.db "SELECT COUNT(*) FROM inbound_messages;"
sqlite3 data/guestflow.db "SELECT intent, confidence, status FROM inbound_threads;"
```

**Expected result:**
- 3+ threads
- 3+ messages
- Various intents (booking_inquiry, spam, date_query)

**Continue when you see:** Data in database

---

## All Tests Pass ✅

If you completed all 16 steps successfully:

1. ✅ Migration ran without errors
2. ✅ All unit tests passed
3. ✅ Webhook accepts messages
4. ✅ Classification works (booking, spam, date query)
5. ✅ Draft replies generated (no invented rates)
6. ✅ Queue UI displays threads
7. ✅ Status filters work
8. ✅ Approval changes status
9. ✅ Spam auto-closed
10. ✅ Deduplication prevents duplicates
11. ✅ Webhook auth works (if enabled)
12. ✅ Data persisted to database

**You're ready to deploy to production!**

---

## Next Steps for Production

1. Set `INBOUND_WEBHOOK_SECRET` in Vercel env vars
2. Push to GitHub → Vercel auto-deploys
3. Run Turso migration (or let API auto-migrate on first call)
4. Test webhook with production URL
5. Choose and implement bridge (CoS script / manual paste / Twilio)
6. Train SA Ops on `/ops/inbound-queue`

---

## Troubleshooting

### Migration fails

```bash
# Check if tables already exist
sqlite3 data/guestflow.db ".schema inbound_threads"

# If yes, migration already ran (safe to skip)
```

### Tests fail

```bash
# Install dependencies
npm install

# Run tests with verbose output
npm test -- --reporter=verbose
```

### Webhook returns 500

```bash
# Check dev server logs for detailed error
# Common issues:
# - Database not initialized: run npm run db:init
# - Migration not run: run npm run db:migrate:inbound
```

### Queue page shows no messages

```bash
# Verify messages were POSTed successfully
curl http://localhost:3100/api/inbound/queue?tenant_id=1

# Check response for threads array
```

---

## Support

**Questions?** Check:
- `docs/INBOUND-WHATSAPP-WEBHOOK.md` — Webhook integration guide
- `docs/INBOUND-WHATSAPP-BUILD-SUMMARY.md` — Full build summary
- `docs/STAFF-RUNBOOK.md` — Staff workflow

**Contact:** grant@thebrowns.co.za
