# Test Documentation: Phone & Email Mapping

## Synthetic Test Fixture

**File**: `nb-phone-email-synthetic.xlsx`
**Contains**: Synthetic data ONLY (fake names, +2782XXXXXXX phones, @example.com emails)

### Structure

1. **Arrival Section** with Phone Number + Email columns
   - Guest: "Jane Test", Phone: "+27821111111", Email: "jane.test@example.com"

2. **Departure Section** WITHOUT phone/email columns (tests no-crash behavior)
   - Guest: "John Test" (no phone/email fields)

3. **Arrival Section** with *2 variant columns
   - Guests: "Alice & Bob Test", with phone2/email2 fields

4. **Arrival Section** with local SA phone format
   - Phone: "082 444 5555" (tests normalization to E.164)

**IMPORTANT**: All data is synthetic. No real guest PII in fixtures.

## Manual Testing Procedure

### Unit Tests (Automated)

Run via `npm test` or Vercel Preview:
```bash
cd apps/guestflow
npm test  # Runs phone-email-mapping.test.ts
```

Tests cover all mapping scenarios without needing Excel files.

### Integration Testing (Manual - SA Ops Only)

**NEVER commit live A&D exports to git.**

For manual smoke testing with real exports:

1. SA Ops places latest `arr_and_dep.xlsx` in `/workspace/guestflow-nb-pull-YYYYMMDD/` **outside git**
2. Upload via curl:
   ```bash
   curl -X POST http://localhost:3000/api/cron/nightsbridge-ingest \
     -H "x-cron-secret: $CRON_SECRET" \
     -F "file=@/workspace/guestflow-nb-pull-YYYYMMDD/arr_and_dep.xlsx"
   ```
3. Verify response and database state
4. **Delete the file** after testing - never commit

### Expected Results

**Response**:
```json
{
  "success": true,
  "parsed": N,
  "inserted": M,
  "updated": K
}
```

**Database**:
```sql
-- Check bookings populated
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

**Verify**:
- Phone numbers in E.164 format ("+27...")
- Sections without phone/email columns imported successfully
- No crashes or errors

## Production Re-ingest

After PR merge, Coding triggers production ingest:

```bash
curl -X POST https://guestflow-production.vercel.app/api/cron/nightsbridge-ingest \
  -H "x-cron-secret: $PRODUCTION_CRON_SECRET" \
  -F "file=@latest_arr_and_dep.xlsx"
```

**Expected**: ~48% of bookings populate `guest_phone` (based on observed nonempty rate).

## Security Note

**NEVER commit live NB exports containing real guest data to git.**
- Use synthetic fixtures for unit tests
- Manual integration tests use files **outside git** only
- Production ingest runs via secure cron with CRON_SECRET
