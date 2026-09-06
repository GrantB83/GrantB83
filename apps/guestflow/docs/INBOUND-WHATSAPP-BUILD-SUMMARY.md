# Inbound WhatsApp Pipeline — Build Summary

**Date:** 2026-12-10  
**Repo:** `GrantB83/GrantB83` — apps/guestflow  
**Purpose:** Process messages from old WhatsApp number (+27836458313) into GuestFlow with classification, draft replies, and ops queue

---

## CoS Confirmed Constraints ⚠️

These hard constraints from CoS/Grant are baked into the design:

1. ✅ **Old number (+27836458313) is entrypoint/migrate only** — NOT converted to WhatsApp Cloud API
2. ✅ **NEW Twilio/WABA number (pending) is preferred path** for future webhooks
3. ✅ **NEVER auto-send to guests** — Dry-run/sandbox default; human approval required
4. ✅ **Do NOT depend on WhatsApp Web scraping** as long-term SoT
5. ✅ **CoS Web-bridge is optional/fragile** — Only if Grant asks before WABA live
6. ✅ **Prioritize solid ingest/classify/draft/ops queue** — Core pipeline must be rock-solid

**What this means:**
- Ingest API + docs provided for ANY source (Twilio preferred, manual paste for migration)
- All replies are DRAFTS requiring staff approval at `/ops/inbound-queue`
- No scraping dependency — webhook accepts normalized payloads from wherever
- Future outbound via NEW Twilio number, not old +27836458313

---

## What Was Built

### 1. Database Schema (3 new tables)

**Migration:** `scripts/migrate-add-inbound-whatsapp.js`

- `inbound_threads` — Conversation threads grouped by phone number/source
- `inbound_messages` — Individual messages within threads
- `message_classifications` — Intent classification and extracted data

**Status flow:** `new → classified → drafted → approved → sent/failed`

### 2. Message Classifier Library

**File:** `src/lib/inbound-classifier.ts`

**Heuristic rules for:**
- Booking inquiry (dates + "book"/"reserve" keywords)
- Date query (dates without booking intent)
- Suite preference (property names mentioned)
- Existing guest ("stayed before", "returning")
- Spam (promotional keywords)
- Unknown (low confidence)

**Extracts:**
- Guest name
- Check-in/check-out dates (ISO, DD/MM/YYYY, month name formats)
- Adult/children counts
- Property names (Browns, Rivendell, etc.)

**Flags missing fields:** check_in, check_out, guest_count, guest_name

### 3. Draft Reply Generator

**Also in:** `src/lib/inbound-classifier.ts`

**Rules:**
- Uses existing welcome-drafts patterns
- NEVER invents rates (shows `[RATE CARD REQUIRED]`)
- Asks for missing fields politely
- No reply for spam (flags as `[SPAM DETECTED]`)

### 4. Inbound Webhook API

**Endpoint:** `POST /api/inbound/webhook`

**Security:** Bearer token via `INBOUND_WEBHOOK_SECRET` env var

**Accepts normalized payload:**
```json
{
  "from": "+27836458313",
  "text": "message body",
  "timestamp": "2026-12-10T14:30:00Z",
  "source": "legacy_wa",
  "mediaRefs": ["url"],
  "externalMessageId": "unique-id"
}
```

**Returns:**
- Classification result (intent, confidence, extracted data)
- Draft reply (text, requires approval, missing info)
- Thread/message IDs

**Deduplication:** Uses `externalMessageId` to prevent duplicates

### 5. Inbound Queue API

**Endpoint:** `GET /api/inbound/queue`

**Query params:**
- `tenant_id` (default 1)
- `status` (filter: new, classified, drafted, approved, sent, failed, closed)
- `limit` (default 50)

**Returns:**
- Array of enriched threads with latest message and classification
- Stats by status

**Update endpoint:** `PATCH /api/inbound/queue` (change status/assignment)

### 6. Ops Queue UI Page

**URL:** `/ops/inbound-queue`

**Features:**
- Mobile-friendly card layout
- Filter by status (tabs with counts)
- Thread preview with intent emoji and confidence
- Click to open detail modal
- View classification, extracted data, missing fields
- Read draft reply with approval warning
- Quick actions: Approve, Close
- Refresh button
- Auto-refresh on status change

**Status colors:**
- New: Blue
- Classified: Purple
- Drafted: Yellow
- Approved: Green
- Sent/Failed: Gray/Red
- Closed: Gray

### 7. Documentation

**Webhook integration guide:** `docs/INBOUND-WHATSAPP-WEBHOOK.md`

Covers:
- Payload schema
- Response schema
- Classification intents
- curl examples
- Bridge options (manual paste, WhatsApp Web scraper, Twilio SMS, email forward)
- Security notes
- Troubleshooting

### 8. Tests

**File:** `__tests__/inbound-classifier.test.ts`

**Coverage:**
- Booking inquiry detection (various date formats)
- Guest count extraction (adults, children)
- Property mentions
- Existing guest signals
- Spam detection
- Draft reply generation
- Edge cases (empty, long, special characters)

**Test framework:** Vitest (added to package.json)

**Run tests:**
```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

### 9. Updated Files

- `src/components/Navigation.tsx` — Added "Inbound Queue" link
- `docs/STAFF-RUNBOOK.md` — Added inbound queue workflow
- `README.md` — Listed new feature
- `package.json` — Added test scripts and vitest

---

## How It Works

### Message Flow

```
1. WhatsApp message received on +27836458313 (old number)
   ↓
2. Bridge (CoS script / manual paste / Twilio / email) POSTs to webhook
   ↓
3. Webhook creates/updates thread, stores message
   ↓
4. Classifier analyzes message text (heuristic rules)
   ↓
5. Classification stored (intent, confidence, extracted data)
   ↓
6. Draft reply generated (unless spam)
   ↓
7. Thread status updated: new → classified → drafted
   ↓
8. Staff reviews in /ops/inbound-queue
   ↓
9. Staff clicks "Approve" → status: approved
   ↓
10. [Future] Staff copies draft to WhatsApp manually OR
    [Future] New Twilio WABA number sends via API
```

### Status Flow

```
new
  ↓ (classified)
classified
  ↓ (draft generated)
drafted
  ↓ (staff approve)
approved
  ↓ (manual send / future WABA)
sent
  OR
failed
  ↓ (any status)
closed
```

---

## What Still Needs Grant

### 1. Environment Secret

Set `INBOUND_WEBHOOK_SECRET` in Vercel:

```bash
# Generate
openssl rand -base64 32

# Add to Vercel dashboard
Settings → Environment Variables → Add
Name: INBOUND_WEBHOOK_SECRET
Value: <generated secret>
Environments: Production, Preview, Development
```

### 2. Run Database Migration

**Locally (development):**
```bash
cd apps/guestflow
npm run db:migrate:inbound
```

**Production (Turso):**
```bash
# Option A: Via turso CLI
turso db shell <db-name> < migration.sql

# Option B: Run migration on first deploy
# (Next.js API will auto-run on startup if tables don't exist)
```

Migration is idempotent (safe to run multiple times).

### 3. Choose Bridge for Messages (CoS Confirmed Priority)

**CoS Confirmed Constraints:**
- Old number (+27836458313) is **entrypoint/migrate only**
- Do NOT depend on WhatsApp Web scraping as long-term SoT
- **NEW Twilio/WABA number (pending) is preferred path**
- CoS Web-bridge is **optional/fragile** — only if Grant asks before WABA live

**Recommended Path:**

**Phase 1 (Now → WABA Live):** Manual paste for migration
- Staff copies message from WhatsApp Web
- Future: Add "Paste Message" button to `/ops/inbound-queue`
- Staff fills from/timestamp, submits
- Safe, simple, works today

**Phase 2 (WABA Live → Long-term):** Twilio/WABA webhooks on NEW number
- NEW Twilio SA number receives inbound messages
- Twilio webhook POSTs to GuestFlow `/api/inbound/webhook`
- Official, stable, long-term solution
- No WhatsApp Web dependency

**Optional (Only if Grant Requests):** CoS WhatsApp Web forwarder
- ⚠️ Fragile: WhatsApp Web changes break scrapers
- ⚠️ Not long-term SoT
- Only use for temporary automation before WABA live
- Prefer manual paste until NEW number ready

**Recommendation:** Start with **manual paste** (Phase 1), skip CoS Web-bridge, move to **Twilio/WABA webhooks** (Phase 2) when NEW number is live.

### 4. Test the Pipeline

**Step 1:** Run migration
```bash
npm run db:migrate:inbound
```

**Step 2:** Start dev server
```bash
npm run dev
```

**Step 3:** Open queue page
```
http://localhost:3100/ops/inbound-queue
```

**Step 4:** POST test message
```bash
curl -X POST http://localhost:3100/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+27821234567",
    "text": "Hi, I would like to book The Browns for 15-17 December, 2 adults",
    "timestamp": "2026-12-10T10:00:00Z",
    "source": "manual_paste"
  }'
```

**Step 5:** Refresh queue page — you should see:
- New thread with booking inquiry intent
- Confidence ~0.85
- Extracted: check-in, check-out, adults
- Draft reply asking for guest name and showing `[RATE CARD REQUIRED]`

**Step 6:** Click thread → view detail → click "Approve"

**Step 7:** Status changes to `approved`

### 5. Deploy to Production

**After testing locally:**

```bash
cd apps/guestflow
git add .
git commit -m "feat(guestflow): add inbound WhatsApp pipeline"
git push
```

Vercel will auto-deploy. Set `INBOUND_WEBHOOK_SECRET` in Vercel dashboard before first message.

### 6. Staff Training

Share with SA Ops:
- `docs/STAFF-RUNBOOK.md` (updated with inbound queue section)
- `docs/INBOUND-WHATSAPP-WEBHOOK.md` (webhook guide)

---

## Quality Gates

### ✅ Completed

- [x] Database tables created with proper indexes
- [x] Heuristic classifier with 6 intent types
- [x] Draft reply generator (no invented rates)
- [x] Secured webhook API (Bearer token)
- [x] Deduplication via externalMessageId
- [x] Queue API with status filtering
- [x] Mobile-friendly ops UI page
- [x] Navigation link added
- [x] Documentation (webhook guide, staff runbook)
- [x] Tests for classifier and draft generator
- [x] README updated

### 🔲 Remaining (Grant's Action Items)

- [ ] Set `INBOUND_WEBHOOK_SECRET` in Vercel env
- [ ] Run `npm run db:migrate:inbound` (local + production)
- [ ] Test pipeline locally (follow Step 4 above)
- [ ] Choose and implement bridge (Option A/B/C/D)
- [ ] Train SA Ops on inbound queue page
- [ ] Optional: Add "Paste Message" button to UI (future enhancement)

---

## Hard Constraints (CoS Confirmed)

✅ **Old number (+27836458313) is entrypoint/migrate only** — Not converted to WhatsApp Cloud API  
✅ **NEW Twilio/WABA number (pending) is preferred path** — Future webhooks on NEW number  
✅ **NEVER auto-send replies** — All drafts require staff approval; dry-run/sandbox default  
✅ **NEVER invent rates** — Shows `[RATE CARD REQUIRED]` when missing  
✅ **Do NOT depend on WhatsApp Web scraping** — Webhook accepts any source; Twilio preferred  
✅ **CoS Web-bridge is optional/fragile** — Only if Grant asks before WABA live  
✅ **Prioritize solid ingest/classify/draft/ops queue** — Core pipeline is rock-solid

---

## Success Criteria

When this pipeline is live:

1. ✅ Messages from old WhatsApp number flow into GuestFlow database
2. ✅ Classification happens automatically (intent + confidence)
3. ✅ Draft replies generated within seconds
4. ✅ Staff review queue daily at `/ops/inbound-queue`
5. ✅ Spam auto-closed, booking inquiries drafted
6. ✅ Approval gate enforced (no auto-send)
7. ✅ Clear handoff for CoS bridge integration

---

## Files Changed/Added

### Added
- `scripts/migrate-add-inbound-whatsapp.js`
- `src/lib/inbound-classifier.ts`
- `src/app/api/inbound/webhook/route.ts`
- `src/app/api/inbound/queue/route.ts`
- `src/app/ops/inbound-queue/page.tsx`
- `docs/INBOUND-WHATSAPP-WEBHOOK.md`
- `docs/INBOUND-WHATSAPP-BUILD-SUMMARY.md` (this file)
- `__tests__/inbound-classifier.test.ts`
- `vitest.config.ts`

### Modified
- `src/components/Navigation.tsx` (added Inbound Queue link)
- `docs/STAFF-RUNBOOK.md` (added inbound queue workflow)
- `README.md` (listed new feature)
- `package.json` (added test scripts, vitest, migration script)

---

## Next Phase: Outbound Send

**Not in this PR — Future work:**

1. When Twilio WABA number is live and approved
2. Add "Send via WhatsApp" button to `/ops/inbound-queue`
3. Button calls existing `src/lib/whatsapp.ts` `sendWhatsAppMessage()`
4. Uses new Twilio number as sender
5. Stores outbound message in `inbound_messages` table (direction: `outbound`)
6. Updates thread status to `sent` or `failed`

**For now:** Staff manually copies approved draft reply to WhatsApp Web/mobile.

---

## Support

**Owner:** Grant Brown  
**Contact:** grant@thebrowns.co.za  
**Repo:** https://github.com/GrantB83/GrantB83  
**App:** apps/guestflow

---

**Build completed:** 2026-12-10  
**Status:** Ready for Grant testing & deployment
