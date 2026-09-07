# Guest Portal - Magic Link Authentication

The guest portal provides secure, unguessable stay-scoped access to booking information via cryptographic magic tokens. This replaces the previous last-name authentication system.

## Overview

**Key Features:**
- Cryptographically secure random tokens (not sequential booking IDs)
- Hashed storage (SHA-256) - raw tokens never stored
- Time-limited validity (confirmation through checkout + 14-day buffer)
- Staff can regenerate tokens without re-approving WhatsApp messages
- Time-gated access codes (shown 24h before check-in)
- WEBDIRECT booking CTA only shown post-checkout
- Mobile-friendly design

## Portal Content (Source of Truth)

**Portal shows ONLY data from NightsBridge/staff facts:**
- Guest name, check-in/out dates, suite/unit
- Adults/children count, special requests
- Wi-Fi credentials (env vars)
- Access codes (env vars, time-gated)
- Parking instructions (env vars)
- Directions (env vars)
- House rules (env vars)
- Contact details (env vars)

**Never invented:**
- Missing fields → "ask reception" or placeholder message
- No fake phone numbers, passwords, or access codes

## Security Model

### Token Generation

```typescript
// Generate token (staff action)
POST /api/bookings/{bookingId}/generate-link

// Returns
{
  "magicLink": "https://guestflow.thebrowns.co.za/guest/abc123...",
  "whatsappStub": "Hi John,\n\nYour stay details for January 15, 2026:\nhttps://...",
  "expiresAt": "2026-01-29T10:00:00.000Z"
}
```

### Token Storage

- **Raw token**: 32 bytes (256 bits) cryptographic random, base64url encoded
- **Stored**: SHA-256 hash only (never raw token)
- **Database**: `guest_tokens` table with `booking_id`, `token_hash`, `expires_at`, `revoked`

### Token Validation

When guest visits `/guest/{token}`:

1. Hash the token from URL
2. Look up hash in database
3. Check if expired or revoked
4. Check if associated booking exists
5. Update `last_accessed_at` timestamp
6. Mark `used_at` on first access
7. Return stay information

### Expiry Calculation

```
expiresAt = checkOutDate + 14 days buffer
```

**Example:**
- Check-in: Jan 15, 2026
- Check-out: Jan 18, 2026
- Token valid until: Feb 1, 2026 (18 + 14 days)

## Time-Gating

### Access Codes (Gate/Door)

Access codes are only shown when:
```
NOW >= checkInDate - 24 hours AND NOW <= checkOutDate end-of-day
```

**Example:**
- Check-in: Jan 15, 2026 14:00
- Codes available from: Jan 14, 2026 14:00
- Codes available until: Jan 18, 2026 23:59:59

Before this window:
```
"Access codes will be available 24 hours before your check-in date"
```

During and after window:
- Shows gate code (if configured)
- Shows door code (if configured)
- Or "Please contact reception for access details" if not configured

### WEBDIRECT Booking CTA

Only shown **post-checkout**:

```typescript
stayPhase = getStayPhase(checkIn, checkOut)
// 'pre-stay' | 'during-stay' | 'post-checkout'

if (stayPhase === 'post-checkout') {
  showWebDirectCTA = true
}
```

**Pre-stay and during-stay:** No CTA shown  
**Post-checkout:** Shows booking link to `https://book.nightsbridge.com/24299?promocode=WEBDIRECT`

## Staff Workflows

### 1. Generate Magic Link for New Booking

**API Call:**
```bash
POST /api/bookings/123/generate-link
```

**Response:**
```json
{
  "success": true,
  "bookingId": 123,
  "guestName": "John Smith",
  "magicLink": "https://guestflow.thebrowns.co.za/guest/xyz789abc...",
  "whatsappStub": "Hi John,\n\nYour stay details for January 15, 2026:\nhttps://guestflow.thebrowns.co.za/guest/xyz789abc...\n\nLooking forward to welcoming you!",
  "expiresAt": "2026-02-01T00:00:00.000Z",
  "token": "xyz789abc..."
}
```

### 2. Regenerate Link (Lost/Expired)

Same endpoint, same call:
```bash
POST /api/bookings/123/generate-link
```

**What happens:**
1. Revokes all existing tokens for this booking (`revoked = 1`)
2. Generates new token
3. Returns new magic link and WhatsApp stub

**Use cases:**
- Guest lost the link
- Token expired
- Security concern (regenerate invalidates old link)
- Staff wants to resend the welcome message

### 3. Check Existing Link Status

**API Call:**
```bash
GET /api/bookings/123/generate-link
```

**Response (has active link):**
```json
{
  "hasActiveLink": true,
  "bookingId": 123,
  "guestName": "John Smith",
  "createdAt": "2025-12-20T10:00:00.000Z",
  "expiresAt": "2026-02-01T00:00:00.000Z",
  "usedAt": "2026-01-10T14:30:00.000Z",
  "lastAccessedAt": "2026-01-14T09:15:00.000Z",
  "note": "Token hash is stored securely. Use POST to generate a new link."
}
```

**Response (no active link):**
```json
{
  "hasActiveLink": false,
  "message": "No active magic link found. Generate a new one."
}
```

## WhatsApp Integration

### Welcome Message Template

The `/api/bookings/{id}/generate-link` endpoint returns a `whatsappStub` field:

```
Hi {firstName},

Your stay details for {checkInDate}:
{magicLink}

Looking forward to welcoming you!
```

**Example:**
```
Hi John,

Your stay details for January 15, 2026:
https://guestflow.thebrowns.co.za/guest/xyz789abc123def456...

Looking forward to welcoming you!
```

### SA Ops Workflow

1. Generate link via API or staff UI
2. Copy `whatsappStub` text
3. Paste into WhatsApp Cloud API / Respond.io / manual WhatsApp
4. Send to guest (human-gated, never auto-send)

**Note:** Staff can open the same packet and resend the link (SA Ops fallback) without re-approving the entire WhatsApp message.

## Environment Configuration

All portal content comes from environment variables (never invented):

```bash
# Property contact
PROPERTY_PHONE=+27 82 123 4567
PROPERTY_EMAIL=grant@thebrowns.co.za
PROPERTY_WHATSAPP=+27 82 123 4567
EMERGENCY_CONTACT=Grant Brown: +27 82 123 4567

# WiFi (shown to all guests)
WIFI_NETWORK=TheBrowns-Guest
WIFI_PASSWORD=secure-password-here

# Access codes (time-gated: 24h before check-in through checkout)
PROPERTY_GATE_CODE=1234
PROPERTY_DOOR_CODE=5678

# Parking
PROPERTY_PARKING=Free parking available on the property. Please park in marked guest bays only.

# Directions
PROPERTY_DIRECTIONS=From Dullstroom town center, take R540 south for 2km. Turn left at the sign for The Browns. Gate code will be provided 24 hours before check-in.
```

### Vercel Deployment

```bash
# Set environment variables
vercel env add WIFI_NETWORK
vercel env add WIFI_PASSWORD
vercel env add PROPERTY_GATE_CODE
vercel env add PROPERTY_DOOR_CODE
vercel env add PROPERTY_PARKING
vercel env add PROPERTY_DIRECTIONS

# Deploy
vercel --prod
```

## Guest Experience

### 1. Receive Link (WhatsApp/Email)

Guest receives:
```
Hi John,

Your stay details for January 15, 2026:
https://guestflow.thebrowns.co.za/guest/xyz789abc...

Looking forward to welcoming you!
```

### 2. Click Link

Opens directly to their stay portal - **no password required**

### 3. View Stay Information

**Always visible:**
- Booking summary (name, dates, suite, adults/children)
- Check-in/out times
- Contact information
- House rules
- Directions
- Parking instructions

**Time-gated (24h before check-in):**
- Wi-Fi credentials (if configured)
- Access codes (gate/door)

**Post-checkout only:**
- WEBDIRECT booking CTA

### 4. Mobile Optimized

- Responsive design
- Large touch targets
- Easy-to-read fonts (especially codes)
- Copy-paste friendly (monospace codes)

## API Reference

### Generate/Regenerate Magic Link

```
POST /api/bookings/{bookingId}/generate-link
```

**Authentication:** Requires staff authentication (middleware enforced)

**Parameters:**
- `bookingId` (path): Booking ID

**Response (200):**
```json
{
  "success": true,
  "bookingId": 123,
  "guestName": "John Smith",
  "magicLink": "https://...",
  "whatsappStub": "Hi John,...",
  "expiresAt": "2026-02-01T00:00:00.000Z",
  "token": "abc123..."
}
```

**Errors:**
- `400`: Invalid booking ID
- `404`: Booking not found
- `500`: Server error

---

### Get Link Status

```
GET /api/bookings/{bookingId}/generate-link
```

**Authentication:** Requires staff authentication

**Response (200 - active link exists):**
```json
{
  "hasActiveLink": true,
  "bookingId": 123,
  "guestName": "John Smith",
  "createdAt": "2025-12-20T10:00:00.000Z",
  "expiresAt": "2026-02-01T00:00:00.000Z",
  "usedAt": "2026-01-10T14:30:00.000Z",
  "lastAccessedAt": "2026-01-14T09:15:00.000Z"
}
```

**Response (200 - no active link):**
```json
{
  "hasActiveLink": false,
  "message": "No active magic link found. Generate a new one."
}
```

---

### Guest Portal Access (Public)

```
GET /api/guest-portal/{token}
```

**Authentication:** None (token itself is the credential)

**Response (200):**
```json
{
  "booking": {
    "id": 123,
    "guestName": "John Smith",
    "checkInDate": "2026-01-15",
    "checkOutDate": "2026-01-18",
    ...
  },
  "property": { ... },
  "stayPacket": {
    "wifi": { ... },
    "accessCodes": {
      "available": true,
      "gateCode": "1234",
      "doorCode": "5678",
      "message": ""
    },
    ...
  },
  "nextStay": null // or { enabled: true, ... } if post-checkout
}
```

**Errors:**
- `400`: Missing token
- `403`: Token revoked or expired
- `404`: Invalid token
- `500`: Server error

## Database Schema

```sql
CREATE TABLE guest_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,                  -- First access timestamp
  last_accessed_at DATETIME,         -- Most recent access
  revoked BOOLEAN DEFAULT 0,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE INDEX idx_guest_tokens_booking ON guest_tokens(booking_id);
CREATE INDEX idx_guest_tokens_hash ON guest_tokens(token_hash);
CREATE INDEX idx_guest_tokens_expires ON guest_tokens(expires_at);
```

## Security Considerations

### ✅ What We Do

1. **Cryptographic tokens:** 256-bit random (not sequential IDs)
2. **Hashed storage:** SHA-256, raw token never stored
3. **Time-limited:** Auto-expire after checkout + buffer
4. **Revocable:** Staff can invalidate old tokens
5. **Time-gated sensitive info:** Access codes only near stay window
6. **No auto-send:** Human approval required for WhatsApp messages
7. **Audit trail:** `used_at` and `last_accessed_at` timestamps

### ⚠️ Known Limitations

1. **Link sharing:** Guest can forward link to anyone
   - **Mitigation:** Short validity window, post-checkout expiry
2. **No IP binding:** Link works from any device/location
   - **Design choice:** Guests may access from multiple devices
3. **No rate limiting:** Guest can access portal repeatedly
   - **Low risk:** No sensitive operations (read-only)

### 🚫 Never Do

1. **Never auto-send:** WhatsApp messages always require staff approval
2. **Never invent data:** Missing fields → "ask reception"
3. **Never log raw tokens:** Only log hashes
4. **Never reuse tokens:** Each generation creates new random token
5. **Never show WEBDIRECT pre/during stay:** Only post-checkout

## Testing

### Manual Testing

1. **Generate link:**
   ```bash
   curl -X POST http://localhost:3100/api/bookings/1/generate-link
   ```

2. **Copy magic link and open in browser**

3. **Verify portal loads without password**

4. **Check time-gating:**
   - Set booking check-in to tomorrow → access codes hidden
   - Set check-in to yesterday → access codes visible

5. **Test WEBDIRECT visibility:**
   - Set checkout to future → no CTA
   - Set checkout to past → CTA visible

### Automated Testing

```bash
cd apps/guestflow
npm test
```

## Migration from Last-Name Auth

The old last-name authentication has been replaced. The portal now:

1. Expects token in URL: `/guest/{token}`
2. Auto-loads stay details (no form)
3. Shows time-gated content
4. Displays WEBDIRECT post-checkout

**Breaking change:** Old `/guest/{bookingId}` with last-name form no longer works. Staff must generate magic links for all new bookings.

## Future Enhancements

- [ ] Staff UI to generate links (currently API-only)
- [ ] Batch link generation for multiple bookings
- [ ] Email delivery (in addition to WhatsApp)
- [ ] QR code generation for printed materials
- [ ] Guest preferences (stay connected for future bookings)
- [ ] Multi-stay history for returning guests
- [ ] Analytics: link open rates, access patterns
- [ ] SMS delivery option

## Support

**For staff:**
- API documentation: See above
- Environment setup: See `.env.example`
- Database setup: `npm run db:init`

**For guests:**
- Link not working → Staff regenerates link
- Content missing → Contact reception (shown in portal)
- Access codes not visible → Check date (24h time-gate)

**Contact:**
- Grant Brown: grant@thebrowns.co.za
- Technical issues: Check Vercel logs
