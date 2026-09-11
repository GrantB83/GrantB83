# API Contract: Welcome Drafts with Portal Links

**Endpoint**: `GET /api/welcome-drafts`

**Purpose**: Generate welcome message drafts for upcoming bookings with embedded guest portal magic links

**Authentication**: Staff-only (protected by middleware)

## Request

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `tenant_id` | integer | Yes | Tenant ID to filter bookings | `1` |
| `as_of` | string (ISO date) | No | Start date for booking window | `2026-09-15` |
| `window_days` | integer | No | Number of days to look ahead | `1` |

### Example Request

```http
GET /api/welcome-drafts?tenant_id=1&as_of=2026-09-15&window_days=1 HTTP/1.1
Host: guestflow.thebrowns.co.za
```

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "asOfDate": "2026-09-15",
  "windowDays": 1,
  "drafts": [
    {
      "id": 123,
      "guestName": "John Smith",
      "checkIn": "2026-09-15",
      "checkOut": "2026-09-17",
      "property": "The Browns Guesthouse",
      "roomNumber": "Suite 3",
      "message": "# Welcome Message Stub — John Smith\n\n**Check-in:** Sunday, 15 Sep 2026\n**Check-out:** Tuesday, 17 Sep 2026\n**Property:** The Browns Guesthouse\n**Room:** Suite 3\n\n---\n\nHi there,\n\nLooking forward to welcoming you to The Browns in Dullstroom on Sunday, 15 Sep 2026!\n\n🔗 Your digital welcome pack:\nhttps://guestflow.thebrowns.co.za/guest/xK3jD9mQpL7vB2nF8tR6wY4cH1aZ5eV0sN9gU3jP7iL\n\n(All check-in details, Wi-Fi, access codes, and property info are in your portal)\n\nQuestions? Just reply to this message.\n\nWarm regards,\nThe Browns Team\nDullstroom",
      "missingFields": [],
      "portalUrl": "https://guestflow.thebrowns.co.za/guest/xK3jD9mQpL7vB2nF8tR6wY4cH1aZ5eV0sN9gU3jP7iL"
    }
  ],
  "stats": {
    "totalBookings": 3,
    "draftCount": 2,
    "skippedNoName": 1
  },
  "skippedNoName": [
    {
      "id": 124,
      "checkIn": "2026-09-15",
      "roomNumber": "Suite 5"
    }
  ]
}
```

### WelcomeDraft Object Schema

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | integer | Booking ID | Positive integer |
| `guestName` | string | Guest full name | Non-empty |
| `checkIn` | string | Check-in date | ISO 8601 date (YYYY-MM-DD) |
| `checkOut` | string | Check-out date | ISO 8601 date (YYYY-MM-DD) |
| `property` | string | Property name | Non-empty |
| `roomNumber` | string \| null | Room/suite number | May be null if not assigned |
| `message` | string | Complete draft message | Contains portal URL (no `[PORTAL_URL]` placeholders) |
| `missingFields` | string[] | Validation flags | e.g., `['guest_phone']`, `['portal_url']` |
| `portalUrl` | string \| undefined | Guest portal magic link | Format: `https://{domain}/guest/{token}` where token is 43 characters |

### Portal URL Format

**Pattern**: `https://{domain}/guest/{token}`

- **Domain**: Configurable via `NEXT_PUBLIC_PORTAL_BASE_URL` environment variable
  - Default: `guestflow.thebrowns.co.za`
  - Alternative: `stay.thebrowns.co.za` (when CNAME configured)
- **Token**: 43-character URL-safe base64 string (32 random bytes encoded)
  - Example: `xK3jD9mQpL7vB2nF8tR6wY4cH1aZ5eV0sN9gU3jP7iL`
  - Alphabet: `A-Z`, `a-z`, `0-9`, `-`, `_`

### Error Response (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Failed to generate welcome drafts"
}
```

---

## Behavior Changes

### Before This Feature

```json
{
  "message": "...\nLooking forward to welcoming you...\n\nWarm regards,\nThe GuestFlow Team",
  "portalUrl": undefined,  // Field not populated
  "missingFields": []
}
```

### After This Feature

```json
{
  "message": "...\n\n🔗 Your digital welcome pack:\nhttps://guestflow.thebrowns.co.za/guest/{token}\n\n...\nWarm regards,",
  "portalUrl": "https://guestflow.thebrowns.co.za/guest/{token}",
  "missingFields": []
}
```

### When Token Generation Fails

```json
{
  "message": "...\nLooking forward to welcoming you...\n\n[Portal link unavailable - please generate manually]\n\nWarm regards,",
  "portalUrl": null,
  "missingFields": ["portal_url"]
}
```

---

## Side Effects

### Database Writes

Each draft generation for a booking **may** result in:

1. **INSERT** into `guest_tokens` table:
   ```sql
   INSERT INTO guest_tokens (booking_id, token_hash, expires_at) 
   VALUES (?, ?, ?);
   ```

2. **UPDATE** (revocation) of existing tokens:
   ```sql
   UPDATE guest_tokens 
   SET revoked = 1 
   WHERE booking_id = ? AND revoked = 0;
   ```

**Token Generation Policy**: Fresh token generated on every draft generation request. Previous tokens are revoked automatically.

### No Side Effects On

- ❌ Bookings table (read-only)
- ❌ Properties table (read-only)
- ❌ WhatsApp API (drafts do not auto-send)
- ❌ Email sending (drafts do not auto-send)

---

## Error Handling

### Graceful Degradation

If token generation fails for a specific booking:
- ✅ Other drafts in the response still generated normally
- ✅ Failed draft includes `"portal_url"` in `missingFields` array
- ✅ Message text includes fallback note about manual generation
- ✅ HTTP 200 response (partial success, not failure)

### Complete Failure Scenarios

Returns HTTP 500 only if:
- ❌ Database connection fails entirely
- ❌ Booking query fails (unexpected database error)
- ❌ Critical unhandled exception

---

## Backwards Compatibility

### UI Compatibility

Existing frontend code (`/ops/welcome-drafts/page.tsx`) already includes:
- ✅ `portalUrl?: string` field in WelcomeDraft interface (currently unused)
- ✅ Message display shows complete message text (portal URL will appear naturally)
- ✅ No code changes required to display populated portal URLs

### API Compatibility

- ✅ Response shape unchanged (only field values populated)
- ✅ Existing clients receive new `portalUrl` field (additive change)
- ✅ `missingFields` array extended with new `'portal_url'` value (backwards compatible)

---

## Security & Privacy

### What is Exposed

- ✅ Portal URLs in response (necessary for staff to copy/send)
- ✅ Token strings in URLs (safe - tokens are random, meaningless without database)

### What is NOT Exposed

- ❌ Token hashes (remain in database only)
- ❌ Guest phone numbers (unless already in response)
- ❌ Access codes or sensitive property info (not in draft, only in portal)
- ❌ Raw cryptographic token generation logic (library functions only)

### Rate Limiting

Not implemented at API level. Natural rate limiting via:
- 🔒 Staff authentication requirement (no public access)
- 🔒 Small booking volumes (~10-50 per week)
- 🔒 Manual trigger (staff must click "Refresh Drafts")

---

## Testing Contracts

### Contract Tests (Should Verify)

1. ✅ Response includes `portalUrl` for each draft
2. ✅ `portalUrl` matches pattern `https://{domain}/guest/{token}`
3. ✅ Token is 43 characters (URL-safe base64)
4. ✅ Message text contains the same URL as `portalUrl` field
5. ✅ No `[PORTAL_URL]` placeholders in message text
6. ✅ `missingFields` includes `'portal_url'` when generation fails
7. ✅ Clicking `portalUrl` loads guest portal page (end-to-end test)

### Example Contract Test

```typescript
// apps/guestflow/__tests__/welcome-drafts-portal-links.test.ts

test('welcome drafts include working portal URLs', async () => {
  const response = await fetch('/api/welcome-drafts?tenant_id=1&as_of=2026-09-15')
  const data = await response.json()
  
  expect(data.success).toBe(true)
  expect(data.drafts.length).toBeGreaterThan(0)
  
  const draft = data.drafts[0]
  
  // Contract: portalUrl field is populated
  expect(draft.portalUrl).toBeDefined()
  expect(draft.portalUrl).toMatch(/^https:\/\/.+\/guest\/[A-Za-z0-9_-]{43}$/)
  
  // Contract: message contains URL
  expect(draft.message).toContain(draft.portalUrl)
  
  // Contract: no placeholders
  expect(draft.message).not.toContain('[PORTAL_URL]')
  
  // Contract: missing fields empty when successful
  expect(draft.missingFields).not.toContain('portal_url')
})
```

---

## Change Summary

| Aspect | Before | After |
|--------|--------|-------|
| `portalUrl` field | `undefined` | Populated URL string |
| Message text | Generic greeting | Includes portal link section |
| `[PORTAL_URL]` placeholders | N/A (not used in API) | Never present |
| Database writes | None | INSERT into guest_tokens per booking |
| Token reuse | N/A | Revoke old, generate fresh each time |

---

## Migration Notes

**No breaking changes** - This is an additive enhancement. Existing API consumers will receive new data without code changes.
