# Test Documentation: Phone & Email Mapping

## No Excel Fixture in Repo

**Unit tests only** - no xlsx files in this fixtures directory.

The unit tests in `phone-email-mapping.test.ts` cover all mapping scenarios by testing the `mapNbSectionRow` function directly with synthetic data arrays. No Excel file needed.

**IMPORTANT**: All test data is synthetic (`@example.com`, `+2782XXXXXXX` phones only). No real guest PII in fixtures.

## Testing Strategy

### Unit Tests (Primary - Automated)

Run via `npm test` or Vercel Preview:
```bash
cd apps/guestflow
npm test  # Runs phone-email-mapping.test.ts
```

**Coverage**:
- Phone Number / Email → guestPhone / guestEmail mapping
- Phone Number *2 / Email *2 → guestPhone2 / guestEmail2 variants
- Sections WITHOUT phone/email columns (tests no-crash behavior)
- Local SA phone format normalization (e.g., "082 444 5555" → "+27824445555")
- Empty/null/whitespace handling
- Header normalization compatibility

**No Excel file needed** - pure function testing with synthetic data.

### Integration Testing (Manual - SA Ops Only)

**NEVER commit live A&D exports to git.**

For manual smoke testing with real Nightsbridge exports:

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
- Unit tests use synthetic data only (no xlsx needed)
- Manual integration tests use files **outside git** only (`/workspace/guestflow-nb-pull-*/`)
- Production ingest runs via secure cron with CRON_SECRET

## Optional: Synthetic Fixture for Future Manual Testing

If a synthetic Excel fixture is needed in the future for manual integration testing (e.g., testing the full upload flow without real data):

- Create multi-section xlsx with FAKE data only (`guest@example.com`, `+2782XXXXXXX`)
- Include sections with/without phone/email columns
- **Never** use real guest names, phones, or emails
- Commit only if genuinely needed - current unit tests are sufficient
