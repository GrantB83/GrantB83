# Phase 16 Demo Guide: Nightsbridge-style Bookings Intake

## Quick Start

### 1. Initialize Database

```bash
cd apps/guestflow
npm install
npm run db:init
node scripts/migrate-phase16-bookings.js
```

**Expected output:**
```
✓ Demo tenant created
✓ Sample properties created
✓ Database initialized successfully
🔧 Running Phase 16 migration: Add Nightsbridge booking fields...
  ✓ ALTER TABLE bookings ADD COLUMN adults INTEGER DEFAULT 2
  ✓ ALTER TABLE bookings ADD COLUMN children INTEGER DEFAULT 0
  ✓ ALTER TABLE bookings ADD COLUMN notes TEXT
  ✓ ALTER TABLE bookings ADD COLUMN late_check_in BOOLEAN DEFAULT 0
  ✓ ALTER TABLE bookings ADD COLUMN suite_or_unit TEXT
✅ Migration complete!
```

### 2. Start Dev Server

```bash
npm run dev
```

Open http://localhost:3100

### 3. Seed Demo Data (Optional)

1. Navigate to http://localhost:3100/demo/seed
2. Password: `demo2026`
3. Click "Run Demo Seed"
4. Verify: 3 bookings created with Nightsbridge fields

---

## Demo Walkthrough: CSV Import → Operations Board

### Step 1: Import Nightsbridge CSV

1. Navigate to http://localhost:3100/demo/nightsbridge-import
2. **Active Tenant** banner should show: "The Browns Luxury Guest Suites (Dullstroom)" or "Dullstroom Demo Guesthouse"
3. Set **Target Date** to today or `2026-12-20` (matches fixtures)
4. Click **"Load Sample"** to populate CSV textarea

**Sample CSV structure:**
```csv
Guest Name,Suite,Check-in,Check-out,Adults,Children,Notes
Sarah & Tom Henderson,Luxury Suite 1,2026-12-20,2026-12-22,2,0,Anniversary
The Mbeki Family,Family Suite 3,2026-12-20,2026-12-24,2,2,Late arrival ~19:00
Emma Thompson,Garden Suite 2,2026-12-20,2026-12-22,1,0,Vegetarian breakfast
```

5. Click **"Parse CSV"**
6. Verify:
   - ✅ Green success banner: "CSV Parsed Successfully - Found N booking(s)"
   - ✅ Parsed bookings table shows:
     - Guest names
     - Suite/Unit assignments
     - Status badges (arriving/inhouse/departing) based on target date
     - Late check-in badges in amber if detected
     - Adults/Children counts
     - Notes column
   - ⚠️ **Missing-fields warnings** (red alert box) if any data is incomplete

7. Click **"Save N Booking(s) to Database"**
8. Verify:
   - ✅ Blue success banner: "Bookings Saved to Database"
   - ✅ Link to "Bookings Board" appears

---

### Step 2: View Same-Day Bookings Board

1. Navigate to http://localhost:3100/demo/bookings-board (or click link from import page)
2. **Active Tenant** banner confirms tenant scope
3. Use **date picker** or **Previous/Next Day** buttons to navigate dates

**Expected Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Same-Day Bookings Board                                      │
│ Active Tenant: Dullstroom Demo Guesthouse                    │
├─────────────────────────────────────────────────────────────┤
│ [← Previous Day]  [📅 2026-12-20]  [Next Day →]             │
├─────────────────────────────────────────────────────────────┤
│  🟢 Arriving (2)  │  🟣 In-House (1)  │  🔵 Departing (0)  │
│  ────────────────  │  ────────────────  │  ──────────────── │
│  Sarah Johnson    │  Emma Thompson     │  (No departures)  │
│  Luxury Suite 1   │  Garden Suite 2    │                    │
│  2A, 0C           │  1A, 0C            │                    │
│  Anniversary      │  Vegetarian         │                    │
│  ────────────────  │  ────────────────  │                    │
│  Mark Thompson    │                     │                    │
│  Cottage A        │                     │                    │
│  2A, 3C [⏰ LATE] │                     │                    │
│  Kids ages 8,10,12│                     │                    │
└─────────────────────────────────────────────────────────────┘
```

4. Verify **warnings appear** if missing data:
   - 🔴 **Red alert:** "Missing Fields Detected" if guest names or suites missing
   - 🟠 **Amber alert:** "Late Check-Ins Detected" if late arrivals flagged

---

## Testing Missing-Fields Warnings

### Create CSV with Missing Data

```csv
Guest Name,Suite,Check-in,Check-out,Adults,Children,Notes
,Suite 1,2026-12-20,2026-12-22,2,0,Missing guest name
John Doe,,2026-12-20,2026-12-22,1,0,Missing suite
Jane Smith,Suite 3,2026-12-20,,2,0,Missing checkout
```

**Expected behavior:**
1. Parse succeeds but shows **red alert**
2. Missing-fields table displays:
   - Row 2: Missing `guestName`
   - Row 3: Missing `suiteOrUnit`
   - Row 4: Missing `checkOutDate`
3. Bookings **still saved** to database (partial data preserved)
4. On bookings board, missing fields show:
   - `[GUEST NAME MISSING]` with ⚠️ icon
   - `[SUITE NOT ASSIGNED]` with amber "NO SUITE" badge

---

## Testing Multi-Tenant Scoping

### Switch Tenants

1. Navigate to http://localhost:3100/demo
2. Use **Tenant Switcher** at top to select different demo tenant
3. Navigate to `/demo/nightsbridge-import`
4. Import CSV (new bookings saved to selected tenant)
5. Navigate to `/demo/bookings-board`
6. Verify: Only bookings for **active tenant** appear

---

## Fixture Data (from Demo Seed)

After running `/demo/seed`, database contains:

**Tenant:** Dullstroom Demo Guesthouse

**Bookings:**
1. **Sarah Johnson** (Anniversary)
   - Suite: Riverside Suite 1
   - Check-in: 2026-12-20
   - Check-out: 2026-12-22
   - Guests: 2 adults, 0 children
   - Notes: "Anniversary celebration - champagne on arrival"
   - Late: No

2. **Mark Thompson** (Family)
   - Suite: Mountain View Cottage A
   - Check-in: 2027-01-05
   - Check-out: 2027-01-09
   - Guests: 2 adults, 3 children
   - Notes: "Kids ages 8, 10, 12 - extra bedding requested"
   - Late: No

3. **Jennifer Williams** (Remote Work)
   - Suite: Riverside Suite 2
   - Check-in: 2027-02-10
   - Check-out: 2027-02-13
   - Guests: 1 adult, 0 children
   - Notes: "Remote work - needs desk and WiFi. Late arrival ~21:00"
   - Late: **Yes** ⏰

---

## Docker Demo (Optional)

```bash
# Build Docker image
docker-compose -f apps/guestflow/docker-compose.yml build

# Run container
docker-compose -f apps/guestflow/docker-compose.yml up

# Open http://localhost:3100
# Follow same walkthrough steps above
```

---

## Smoke Tests

```bash
cd apps/guestflow
npm run smoke
```

**Expected:**
```
✅ Passed: 55
❌ Failed: 1 (pre-existing Phase 14 failure unrelated to Phase 16)
```

**Phase 16 specific tests:**
- ✅ Bookings board page (Phase 16) (GET /demo/bookings-board)
- ✅ Bookings API (GET with tenant) (GET /api/bookings?tenant_id=1)

---

## Hard Gates Verification

✅ **NO live OTA integrations** - all data from CSV fixtures  
✅ **NO invented data** - missing fields flagged, never fabricated  
✅ **NO auto-send** - all messaging draft-only  
✅ **Tenant-scoped** - bookings isolated by tenant_id  
✅ **Fixtures only** - SQLite local persistence

---

## Troubleshooting

### "No bookings for selected date"
- Check that target date in CSV matches selected day on board
- Verify bookings were saved (check green success banner)
- Try switching to a date with fixture data (2026-12-20 or 2027-01-05)

### "No active tenant selected"
- Navigate to `/demo` and use tenant switcher
- Verify tenant appears in "Active Tenant" banner on import/board pages

### Missing columns error on migration
- Run `npm run db:init` first
- Then run `node scripts/migrate-phase16-bookings.js`
- Migration is idempotent - safe to re-run

---

**Phase 16 Demo Complete!** 🎉

Next: Use bookings board for daily operations walkthroughs with sales prospects.
