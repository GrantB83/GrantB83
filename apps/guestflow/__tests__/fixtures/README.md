# Test Documentation: Phone & Email Mapping

## Manual Testing Procedure

### Using Live Sample File

The live Nightsbridge file `arr_and_dep-2026-09-21-0500.xlsx` is available in `__tests__/fixtures/nb-phone-email-live-sample.xlsx` for manual testing.

### Test Command

```bash
cd apps/guestflow

# Start dev server
npm run dev

# In another terminal, upload the fixture
curl -X POST http://localhost:3000/api/cron/nightsbridge-ingest \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@__tests__/fixtures/nb-phone-email-live-sample.xlsx"
```

### Expected Results

1. **Response should show**:
   - `success: true`
   - `parsed > 0` (number of bookings found)
   - `inserted` or `updated > 0`

2. **Database verification**:
```sql
-- Check bookings have phone/email populated
SELECT guest_name, guest_phone, guest_email 
FROM bookings 
WHERE guest_phone IS NOT NULL 
LIMIT 10;

-- Check guest_contacts created
SELECT normalized_phone, email, display_name, source 
FROM guest_contacts 
WHERE source = 'nb' 
ORDER BY id DESC 
LIMIT 10;
```

3. **Phone normalization check**:
   - All `normalized_phone` values should start with "+27"
   - Local format "082..." should become "+2782..."

### Test Cases Covered by Live Sample

✅ Arrival sections with "Phone Number" column
✅ Arrival sections with "Email" column
✅ Departure sections (may not have phone/email columns)
✅ Real-world phone number formats
✅ guest_contacts upsert on phone present

### Automated Test TODO

The existing test file at `__tests__/route.test.ts` has placeholders for Phase 17 UPSERT tests. A future PR should add:

```typescript
it('should parse phone and email from NB headers', async () => {
  // Test that Phone Number → guestPhone, Email → guestEmail
  // Test that sections without phone/email don't crash
  // Test that *2 variants work
})
```

## Code Changes Summary

Modified `apps/guestflow/src/app/api/cron/nightsbridge-ingest/route.ts`:

- Lines ~227-239: Added phone/email header mapping logic in `currentHeaders.forEach` loop
- Maps "phonenumber" (from "Phone Number") → `booking.guestPhone`
- Maps "email" → `booking.guestEmail`
- Maps "*2" variants → `guestPhone2` / `guestEmail2`
- Existing line 360 `upsertGuestContact` already normalizes phone to E.164

## Live Production Testing

After PR merge, SA Ops should:

1. Trigger a fresh ingest with latest A&D:
```bash
curl -X POST https://guestflow-production.vercel.app/api/cron/nightsbridge-ingest \
  -H "x-cron-secret: $PRODUCTION_CRON_SECRET" \
  -F "file=@latest_arr_and_dep.xlsx"
```

2. Verify ~48% of bookings now have `guest_phone` populated (based on 2026-09-21 nonempty rate)

3. Check WA Web allowlist can now match real guest numbers:
```sql
SELECT COUNT(*) FROM guest_contacts WHERE source = 'nb' AND normalized_phone IS NOT NULL;
```
