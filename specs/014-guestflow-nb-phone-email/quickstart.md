# Quickstart: Testing Phone & Email Mapping

## Prerequisites

- Node.js 18+ installed
- Local development database (SQLite or Turso)
- `CRON_SECRET` configured in `.env.local`

## Test Procedure

### 1. Prepare Test Fixture

Create `apps/guestflow/__tests__/fixtures/nb-phone-email-multi-section.xlsx` with:

**Arrival Section:**
- Headers: Room Name | Guest Name | Phone Number | Email | Number of Guests | Booking ID | Notes | Nights
- Data row: Cottage 1 | Jane Doe | +27821234567 | jane@example.com | 2 | NB-12345 | Early check-in | 3

**Departure Section (no phone/email columns):**
- Headers: Room Name | Guest Name | Number of Guests | Booking ID | Nights
- Data row: Cottage 2 | John Smith | 2 | NB-67890 | 2

**Arrival Section with *2 columns:**
- Headers: Room Name | Guest Name | Phone Number | Email | Phone Number *2 | Email *2 | Number of Guests | Booking ID | Nights
- Data row: Cottage 3 | Alice & Bob | +27829876543 | alice@example.com | +27828765432 | bob@example.com | 2 | NB-11111 | 4

### 2. Start Development Server

```bash
cd apps/guestflow
npm install
npm run dev
```

### 3. Upload Test File

```bash
curl -X POST http://localhost:3000/api/cron/nightsbridge-ingest \
  -H "x-cron-secret: your_secret_here" \
  -F "file=@__tests__/fixtures/nb-phone-email-multi-section.xlsx"
```

### 4. Verify Response

Expected JSON response:
```json
{
  "success": true,
  "parsed": 3,
  "inserted": 3,
  "updated": 0,
  "message": "Successfully imported 3 bookings..."
}
```

### 5. Verify Database State

**Check bookings table:**
```sql
SELECT 
  guest_name, 
  guest_phone, 
  guest_email, 
  guest_phone2, 
  guest_email2 
FROM bookings 
WHERE guest_name IN ('Jane Doe', 'John Smith', 'Alice & Bob');
```

**Expected results:**
- Jane Doe: phone="+27821234567", email="jane@example.com", phone2=null, email2=null
- John Smith: phone=null, email=null, phone2=null, email2=null (section had no phone/email columns)
- Alice & Bob: phone="+27829876543", email="alice@example.com", phone2="+27828765432", email2="bob@example.com"

**Check guest_contacts table:**
```sql
SELECT 
  normalized_phone, 
  email, 
  display_name, 
  source 
FROM guest_contacts 
WHERE source = 'nb' 
ORDER BY id DESC 
LIMIT 3;
```

**Expected results:**
- 2 rows created (Jane Doe and Alice & Bob)
- John Smith not in guest_contacts (no phone provided)

### 6. Edge Case Tests

**Test empty phone:**
- Upload section with empty Phone Number cell
- Verify: booking created with guest_phone=null, no guest_contacts row

**Test invalid phone:**
- Upload section with Phone Number="abc123"
- Verify: normalizeZaE164 returns null, guest_phone=null

**Test local format phone:**
- Upload section with Phone Number="082 123 4567"
- Verify: normalized to "+27821234567" in guest_contacts

## Success Criteria

✅ Multi-section file with mixed phone/email columns imports successfully
✅ Phone numbers are normalized to E.164 format in guest_contacts
✅ Sections without phone/email columns don't crash
✅ guest_contacts rows are created only when phone is present
✅ *2 variant columns are mapped to guestPhone2/guestEmail2
