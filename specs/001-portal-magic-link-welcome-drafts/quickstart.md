# Quickstart: Validating Portal Magic Link Minting

**Feature**: Portal Magic Link Minting in Welcome Drafts  
**Purpose**: End-to-end validation guide for verifying the feature works correctly

---

## Prerequisites

### Environment Setup

1. **GuestFlow application running locally**:
   ```bash
   cd apps/guestflow
   npm run dev
   ```
   → Server should start on http://localhost:3100

2. **Database initialized with test data**:
   ```bash
   npm run db:init
   npm run seed:browns
   ```
   → Creates `data/guestflow.db` with sample bookings

3. **Environment variables** (optional):
   ```bash
   # In apps/guestflow/.env.local (or use defaults)
   NEXT_PUBLIC_PORTAL_BASE_URL=https://guestflow.thebrowns.co.za
   ```

### Verification Prerequisites Met

- ✅ Node.js 20+ installed
- ✅ SQLite database exists at `apps/guestflow/data/guestflow.db`
- ✅ Dev server responds to http://localhost:3100/api/health

---

## Validation Scenario 1: Generate Drafts with Portal Links

### Objective
Verify that welcome drafts include working portal URLs minted during generation.

### Steps

1. **Open Welcome Drafts page**:
   ```
   http://localhost:3100/ops/welcome-drafts
   ```

2. **Configure filters**:
   - As of Date: [Today's date or future date with bookings]
   - Window Days: `1`

3. **Click "Refresh Drafts"**

### Expected Outcomes

✅ **Drafts appear** with booking details (guest name, check-in, property)

✅ **Each draft message includes a portal URL section**:
   ```
   🔗 Your digital welcome pack:
   https://guestflow.thebrowns.co.za/guest/{43-char-token}
   
   (All check-in details, Wi-Fi, access codes, and property info are in your portal)
   ```

✅ **No placeholder text** like `[PORTAL_URL]` appears in any message

✅ **Portal URL matches pattern**: `https://{domain}/guest/{token}` where token is exactly 43 characters

### How to Verify

- **Visual check**: Look at draft message text in UI - URL should be present and fully formed
- **Browser DevTools**: Open Network tab, inspect `/api/welcome-drafts` response:
  ```json
  {
    "drafts": [
      {
        "id": 123,
        "portalUrl": "https://guestflow.thebrowns.co.za/guest/xK3j...",
        "message": "...\nhttps://guestflow.thebrowns.co.za/guest/xK3j...\n...",
        "missingFields": []
      }
    ]
  }
  ```
- **Copy URL**: Copy portal URL from draft, paste into browser address bar

---

## Validation Scenario 2: Portal URLs Are Clickable

### Objective
Verify that generated portal URLs actually load the guest portal page.

### Steps

1. **Generate drafts** (as in Scenario 1)

2. **Copy a portal URL** from any draft message  
   Example: `https://guestflow.thebrowns.co.za/guest/xK3jD9mQpL7vB2nF8tR6wY4cH1aZ5eV0sN9gU3jP7iL`

3. **Open URL in a new browser tab**

### Expected Outcomes

✅ **Guest portal page loads** showing booking details:
   - Guest name
   - Check-in and check-out dates
   - Property information
   - (Access codes if within show window - 24h before check-in)

❌ **NOT an error page** (404, 500, "Invalid token", etc.)

### How to Verify

- **Visual check**: Page title should be "Guest Portal" or similar
- **Content check**: Booking details match the draft's booking data
- **No auth prompt**: Guest portal should load directly without login (magic link auth)

---

## Validation Scenario 3: Token Persistence Across Refreshes

### Objective
Verify that regenerating drafts creates fresh tokens (expected behavior per design).

### Steps

1. **Generate drafts once**, note a portal URL from Draft A  
   Example: `https://.../guest/ABC123...`

2. **Click "Refresh Drafts" again** without changing filters

3. **Compare portal URLs** for the same booking (Draft A)

### Expected Outcomes

✅ **Portal URL has changed** (new token generated)  
   - First generation: `https://.../guest/ABC123...`
   - Second generation: `https://.../guest/XYZ789...` (different token)

✅ **Both URLs still work** when clicked (both tokens valid)

✅ **Old token is revoked** in database:
   ```bash
   # Check database directly (optional verification)
   sqlite3 apps/guestflow/data/guestflow.db
   SELECT booking_id, token_hash, revoked FROM guest_tokens WHERE booking_id = 123;
   ```
   → Older tokens should have `revoked = 1`

### How to Verify

- **String comparison**: Copy both URLs, diff the token portions - should differ
- **Click both**: Both should load portal (tokens remain valid temporarily)
- **Database check**: Query guest_tokens table to see revoked=1 for old tokens

---

## Validation Scenario 4: Error Handling (Missing Data)

### Objective
Verify graceful degradation when token generation fails or booking data is incomplete.

### Steps

1. **Simulate missing check-out date** (optional - requires database manipulation):
   ```sql
   sqlite3 apps/guestflow/data/guestflow.db
   UPDATE bookings SET check_out = NULL WHERE id = 123;
   ```

2. **Generate drafts** for booking with missing data

### Expected Outcomes

✅ **Draft still appears** (not skipped entirely)

✅ **If check-out is missing**:
   - Token still generated (expiry calculated as check-in + 14 days)
   - Portal URL still present in message
   - `missingFields` may be empty (missing check-out doesn't block token gen)

❌ **No crash or 500 error** from API

### How to Verify

- **API response**: Status 200, `success: true`
- **Draft count**: Booking with missing data still included in drafts array
- **Portal URL present**: Even with missing data, `portalUrl` field should be populated

---

## Validation Scenario 5: No Placeholders Legacy Check

### Objective
Ensure old `[PORTAL_URL]` placeholder text never appears in new drafts.

### Steps

1. **Generate drafts** for multiple bookings

2. **Search all draft messages** for the text `[PORTAL_URL]`
   - Method 1: Visual scan in UI
   - Method 2: Browser DevTools → Network → Response JSON search
   - Method 3: Automated test (see contract test below)

### Expected Outcomes

✅ **Zero occurrences** of `[PORTAL_URL]` in any draft message

✅ **Only actual URLs** appear (starting with `https://`)

### How to Verify

```bash
# Automated check via API
curl -s 'http://localhost:3100/api/welcome-drafts?tenant_id=1&as_of=2026-09-15' \
  | jq '.drafts[].message' \
  | grep -q '\[PORTAL_URL\]' \
  && echo "FAIL: Placeholder found" \
  || echo "PASS: No placeholders"
```

---

## Automated Test Commands

### Run Integration Tests

```bash
cd apps/guestflow
npm test -- welcome-drafts-portal-links.test.ts
```

**Expected output**:
```
✓ welcome drafts include working portal URLs
✓ portal URLs match expected pattern
✓ no [PORTAL_URL] placeholders in messages
✓ portal URLs load guest portal page
✓ token generation handles missing check-out dates
```

### Run Smoke Tests

```bash
cd apps/guestflow
npm run smoke  # Includes welcome drafts endpoint
```

**Expected output**:
```
✅ GET /api/welcome-drafts - drafts generated successfully
✅ Portal URLs present in all drafts
✅ No placeholder text found
```

---

## Troubleshooting

### Issue: Portal URLs not appearing in drafts

**Symptoms**: `portalUrl` field is `null` or `undefined`, message lacks URL

**Possible Causes**:
1. Database connection failed → Check SQLite file exists and is writable
2. Token generation threw exception → Check console logs for errors
3. Feature not yet implemented → Verify code changes deployed

**Resolution**:
1. Check browser console and terminal logs for errors
2. Verify `guest_tokens` table exists: `sqlite3 data/guestflow.db ".schema guest_tokens"`
3. Inspect API response: Look for `missingFields: ["portal_url"]`

---

### Issue: Portal URLs return 404 when clicked

**Symptoms**: URL generated but clicking it shows "Not Found"

**Possible Causes**:
1. Guest portal route not configured → Check `app/guest/[code]/page.tsx` exists
2. Token lookup failed → Check `token_hash` stored correctly in database
3. Token expired/revoked → Check `revoked` and `expires_at` columns

**Resolution**:
1. Test portal route directly: http://localhost:3100/guest/test123 (should show error but not 404)
2. Check database for token: `SELECT * FROM guest_tokens WHERE booking_id = 123;`
3. Verify token hashing matches: Compare hash in DB vs hash of URL token

---

### Issue: Same portal URL on refresh (token not regenerating)

**Symptoms**: Expected fresh token on refresh, but URL unchanged

**Possible Causes**:
1. Token reuse logic not revoked old tokens → Check implementation
2. Same token accidentally generated (extremely unlikely) → Check crypto randomness

**Resolution**:
1. Query database: `SELECT COUNT(*) FROM guest_tokens WHERE booking_id = 123 AND revoked = 0;`
   → Should be 1 after refresh
2. Check revoked count: `SELECT COUNT(*) FROM guest_tokens WHERE booking_id = 123 AND revoked = 1;`
   → Should increase after each refresh

---

## Success Criteria Checklist

Before marking feature complete, verify all these pass:

- [ ] Drafts generate successfully with portal URLs in message text
- [ ] Portal URLs match format `https://{domain}/guest/{43-char-token}`
- [ ] Clicking portal URLs loads guest portal page (no errors)
- [ ] No `[PORTAL_URL]` placeholder text in any draft message
- [ ] Multiple draft generations create different tokens (revoke-and-regenerate working)
- [ ] Error handling graceful (missing data doesn't crash API)
- [ ] Integration tests pass (`npm test welcome-drafts-portal-links.test.ts`)
- [ ] Smoke tests pass (`npm run smoke`)
- [ ] Manual UI testing shows URLs in Ops Hub welcome drafts page
- [ ] Database contains guest_tokens entries with correct expiry dates

---

## Next Steps After Validation

Once all validation scenarios pass:

1. **Commit changes** to feature branch
2. **Create pull request** against `main`
3. **Document smoke test steps** in PR description
4. **Request review** from Grant (repo owner)
5. **Deploy to staging/production** after approval

---

## Reference Links

- [Spec](./spec.md) - Feature requirements
- [Data Model](./data-model.md) - Database schema and relationships
- [API Contract](./contracts/api-welcome-drafts.md) - Detailed API behavior
- [Plan](./plan.md) - Implementation plan and technical context
