# SA Ops Runbook: Nightsbridge → GuestFlow Data Sync

**Version:** 1.0  
**Date:** September 2026  
**Property:** The Browns Dullstroom (Nightsbridge Property ID 24299)  
**Audience:** SA Operations staff

---

## Overview

This runbook documents how to export bookings and rate cards from Nightsbridge and import them into GuestFlow for guest portal access and operational packs.

**Important:** This is a **one-way import**. Data flows from Nightsbridge → GuestFlow. GuestFlow does NOT write back to Nightsbridge.

---

## 📊 Part 1: Bookings Import

### Data Flow

```
Nightsbridge Calendar
    ↓ (Reports → Arrivals & Departures)
arr_and_dep.xlsx download
    ↓ (Upload to GuestFlow)
GuestFlow Database
    ↓ (Available for)
Guest Portal + Welcome Packs + Daily Brief
```

### Step 1: Export from Nightsbridge

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

### Step 2: Import into GuestFlow

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

## 💰 Part 2: Rate Card Import

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

### Bookings

- **Daily:** Export and import bookings every morning (before 09:00 SAST)
- **On Change:** Re-import after any major booking changes (new reservations, cancellations, room moves)
- **Before CT Pack:** Always import fresh bookings before generating a CT Pack or guest communication

### Rate Cards

- **On Update:** Only re-import when Grant approves a new rate card
- **Seasonal:** Typically quarterly or when seasons change (e.g., Summer → Winter rates)
- **Never** import rates without Grant's written approval

---

## ⚠️ Hard Gates & Safety Rules

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

**Common Issues:**

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

### Daily Ops Checklist

- [ ] **Morning:** Export bookings from Nightsbridge (next 7-14 days)
- [ ] **Morning:** Import bookings into GuestFlow (`/ops/nightsbridge-import`)
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
