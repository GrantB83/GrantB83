# Implementation Verification Checklist

## PR Information
- **PR Number**: #174
- **Branch**: `cursor/guestflow-contact-api-magic-portal-cb53`
- **Status**: ✅ Ready for Review
- **Build**: ✅ Passing (`npm run build` succeeds)

---

## A) Public Contact API - Requirements Met ✅

### Endpoint Implementation
- [x] Created `POST /api/public/contact`
- [x] Path matches frontend default: `https://guestflow.thebrowns.co.za/api/public/contact`

### Contract & Validation
- [x] JSON contract: `{ name, email, phone?, subject?, message, company? }`
- [x] `company` field is honeypot - non-empty → 400 (bot detection)
- [x] Validates name/email/message as required
- [x] Basic email format validation (regex)

### Rate Limiting
- [x] Implemented: 5 requests per hour per IP
- [x] Returns 429 when limit exceeded
- [x] Includes `X-RateLimit-Remaining` header
- [x] Includes `Retry-After: 3600` header on 429

### CORS Configuration
- [x] Allows `https://www.thebrowns.co.za`
- [x] Allows `https://thebrowns.co.za`
- [x] Allows `http://localhost:3000` (dev)
- [x] Allows `http://localhost:3100` (dev)
- [x] OPTIONS preflight support

### Email Notification
- [x] Sends to `stay@thebrowns.co.za` (configurable via env)
- [x] Supports Resend API (primary)
- [x] Supports SMTP (fallback)
- [x] Documents env vars in `.env.example`
- [x] Returns 503 if mail not configured (never fakes success)

### Security & Best Practices
- [x] Bypasses staff auth in middleware
- [x] `export const dynamic = 'force-dynamic'`
- [x] No secrets in responses
- [x] Safe error messages (no info leakage)

### Documentation
- [x] Full API documentation in `CONTACT-API.md`
- [x] curl examples for testing
- [x] Frontend integration examples (React, vanilla JS)
- [x] Environment setup instructions
- [x] Troubleshooting guide

---

## B) Magic-Link Guest Portal - Requirements Met ✅

### Authentication System
- [x] Replaced last-name login with magic tokens
- [x] Tokens are cryptographically random (256-bit, base64url)
- [x] Tokens stored as SHA-256 hashes (raw token never stored)
- [x] Token tied to booking ID
- [x] Valid from confirmation through checkout + 14-day buffer
- [x] Staff can regenerate tokens without re-approving WhatsApp message
- [x] Staff can open same packet and resend link (SA Ops fallback)

### Database Schema
- [x] Created `guest_tokens` table
- [x] Fields: `id`, `booking_id`, `token_hash`, `created_at`, `expires_at`, `used_at`, `last_accessed_at`, `revoked`
- [x] Indexes on `booking_id`, `token_hash`, `expires_at`
- [x] Foreign key to `bookings` table

### Middleware Updates
- [x] `/guest/*` bypasses staff auth
- [x] `/api/guest-portal/*` bypasses staff auth
- [x] Both routes are publicly accessible

### Token Management APIs
- [x] `POST /api/bookings/{id}/generate-link` - Generate/regenerate magic link (staff-only)
- [x] `GET /api/bookings/{id}/generate-link` - Check existing link status (staff-only)
- [x] Returns magic link URL
- [x] Returns WhatsApp stub text with greeting, date, and link
- [x] Returns token expiry date

### Guest Portal Features
- [x] Auto-loads via token (no form/password)
- [x] Shows booking summary (name, dates, suite, adults/children, notes)
- [x] Shows check-in/out times
- [x] Shows Wi-Fi credentials (if configured)
- [x] Shows contact information
- [x] Shows house rules
- [x] Shows directions
- [x] Shows parking instructions
- [x] Mobile-friendly responsive design

### Time-Gating (Access Codes)
- [x] Access codes only shown 24h before check-in through checkout
- [x] Before window: "Access codes will be available 24 hours before your check-in date"
- [x] During/after window: Shows actual codes or "contact reception" if not configured
- [x] Implements `shouldShowAccessCodes()` function
- [x] Gate code (if configured)
- [x] Door code (if configured)

### Stay Phase Detection
- [x] Implements `getStayPhase()` function
- [x] Returns 'pre-stay' | 'during-stay' | 'post-checkout'
- [x] Used for WEBDIRECT visibility

### WEBDIRECT CTA Visibility
- [x] Only shown post-checkout
- [x] Hidden during pre-stay phase
- [x] Hidden during during-stay phase
- [x] Links to `https://book.nightsbridge.com/24299?promocode=WEBDIRECT`
- [x] Title: "Book Your Next Stay"
- [x] Message: "Enjoyed your stay? Book direct and save on your next visit!"

### Portal Content (Source of Truth)
- [x] Shows data from NightsBridge/staff facts only
- [x] Never invents data
- [x] Missing Wi-Fi → "Please contact reception for Wi-Fi access"
- [x] Missing access codes → "Please contact reception for access details"
- [x] Missing directions → "Directions will be provided..."
- [x] All content from environment variables (documented)

### WhatsApp Integration
- [x] Generate-link API returns `whatsappStub` field
- [x] Stub format: "Hi {firstName},\n\nYour stay details for {date}:\n{link}\n\nLooking forward to welcoming you!"
- [x] Human-gated send (no auto-send)
- [x] Staff can copy and paste stub text

### Environment Configuration
- [x] All portal content from env vars (never hardcoded)
- [x] Documented in `.env.example`
- [x] Variables: `PROPERTY_PHONE`, `PROPERTY_EMAIL`, `PROPERTY_WHATSAPP`, `EMERGENCY_CONTACT`
- [x] Variables: `WIFI_NETWORK`, `WIFI_PASSWORD`
- [x] Variables: `PROPERTY_GATE_CODE`, `PROPERTY_DOOR_CODE`
- [x] Variables: `PROPERTY_PARKING`, `PROPERTY_DIRECTIONS`

### Mobile Optimization
- [x] Responsive design
- [x] Large touch targets (44px minimum)
- [x] Easy-to-read fonts
- [x] Monospace codes for easy copy-paste
- [x] Works on all screen sizes

### Database Compatibility
- [x] Uses `getDbAsync()` for Turso compatibility
- [x] Works with SQLite (local dev)
- [x] Works with Turso (production/Vercel)

### Documentation
- [x] Full magic link documentation in `GUEST-PORTAL-MAGIC-LINKS.md`
- [x] Security model explained
- [x] Token generation/validation flow
- [x] Time-gating logic documented
- [x] Staff workflows documented
- [x] WhatsApp integration guide
- [x] Database schema documented
- [x] Testing procedures
- [x] Quick start guide in `QUICK-START.md`

---

## Out of Scope (Confirmed)
- [x] www SPA (separate PR #10 on dullstroom-web)
- [x] Ads
- [x] Auto-send WhatsApp
- [x] New discount codes
- [x] `stay.` subdomain DNS (documented for P1)

---

## Build & Quality
- [x] `npm run build` passes with no errors
- [x] Only warnings are React hooks (non-critical)
- [x] No TypeScript errors
- [x] No linting errors

---

## Git & PR
- [x] Branch created: `cursor/guestflow-contact-api-magic-portal-cb53`
- [x] All changes committed
- [x] Pushed to remote
- [x] PR created: #174
- [x] PR marked as draft initially
- [x] Comprehensive PR description
- [x] Implementation summary created
- [x] Quick start guide created
- [x] Documentation complete

---

## Environment Variables Documented
- [x] Contact API: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_RECIPIENT_EMAIL`
- [x] Contact API: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`
- [x] Portal: `PROPERTY_PHONE`, `PROPERTY_EMAIL`, `PROPERTY_WHATSAPP`, `EMERGENCY_CONTACT`
- [x] Portal: `WIFI_NETWORK`, `WIFI_PASSWORD`
- [x] Portal: `PROPERTY_GATE_CODE`, `PROPERTY_DOOR_CODE`
- [x] Portal: `PROPERTY_PARKING`, `PROPERTY_DIRECTIONS`

---

## Testing Instructions Provided
- [x] Contact API curl tests (valid, honeypot, missing fields, rate limit)
- [x] Magic link generation tests
- [x] Time-gating verification steps
- [x] WEBDIRECT visibility verification steps
- [x] Local development setup
- [x] Production deployment checklist

---

## Documentation Files Created
1. ✅ `apps/guestflow/docs/CONTACT-API.md` (full API reference)
2. ✅ `apps/guestflow/docs/GUEST-PORTAL-MAGIC-LINKS.md` (full portal guide)
3. ✅ `apps/guestflow/QUICK-START.md` (quick testing guide)
4. ✅ `IMPLEMENTATION-SUMMARY.md` (high-level overview)
5. ✅ `VERIFICATION-CHECKLIST.md` (this file)

---

## Hard Rules Compliance
- [x] Portal = SoT for stay content (Wi-Fi, access, parking, rules, directions)
- [x] Portal shows data from NB/staff facts only — **never invents**
- [x] Missing field → "ask reception", not blank/fake
- [x] Middleware allows `/guest/*` and `/api/guest-portal/*` without staff login
- [x] Token: cryptographically random, stored hashed server-side, tied to booking
- [x] Valid from confirm through checkout + buffer
- [x] Staff can regen without re-approving whole WA message
- [x] Staff can open same packet + resend link (SA Ops fallback)
- [x] Time-gate sensitive bits (access codes) to near/during stay window
- [x] **WEBDIRECT CTA ONLY after checkout** — never in pre-stay or during-stay
- [x] Welcome/link stub support for human-gated WhatsApp send
- [x] Prefer stay on current GuestFlow host (`guestflow.thebrowns.co.za`)
- [x] Mobile-friendly
- [x] Uses `getDbAsync`/Turso correctly on Vercel

---

## Done When (User Requirements)
- [x] PR open on GrantB83 with contact API + portal magic-link P0
- [x] Report: PR URL
- [x] Report: How to set mail envs (documented in `.env.example` and docs)
- [x] Report: How to mint/open a magic link (documented + quick start)
- [x] Report: Confirm WEBDIRECT hidden pre/during (implemented + documented)
- [x] `npm run build` must pass for guestflow (✅ passing)

---

## Final Status: ✅ COMPLETE

**PR**: https://github.com/GrantB83/GrantB83/pull/174  
**Branch**: cursor/guestflow-contact-api-magic-portal-cb53  
**Build**: ✅ Passing  
**Tests**: ✅ Instructions provided  
**Docs**: ✅ Comprehensive  
**Ready**: ✅ Yes - ready for review and merge  

---

## How to Set Mail Envs

See `apps/guestflow/.env.example`:

```bash
# Option 1: Resend (Recommended)
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

## How to Mint/Open a Magic Link

### Generate Link (Staff):
```bash
curl -X POST http://localhost:3100/api/bookings/1/generate-link
```

Returns `magicLink` and `whatsappStub` fields.

### Open Link (Guest):
Visit the `magicLink` URL - portal loads automatically (no password).

### Full Guide:
See `apps/guestflow/QUICK-START.md` for complete testing instructions.

## WEBDIRECT Hidden Pre/During - Confirmed ✅

Implementation in `src/app/api/guest-portal/[code]/route.ts`:

```typescript
const stayPhase = getStayPhase(booking.checkInDate, booking.checkOutDate)

nextStay: stayPhase === 'post-checkout' ? {
  enabled: true,
  title: 'Book Your Next Stay',
  url: 'https://book.nightsbridge.com/24299?promocode=WEBDIRECT',
  message: 'Enjoyed your stay? Book direct and save on your next visit!'
} : null
```

**Result:**
- Pre-stay: `nextStay = null` (CTA hidden)
- During-stay: `nextStay = null` (CTA hidden)
- Post-checkout: `nextStay = { enabled: true, ... }` (CTA shown)

Frontend in `src/app/guest/[code]/page.tsx`:

```typescript
{portalData.nextStay && portalData.nextStay.enabled && (
  <div className="bg-gradient-to-r from-primary-600 to-primary-700">
    {/* WEBDIRECT CTA only rendered if nextStay exists */}
  </div>
)}
```

✅ **Verified**: WEBDIRECT CTA is completely hidden during pre-stay and during-stay phases.
