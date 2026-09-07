# Quick Start Guide - Contact API & Magic Links

## Setup Environment Variables

```bash
cd apps/guestflow
cp .env.example .env.local

# Edit .env.local and add:
# For Contact API (required for email to work):
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@guestflow.thebrowns.co.za
CONTACT_RECIPIENT_EMAIL=stay@thebrowns.co.za

# For Guest Portal (optional - shows placeholders if missing):
WIFI_NETWORK=YourNetwork
WIFI_PASSWORD=YourPassword
PROPERTY_GATE_CODE=1234
PROPERTY_DOOR_CODE=5678
```

## Start Development Server

```bash
npm install
npm run db:init  # Initialize database with guest_tokens table
npm run dev      # Start on http://localhost:3100
```

---

## Test Contact API

### 1. Valid Request
```bash
curl -X POST http://localhost:3100/api/public/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+27 82 123 4567",
    "message": "I would like to inquire about availability in December",
    "company": ""
  }'
```

**Expected Response (if mail configured):**
```json
{
  "success": true,
  "message": "Thank you for your inquiry. We will be in touch soon."
}
```

**Expected Response (if mail NOT configured):**
```json
{
  "error": "Email service is not configured. Please try again later."
}
```
Status: `503 Service Unavailable`

### 2. Honeypot Triggered (Bot Detection)
```bash
curl -X POST http://localhost:3100/api/public/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bot",
    "email": "bot@example.com",
    "message": "Spam message",
    "company": "Some Company"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid request"
}
```
Status: `400 Bad Request`

### 3. Missing Required Field
```bash
curl -X POST http://localhost:3100/api/public/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "email": "john@example.com"
  }'
```

**Expected Response:**
```json
{
  "error": "Name, email, and message are required"
}
```
Status: `400 Bad Request`

### 4. Rate Limit Test
Run the valid request 6 times in a row:

**6th Request Response:**
```json
{
  "error": "Too many requests. Please try again later."
}
```
Status: `429 Too Many Requests`  
Header: `Retry-After: 3600`

---

## Test Magic Link Guest Portal

### 1. Create a Test Booking

First, ensure you have a booking in the database. If using fresh DB:

```bash
npm run seed:browns  # Seeds example bookings
```

### 2. Generate Magic Link

```bash
# Generate link for booking ID 1
curl -X POST http://localhost:3100/api/bookings/1/generate-link
```

**Example Response:**
```json
{
  "success": true,
  "bookingId": 1,
  "guestName": "John Smith",
  "magicLink": "http://localhost:3100/guest/abc123def456...",
  "whatsappStub": "Hi John,\n\nYour stay details for January 15, 2026:\nhttp://localhost:3100/guest/abc123def456...\n\nLooking forward to welcoming you!",
  "expiresAt": "2026-02-01T00:00:00.000Z",
  "token": "abc123def456..."
}
```

### 3. Open Magic Link

Copy the `magicLink` from the response and open in browser:
```
http://localhost:3100/guest/abc123def456...
```

**Expected:**
- Portal loads immediately (no password prompt)
- Shows guest name, dates, suite
- Shows Wi-Fi info (if configured in .env)
- Shows or hides access codes based on check-in date (time-gated)
- Shows or hides WEBDIRECT CTA based on checkout date

### 4. Test Time-Gating

To test access codes visibility:

**Option A:** Modify booking dates in database
```sql
-- Make check-in tomorrow (codes should be hidden)
UPDATE bookings SET check_in = date('now', '+1 day') WHERE id = 1;

-- Make check-in yesterday (codes should be visible)
UPDATE bookings SET check_in = date('now', '-1 day') WHERE id = 1;
```

**Option B:** Change PROPERTY_GATE_CODE/PROPERTY_DOOR_CODE env vars

Without codes configured:
```
"Access codes pending - Please contact reception for access details"
```

With codes but outside time window:
```
"Access codes will be available 24 hours before your check-in date"
```

With codes and inside time window:
```
Gate Code: 1234
Door Code: 5678
```

### 5. Test WEBDIRECT CTA

**Pre-stay or during-stay:**
- No booking CTA visible at bottom of page

**Post-checkout:**
- Booking CTA visible: "Book Your Next Stay"
- Links to: `https://book.nightsbridge.com/24299?promocode=WEBDIRECT`

To test:
```sql
-- Make checkout yesterday (should show CTA)
UPDATE bookings SET check_out = date('now', '-1 day') WHERE id = 1;

-- Make checkout tomorrow (should hide CTA)
UPDATE bookings SET check_out = date('now', '+1 day') WHERE id = 1;
```

### 6. Check Existing Link Status

```bash
curl http://localhost:3100/api/bookings/1/generate-link
```

**Response (if active link exists):**
```json
{
  "hasActiveLink": true,
  "bookingId": 1,
  "guestName": "John Smith",
  "createdAt": "2026-01-01T10:00:00.000Z",
  "expiresAt": "2026-02-01T00:00:00.000Z",
  "usedAt": "2026-01-10T14:30:00.000Z",
  "lastAccessedAt": "2026-01-14T09:15:00.000Z"
}
```

**Response (if no active link):**
```json
{
  "hasActiveLink": false,
  "message": "No active magic link found. Generate a new one."
}
```

### 7. Regenerate Link

To revoke old token and create new one:
```bash
curl -X POST http://localhost:3100/api/bookings/1/generate-link
```

This will:
1. Mark all existing tokens for booking #1 as revoked
2. Generate new token
3. Return new magic link
4. Old link will no longer work

---

## WhatsApp Integration

### Copy WhatsApp Stub

From the generate-link response, copy the `whatsappStub` field:

```
Hi John,

Your stay details for January 15, 2026:
http://localhost:3100/guest/abc123def456...

Looking forward to welcoming you!
```

### Send to Guest

**Manual WhatsApp:**
1. Copy stub text
2. Open WhatsApp Web
3. Paste and send to guest

**WhatsApp Cloud API:**
```bash
curl -X POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "27821234567",
    "type": "text",
    "text": {
      "body": "Hi John,\n\nYour stay details for January 15, 2026:\nhttp://localhost:3100/guest/abc123...\n\nLooking forward to welcoming you!"
    }
  }'
```

---

## Common Issues

### Contact API Returns 503
**Cause:** Email not configured  
**Fix:** Set `RESEND_API_KEY` or `SMTP_*` variables in `.env.local`

### Magic Link Shows "Invalid access link"
**Cause:** Token expired, revoked, or doesn't exist  
**Fix:** Generate new link with POST to `/api/bookings/{id}/generate-link`

### Access Codes Not Showing
**Cause:** Outside 24h time window before check-in  
**Fix:** This is expected behavior. Codes only show from 24h before check-in through checkout

### WEBDIRECT CTA Not Showing
**Cause:** Booking checkout date is in the future  
**Fix:** This is expected. CTA only shows post-checkout to avoid distraction during stay

### "ask reception" Messages
**Cause:** Environment variables not set (Wi-Fi, parking, directions, etc.)  
**Fix:** Set relevant `PROPERTY_*`, `WIFI_*` variables in `.env.local`

---

## Production Deployment

### Vercel Environment Variables

```bash
# Contact API (required)
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM_EMAIL production
vercel env add CONTACT_RECIPIENT_EMAIL production

# Guest Portal (recommended)
vercel env add WIFI_NETWORK production
vercel env add WIFI_PASSWORD production
vercel env add PROPERTY_GATE_CODE production
vercel env add PROPERTY_DOOR_CODE production
vercel env add PROPERTY_PARKING production
vercel env add PROPERTY_DIRECTIONS production
vercel env add PROPERTY_PHONE production
vercel env add PROPERTY_EMAIL production
vercel env add PROPERTY_WHATSAPP production
vercel env add EMERGENCY_CONTACT production
```

### Deploy

```bash
vercel --prod
```

### Test Production

```bash
# Contact API
curl -X POST https://guestflow.thebrowns.co.za/api/public/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Test","company":""}'

# Generate magic link (requires staff auth)
curl -X POST https://guestflow.thebrowns.co.za/api/bookings/1/generate-link \
  -H "Cookie: staff_auth=YOUR_AUTH_COOKIE"
```

---

## Documentation

- **Full Contact API docs**: `apps/guestflow/docs/CONTACT-API.md`
- **Full Magic Link docs**: `apps/guestflow/docs/GUEST-PORTAL-MAGIC-LINKS.md`
- **Implementation summary**: `IMPLEMENTATION-SUMMARY.md`

---

## Support

**Technical Issues:**
- Check Vercel logs
- Review documentation files
- Test locally with `npm run dev`

**Contact:**
- Grant Brown: grant@thebrowns.co.za
