# SA Ops Runbook: Nightsbridge → GuestFlow Data Sync

**Version:** 2.0 (Autonomous)  
**Date:** September 2026  
**Property:** The Browns Dullstroom (Nightsbridge Property ID 24299)  
**Audience:** SA Operations staff

---

## Overview

This runbook documents both **autonomous** and **manual** workflows for importing bookings from Nightsbridge into GuestFlow.

### 🤖 Autonomous Sync (NEW)

**What:** Vercel Cron automatically checks for new booking data and imports it into GuestFlow twice daily.

**When:** 
- **Morning:** 07:00 SAST (05:00 UTC)
- **Evening:** 17:00 SAST (15:00 UTC)

**Workflow:**
1. Export `arr_and_dep.xlsx` from Nightsbridge
2. Upload to designated Google Drive folder (or use manual trigger endpoint)
3. Cron job runs at scheduled time, processes the file, imports bookings
4. Check GuestFlow `/ops/bookings` to verify import succeeded

**Important:** This is a **one-way import**. Data flows from Nightsbridge → GuestFlow. GuestFlow does NOT write back to Nightsbridge.

### 📋 Manual Sync (Fallback)

If autonomous sync is not yet configured or you need to import immediately, use the manual workflow at `/ops/nightsbridge-import`.

---

## 🤖 Part A: Autonomous Sync Setup & Usage

### Prerequisites

1. **CRON_SECRET** configured in Vercel environment
2. **NIGHTSBRIDGE_TENANT_ID** set (default: 1 for The Browns Dullstroom)
3. **NIGHTSBRIDGE_DRIVE_FOLDER_ID** set for drop-folder sync (optional)
4. Vercel Cron entries configured in `vercel.json` (done)

### Step 1: Export from Nightsbridge (Same as Manual)

1. **Log in to Nightsbridge**
   - URL: https://app.nightsbridge.com/
   - Property: The Browns Dullstroom (Property 24299)

2. **Navigate to Reports**
   - Calendar → Reports (or Reports menu)

3. **Select Report Type**
   - Report Type: **Arrivals & Departures**

4. **Configure Date Range**
   - Select the date range you need (e.g., next 30 days, specific week, etc.)
   - Tip: For daily ops, export the next 7-14 days

5. **Run Report**
   - Click "Run Reports" button
   - Report will generate (may take a few seconds for larger date ranges)

6. **Download File**
   - Click download button
   - File will save as `arr_and_dep.xlsx` (or similar name with date)
   - Save to a known location (e.g., Downloads folder)

### Step 2: Upload to Google Drive Drop Folder (Autonomous Path)

1. **Open Google Drive**
   - Navigate to the designated Nightsbridge drop folder
   - Folder name: [TO BE CONFIGURED]
   - URL: [TO BE CONFIGURED]

2. **Upload File**
   - Drag and drop `arr_and_dep.xlsx` into the folder
   - Or use "New" → "File upload"

3. **Wait for Next Scheduled Sync**
   - Morning: 07:00 SAST
   - Evening: 17:00 SAST
   - Cron will automatically detect and process the file

4. **Verify Import**
   - After sync time, check GuestFlow `/ops/bookings`
   - Verify new bookings appear with correct dates and guests

### Step 3: Manual Trigger (If Immediate Import Needed)

If you need to import immediately (before the next scheduled cron), you can manually trigger the sync:

1. **Use Vercel Dashboard**
   - Go to Vercel project dashboard
   - Functions → Crons → `nightsbridge-sync`
   - Click "Run Now"

2. **Or Use cURL (Advanced)**
   ```bash
   curl -X POST https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync \
     -H "Authorization: Bearer [CRON_SECRET]" \
     -H "Content-Type: application/json"
   ```

3. **Or Upload Directly via API (Advanced)**
   ```bash
   # Convert file to base64
   base64 arr_and_dep.xlsx > file.b64

   # POST to sync endpoint
   curl -X POST https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync \
     -H "Authorization: Bearer [CRON_SECRET]" \
     -H "Content-Type: application/json" \
     -d '{
       "fileBase64": "'$(cat file.b64 | tr -d '\n')'",
       "fileName": "arr_and_dep.xlsx"
     }'
   ```

### Step 4: Check Sync Status

**View Endpoint Configuration:**
```bash
curl https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync
```

Response shows:
- Configured schedule (morning + evening SAST)
- Environment configuration status
- Workflow steps
- Next steps if not fully configured

**View Recent Imports:**
- Go to `/ops/bookings` in GuestFlow
- Filter by creation date to see newly imported bookings

### Troubleshooting Autonomous Sync

**Problem:** Bookings not appearing after upload to Drive  
**Solution:**
1. Check file name is `arr_and_dep.xlsx` (or configured pattern)
2. Verify NIGHTSBRIDGE_DRIVE_FOLDER_ID is correct
3. Check Vercel Cron logs for errors
4. Fall back to manual import at `/ops/nightsbridge-import`

**Problem:** Cron job not running at scheduled times  
**Solution:**
1. Verify `vercel.json` has cron entries (should exist)
2. Check Vercel dashboard → Functions → Crons → Status
3. Ensure CRON_SECRET is configured in Vercel environment
4. Check Vercel deployment succeeded

**Problem:** "Unauthorized" error when triggering manually  
**Solution:**
1. Verify CRON_SECRET is correct
2. Use `Authorization: Bearer [CRON_SECRET]` header format
3. Or use raw secret without "Bearer" prefix

---

## 📋 Part B: Manual Import (Fallback / Immediate Import)

### Data Flow (Manual Path)

```
Nightsbridge Calendar
    ↓ (Reports → Arrivals & Departures)
arr_and_dep.xlsx download
    ↓ (Upload to GuestFlow /ops/nightsbridge-import)
GuestFlow Database
    ↓ (Available for)
Guest Portal + Welcome Packs + Daily Brief
```

### Manual Import Instructions

Use this workflow when:
- Autonomous sync is not yet configured
- You need to import immediately (can't wait for next cron)
- Testing or troubleshooting

### Step 1: Export from Nightsbridge (Same as Autonomous)

1. **Log in to Nightsbridge**
   - URL: https://app.nightsbridge.com/
   - Property: The Browns Dullstroom (Property 24299)

2. **Navigate to Reports**
   - Calendar → Reports (or Reports menu)

3. **Select Report Type**
   - Report Type: **Arrivals & Departures**

4. **Configure Date Range**
   - Select the date range you need (e.g., next 30 days, specific week, etc.)
   - Tip: For daily ops, export the next 7-14 days

5. **Run Report**
   - Click "Run Reports" button
   - Report will generate (may take a few seconds for larger date ranges)

6. **Download File**
   - Click download button
   - File will save as `arr_and_dep.xlsx` (or similar name with date)
   - Save to a known location (e.g., Downloads folder)

### Step 2: Import into GuestFlow (Manual Upload)

1. **Open GuestFlow Ops Console**
   - URL: https://browns-guestflow.vercel.app/ops (or https://guestflow.thebrowns.co.za if DNS configured)
   - Log in with staff password

2. **Navigate to NightsBridge Import**
   - From Ops Hub, click "NightsBridge Import"
   - Or go directly to `/ops/nightsbridge-import`

3. **Set Target Date**
   - Enter the date you want to use for status derivation (typically today's date)
   - This determines which bookings are marked as "arriving", "inhouse", or "departing"

4. **Upload File**
   - Click "Choose File" or drag-and-drop
   - Select the `arr_and_dep.xlsx` file you downloaded from Nightsbridge
   - Click "Parse File"

5. **Review Parsed Data**
   - GuestFlow will display:
     - Total bookings found
     - Parsed booking details (Guest Name, Suite, Dates, Status)
     - Any missing fields (flagged as warnings)
     - Availability gaps detected
   - **IMPORTANT:** Review missing fields carefully. Never proceed if critical data is missing without investigating.

6. **Handle Missing Fields**
   - If missing fields are detected, you have two options:
     - **Option A:** Go back to Nightsbridge and correct the booking (add missing suite, guest name, etc.)
     - **Option B:** Manually note the missing data for follow-up
   - **DO NOT INVENT DATA.** If WiFi password is missing, leave it blank. If phone number is missing, leave it blank.

7. **Save to Database**
   - Once you've reviewed the data, click "Save [N] Booking(s) to Database"
   - Bookings will be saved to GuestFlow local database
   - Success message will appear

8. **Verify Import**
   - Go to `/ops/bookings` to view all saved bookings
   - Check that dates, names, and suites are correct

### Expected File Format (from Nightsbridge)

The `arr_and_dep.xlsx` file typically contains these columns:

- **Room Name** → Suite/Unit assignment
- **Guest Name** → Primary guest
- **Guest 2** → Secondary guest (optional)
- **Number of Guests** → Total guests
- **Booking ID** → Reference number
- **Notes** → Special requests or remarks
- **Nights** → Length of stay
- **Additional** → Extra charges or notes
- **Phone Number** → Guest phone
- **Email** → Guest email
- **Phone Number 2** → Secondary phone (optional)
- **Email 2** → Secondary email (optional)

**Note:** The export groups bookings by arrival/departure date blocks. Empty days will have title rows only.

### Troubleshooting

**Problem:** "File must have at least a header row and one data row"  
**Solution:** The export is empty for the selected date range. Try a wider date range or check that there are confirmed bookings in Nightsbridge.

**Problem:** Many missing fields for "suiteOrUnit" or "checkInDate"  
**Solution:** Check the Nightsbridge booking details. Ensure all bookings have assigned rooms and confirmed dates.

**Problem:** "Parsing error: ..."  
**Solution:** Ensure file is a valid `.xlsx` file from Nightsbridge. If file is corrupted, re-download from Nightsbridge.

---

## 💰 Part C: Rate Card Import (Manual Only)

### Data Flow

```
Approved Rate Card CSV
(browns-ota-rate-pipeline-pack format)
    ↓ (Upload to GuestFlow)
GuestFlow Rate Cards Table
    ↓ (Used by)
Quote Draft Generator
    ↓ (Grant sign-off)
Manual Nightsbridge Entry
```

**IMPORTANT:** SA Ops does **not** export rates from Nightsbridge. The flow is:

1. Approved rate card CSV → GuestFlow
2. GuestFlow → browns-ota-rate-pipeline-pack → Grant sign-off
3. Grant/SA Ops → **Manual** Nightsbridge entry

### Step 1: Prepare Approved Rate Card CSV

Rate cards must be in the approved format from `tools/browns-ota-rate-pipeline-pack/fixtures/sample-rates.csv`:

```csv
suiteOrUnit,seasonOrLabel,currency,nightlyRate,minStay,occupancy,notes
Luxury Suite 1,Summer Peak,ZAR,3200.00,2 nights,2 adults,Pool view
Luxury Suite 1,Winter Off-Peak,ZAR,2400.00,1 night,2 adults,Cozy fireplace
Garden Suite,Summer Peak,ZAR,2800.00,2 nights,2 adults,Private garden
Garden Suite,Winter Off-Peak,ZAR,2100.00,1 night,2 adults,Garden access
Family Suite,Summer Peak,ZAR,4500.00,2 nights,4 adults,Spacious
Family Suite,Winter Off-Peak,ZAR,3500.00,1 night,4 adults,Family friendly
```

**Required Columns:**
- `suiteOrUnit` — Suite/room name (must match Nightsbridge room names)
- `seasonOrLabel` — Season or rate period (e.g., "Summer Peak", "Winter Off-Peak", "Standard")
- `currency` — Currency code (ZAR, USD, EUR)
- `nightlyRate` — Rate per night (numeric, e.g., 3200.00)
- `minStay` — Minimum nights (e.g., "2 nights", "1 night")
- `occupancy` — Guest capacity (e.g., "2 adults", "4 adults")
- `notes` — Additional details (optional)

**NEVER invent rates.** If a rate is unknown, leave the row out or use `[MISSING RATE]` in the notes field.

### Step 2: Upload to GuestFlow

1. **Open GuestFlow Ops Console**
   - URL: https://browns-guestflow.vercel.app/ops
   - Log in with staff password

2. **Navigate to Rate Card Upload**
   - From Ops Hub, click "Rate Card Upload"
   - Or go directly to `/ops/rate-cards`

3. **Upload CSV File**
   - Click "Choose File" or drag-and-drop
   - Select your approved rate card CSV
   - Click "Parse CSV"

4. **Review Parsed Rates**
   - GuestFlow will display:
     - Total rate entries found
     - Rate details (Suite, Season, Rate, Currency)
     - Any parsing errors
   - **IMPORTANT:** Verify all rates are correct. Never proceed with incorrect rates.

5. **Save to Database**
   - Click "Save Rate Cards to Database"
   - Rates will be stored in GuestFlow
   - Success message will appear

6. **Use in Quote Drafts**
   - Rates are now available in `/ops/quote-draft`
   - When generating quotes, GuestFlow will use these rates
   - If a rate is missing for a suite/season combination, it will show `[RATE CARD REQUIRED]`

### Step 3: Manual Nightsbridge Entry (After Grant Sign-Off)

**DO NOT enter rates into Nightsbridge without Grant's approval.**

After Grant reviews and signs off on the rate worksheet (from browns-ota-rate-pipeline-pack):

1. Log in to Nightsbridge
2. Navigate to Rates / Pricing section
3. Manually enter the approved rates for each room and season
4. Save changes
5. Verify rates are visible in Nightsbridge booking calendar

---

## 🔄 Recommended Sync Frequency

### Autonomous Sync (Preferred)

- **Morning:** Automatically at 07:00 SAST
- **Evening:** Automatically at 17:00 SAST
- **On Demand:** Upload file to Drive folder anytime, will be processed at next scheduled time
- **Immediate:** Use manual trigger or manual import page

### Manual Sync (Fallback)

- **Daily:** Export and import bookings every morning (before 09:00 SAST) if autonomous is not configured
- **On Change:** Re-import after any major booking changes (new reservations, cancellations, room moves)
- **Before CT Pack:** Always verify bookings are fresh before generating a CT Pack or guest communication

### Rate Cards (No Autonomous Sync)

- **On Update:** Only re-import when Grant approves a new rate card
- **Seasonal:** Typically quarterly or when seasons change (e.g., Summer → Winter rates)
- **Never** import rates without Grant's written approval

---

## ⚠️ Hard Gates & Safety Rules

### Autonomous & Manual Sync

### Never Auto-Send

- GuestFlow does **NOT** send emails or WhatsApp messages automatically
- All outputs are drafts for manual review
- Always verify guest details before sending any communication

### Never Invent Data

- If WiFi password is missing → show `[WIFI DETAILS PENDING]`
- If phone number is missing → leave blank
- If rate is missing → show `[RATE CARD REQUIRED]` or `[MISSING RATE]`
- If directions are incomplete → show placeholder text

### Never Write to Nightsbridge

- GuestFlow does NOT connect to Nightsbridge API
- All Nightsbridge changes must be done manually in Nightsbridge UI
- This is a **read-only** / import-only workflow

### Data Privacy

- Never share `arr_and_dep.xlsx` files publicly (contains guest phone numbers, emails)
- Keep exports in secure locations only
- Delete old exports after import (data is now in GuestFlow database)

---

## 📞 Support & Troubleshooting

**Owner:** Grant Brown  
**Email:** grant@thebrowns.co.za

### Autonomous Sync Issues

1. **Bookings not importing from Drive folder**
   - Check NIGHTSBRIDGE_DRIVE_FOLDER_ID is configured
   - Verify file uploaded to correct folder
   - Check Vercel Cron logs for errors
   - Fall back to manual import

2. **Cron not running at scheduled times**
   - Check Vercel Functions → Crons status
   - Verify CRON_SECRET is set
   - Check last deployment succeeded

3. **"Unauthorized" when triggering manually**
   - Verify correct CRON_SECRET
   - Use proper Authorization header format

### Manual Import Issues

1. **"Invalid booking reference or last name"** (Guest Portal)
   - Guest is entering wrong last name or booking ID
   - Check booking ID matches database
   - Verify guest name spelling in Nightsbridge

2. **"Missing fields detected"** (Import)
   - Go back to Nightsbridge and complete the booking details
   - Ensure all required fields (Guest Name, Room, Dates) are filled

3. **"Rate card required"** (Quote Draft)
   - Upload rate cards via `/ops/rate-cards`
   - Verify suite names match exactly between rate card and bookings

4. **File won't parse**
   - Ensure file is `.xlsx` format from Nightsbridge "Arrivals & Departures" report
   - Try re-downloading from Nightsbridge
   - Check file is not corrupted or empty

---

## 📋 Quick Reference Commands

### Autonomous Sync

**Check Endpoint Status:**
```bash
curl https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync
```

**Manual Trigger:**
```bash
curl -X POST https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync \
  -H "Authorization: Bearer [CRON_SECRET]"
```

**Upload File Directly:**
```bash
base64 arr_and_dep.xlsx > file.b64
curl -X POST https://guestflow.thebrowns.co.za/api/ops/nightsbridge-sync \
  -H "Authorization: Bearer [CRON_SECRET]" \
  -H "Content-Type: application/json" \
  -d '{"fileBase64": "'$(cat file.b64 | tr -d '\n')'", "fileName": "arr_and_dep.xlsx"}'
```

### Manual Import

**Daily Ops Checklist:**

- [ ] **Morning (Autonomous):** Export bookings from Nightsbridge, upload to Drive folder
- [ ] **Morning (Manual Fallback):** Export + import bookings at `/ops/nightsbridge-import` (next 7-14 days)
- [ ] **Morning:** Verify import succeeded at `/ops/bookings`
- [ ] **Morning:** Generate Daily Brief (`/ops/daily-brief`)
- [ ] **On Inquiry:** Process new inquiries (`/ops/inquiry-intake`)
- [ ] **Before Arrival:** Generate welcome drafts (`/ops/welcome-drafts`)
- [ ] **Before CT Pack:** Verify bookings are up-to-date
- [ ] **On Rate Change:** Upload new rate card (Grant approval required)

---

## 🎯 What GuestFlow Enables

Once bookings are imported into GuestFlow:

1. **Guest Portal Access**
   - Guests can view their stay details at `/guest/[bookingId]`
   - Portal shows WiFi, check-in times, house rules, directions, contact info
   - Staff can copy portal links from `/ops/bookings`

2. **Welcome Packs**
   - Generate welcome messages for arrivals (`/ops/welcome-drafts`)
   - Exports draft WhatsApp/email messages

3. **Daily Brief**
   - Morning ops brief with RED/AMBER/GREEN priorities
   - Arrivals, departures, housekeeping needs

4. **CT Pack**
   - Communication pack for upcoming stays
   - Booking change detection

5. **Quote Drafts**
   - Generate quotes using imported rate cards
   - Never invents rates — uses uploaded rate card data

---

**Remember:** All outputs are **DRAFT-ONLY**. Review and approve before sending to guests.

---

**End of Runbook**
