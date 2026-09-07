# GuestFlow Implementation Summary

## PR Created
**PR #174**: https://github.com/GrantB83/GrantB83/pull/174  
**Branch**: `cursor/guestflow-contact-api-magic-portal-cb53`

---

## ✅ Deliverable A: Public Contact API

### Endpoint
```
POST https://guestflow.thebrowns.co.za/api/public/contact
```

### Features Implemented
✅ JSON contract: `{ name, email, phone?, message, company? }`  
✅ Honeypot field (`company`) - non-empty → 400 (bot detection)  
✅ Validation: name/email/message required, basic email format check  
✅ Rate limiting: 5 requests/hour per IP → 429  
✅ CORS: allows `www.thebrowns.co.za`, `thebrowns.co.za`, localhost  
✅ Email notification to `stay@thebrowns.co.za` via Resend or SMTP  
✅ Returns 503 if mail not configured (never fakes success)  
✅ Bypasses staff auth in middleware (`/api/public/*` is public)  
✅ `export const dynamic = 'force-dynamic'`  
✅ No secrets in responses  
✅ Documented in `apps/guestflow/docs/CONTACT-API.md` with curl examples  

### Quick Test
```bash
curl -X POST https://guestflow.thebrowns.co.za/api/public/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Test inquiry",
    "company": ""
  }'
```

Expected: `200 OK` (if mail configured) or `503 Service Unavailable` (if not)

### Environment Setup (Required)
```bash
# Option 1: Resend (Recommended for Vercel)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@guestflow.thebrowns.co.za
CONTACT_RECIPIENT_EMAIL=stay@thebrowns.co.za

# Option 2: SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASS=password
SMTP_FROM_EMAIL=noreply@thebrowns.co.za
CONTACT_RECIPIENT_EMAIL=stay@thebrowns.co.za
```

---

## ✅ Deliverable B: Magic-Link Guest Portal (P0)

### Overview
Replaced last-name login with cryptographically secure magic tokens. Portal is now the source of truth for stay content (Wi-Fi, access codes, parking, directions) - never invents data.

### Key Features
✅ **Magic Tokens**:
  - 256-bit cryptographically random tokens
  - SHA-256 hashed storage (raw token never stored)
  - Valid from confirmation through checkout + 14-day buffer
  - Staff can regenerate without re-approving WhatsApp message

✅ **Middleware Updates**:
  - `/guest/*` and `/api/guest-portal/*` bypass staff login
  - Public access via token only

✅ **Time-Gating**:
  - Access codes shown ONLY 24h before check-in through checkout
  - Before window: "Access codes will be available..."
  - After window: Shows actual codes or "contact reception"

✅ **WEBDIRECT CTA**:
  - ONLY shown post-checkout (never pre-stay or during-stay)
  - Links to `https://book.nightsbridge.com/24299?promocode=WEBDIRECT`
  - Completely hidden during other phases

✅ **Portal Content** (Source of Truth):
  - Guest name, dates, suite, adults/children
  - Wi-Fi credentials (env vars)
  - Access codes - gate/door (env vars, time-gated)
  - Parking instructions (env vars)
  - Directions (env vars)
  - House rules (env vars)
  - Contact details (env vars)
  - Missing data → "Please contact reception"

✅ **Mobile-Friendly**:
  - Responsive design
  - Large touch targets
  - Monospace codes (easy copy-paste)

### Database Schema
New table added to `apps/guestflow/src/lib/db.ts`:
```sql
CREATE TABLE guest_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  last_accessed_at DATETIME,
  revoked BOOLEAN DEFAULT 0,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
```

### Staff Workflow

#### 1. Generate Magic Link
```bash
POST /api/bookings/{bookingId}/generate-link
```

**Response:**
```json
{
  "success": true,
  "bookingId": 123,
  "guestName": "John Smith",
  "magicLink": "https://guestflow.thebrowns.co.za/guest/abc123...",
  "whatsappStub": "Hi John,\n\nYour stay details for January 15, 2026:\nhttps://guestflow.thebrowns.co.za/guest/abc123...\n\nLooking forward to welcoming you!",
  "expiresAt": "2026-02-01T00:00:00.000Z"
}
```

**Use the `whatsappStub` text for WhatsApp messages!**

#### 2. Check Existing Link Status
```bash
GET /api/bookings/{bookingId}/generate-link
```

Returns whether booking has an active link, creation date, expiry, and usage timestamps.

#### 3. Regenerate Link (if lost/expired)
Same as step 1 - calling POST again revokes old tokens and creates new one.

### Environment Variables (Optional - shows placeholders if missing)
```bash
# Property contact
PROPERTY_PHONE=+27 82 123 4567
PROPERTY_EMAIL=grant@thebrowns.co.za
PROPERTY_WHATSAPP=+27 82 123 4567
EMERGENCY_CONTACT=Grant Brown: +27 82 123 4567

# WiFi
WIFI_NETWORK=TheBrowns-Guest
WIFI_PASSWORD=secure-password

# Access codes (time-gated)
PROPERTY_GATE_CODE=1234
PROPERTY_DOOR_CODE=5678

# Parking
PROPERTY_PARKING=Free parking available on the property

# Directions
PROPERTY_DIRECTIONS=From Dullstroom town center, take R540 south...
```

### Testing Magic Links

1. **Generate link for booking #1:**
   ```bash
   curl -X POST http://localhost:3100/api/bookings/1/generate-link
   ```

2. **Copy the magic link from response**

3. **Open in browser** (no password needed!)

4. **Verify time-gating:**
   - Set booking check-in to tomorrow → access codes should be hidden
   - Set check-in to today → access codes should be visible

5. **Verify WEBDIRECT visibility:**
   - Set checkout to future → no booking CTA
   - Set checkout to past → booking CTA visible

---

## 📁 Files Changed

### New Files
- `apps/guestflow/src/app/api/public/contact/route.ts` - Contact API endpoint
- `apps/guestflow/src/app/api/bookings/[id]/generate-link/route.ts` - Magic link generation
- `apps/guestflow/src/lib/token.ts` - Token utilities (generate, hash, time-gate logic)
- `apps/guestflow/docs/CONTACT-API.md` - Contact API documentation
- `apps/guestflow/docs/GUEST-PORTAL-MAGIC-LINKS.md` - Magic link documentation

### Modified Files
- `apps/guestflow/src/lib/db.ts` - Added guest_tokens table
- `apps/guestflow/src/middleware.ts` - Allow /guest/*, /api/guest-portal/*, /api/public/*
- `apps/guestflow/src/app/api/guest-portal/[code]/route.ts` - Token auth, time-gating
- `apps/guestflow/src/app/guest/[code]/page.tsx` - Auto-load via token, show time-gated content
- `apps/guestflow/.env.example` - Added all new env vars

---

## 🚀 Deployment Checklist

### 1. Merge PR #174
```bash
git checkout main
git merge cursor/guestflow-contact-api-magic-portal-cb53
git push origin main
```

### 2. Set Environment Variables in Vercel

**Contact API (Required for email):**
```bash
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL
vercel env add CONTACT_RECIPIENT_EMAIL
```

**Guest Portal (Optional but recommended):**
```bash
vercel env add PROPERTY_PHONE
vercel env add PROPERTY_EMAIL
vercel env add PROPERTY_WHATSAPP
vercel env add EMERGENCY_CONTACT
vercel env add WIFI_NETWORK
vercel env add WIFI_PASSWORD
vercel env add PROPERTY_GATE_CODE
vercel env add PROPERTY_DOOR_CODE
vercel env add PROPERTY_PARKING
vercel env add PROPERTY_DIRECTIONS
```

### 3. Deploy to Production
```bash
vercel --prod
```

### 4. Test Contact API
```bash
curl -X POST https://guestflow.thebrowns.co.za/api/public/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "message": "Test inquiry",
    "company": ""
  }'
```

### 5. Generate First Magic Link
- Visit GuestFlow staff UI (or use API)
- Generate link for an upcoming booking
- Copy WhatsApp stub text
- Send to test guest
- Verify portal loads and shows correct time-gated content

---

## 📚 Documentation

- **Contact API**: `apps/guestflow/docs/CONTACT-API.md`
  - Full API reference
  - CORS configuration
  - Rate limiting details
  - Frontend integration examples (React, vanilla JS)
  - curl test commands
  - Troubleshooting guide

- **Magic Links**: `apps/guestflow/docs/GUEST-PORTAL-MAGIC-LINKS.md`
  - Security model
  - Token generation/validation
  - Time-gating logic
  - Staff workflows
  - WhatsApp integration
  - Database schema
  - Testing procedures
  - Migration notes

---

## ✅ Build Status

```bash
cd apps/guestflow
npm run build
```

**Result:** ✅ Passes with no errors (only React hooks warnings)

---

## 🔐 Security Notes

### Contact API
- Rate limiting prevents spam (5 req/hour per IP)
- Honeypot catches basic bots
- CORS restricts origins
- Email validation prevents invalid addresses
- Never exposes secrets in error messages

### Guest Portal
- Tokens are cryptographically random (256-bit)
- Stored as SHA-256 hashes (raw token never stored)
- Time-limited (checkout + 14 days)
- Revocable by staff
- Access codes time-gated to stay window
- No sequential IDs or guessable patterns

---

## 🎯 Hard Rules Compliance

✅ Portal = SoT for stay content (never invents)  
✅ Missing data → "ask reception"  
✅ Middleware allows public guest/API routes  
✅ Token cryptographically secure  
✅ Time-gate sensitive info (access codes)  
✅ WEBDIRECT only post-checkout  
✅ WhatsApp stub provided for human-gated send  
✅ Mobile-friendly  
✅ Uses getDbAsync for Turso/Vercel  

---

## 📞 Contact

**Implementation**: GuestFlow contact API + magic-link guest portal  
**Repository**: GrantB83/GrantB83  
**Branch**: cursor/guestflow-contact-api-magic-portal-cb53  
**PR**: #174  
**Build**: ✅ Passing  
**Ready**: Yes - merge when ready  

---

## 🔄 Next Steps

1. ✅ Code implemented
2. ✅ Build passing
3. ✅ PR created (#174)
4. ⏳ Review PR
5. ⏳ Merge PR
6. ⏳ Set Vercel env vars
7. ⏳ Deploy to production
8. ⏳ Test contact API from www.thebrowns.co.za
9. ⏳ Generate first magic link for upcoming booking
10. ⏳ Send test WhatsApp with magic link
11. ⏳ Verify WEBDIRECT shows post-checkout only
