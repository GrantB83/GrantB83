# GuestFlow Staff Runbook — SA Ops

**Version:** P0+P1 (2026-09)  
**Audience:** Browns Dullstroom operations staff  
**Purpose:** Daily operational guide for the internal ops console

## 🎯 New Navigation (P0 Update)

GuestFlow now has a streamlined primary navigation:

1. **Today** — House pulse, next 24h, Approvals + Exceptions badges, NB freshness
2. **Needs approval** — Unified queue for all drafts requiring human approval
3. **Exceptions** — Guest tickets, missing rate cards, timeouts (never silent drops)
4. **Live bookings** — Arriving / in-house / departing (replaces old "Bookings")
5. **Comms** — Unified timeline with sticky reservation panel

Secondary tools remain under "Tools" in the quick actions.

---

## 🔐 Access & Login

### Production URL

**Live site:** https://browns-guestflow.vercel.app/  
**Custom domain (when DNS ready):** https://guestflow.thebrowns.co.za

### Staff Login

1. Visit the URL above
2. You'll be automatically redirected to `/staff-login`
3. Enter the staff password (contact Grant for access)
4. Click **Login**
5. You're now at the Browns Ops Hub

**Password Notes:**
- Staff password is shared among Browns SA Ops team only
- Never share publicly or post in unsecure channels
- Contact Grant if you need the password reset

### Subdomain DNS (Grant-Only Task)

⚠️ **Grant must configure this once in Afrihost DNS:**

```
Type: CNAME
Name: guestflow
Value: de076327b256488a.vercel-dns-017.com
TTL: 3600 (or Auto)
```

**Result:** `guestflow.thebrowns.co.za` will point to the live app

**Status:** Pending as of M4 — Grant has the CNAME value documented

---

## 🏠 Today Page Overview

After login, you land on **Today** — your daily dashboard showing:

- **Needs approval badge** — Count of drafts waiting for human review
- **Exceptions badge** — Count of active tickets and issues
- **Next 24 hours** — Arriving (green), In-house (blue), Departing (amber)
- **NightsBridge Sync status** — Fresh/Stale/Missing with last sync time
- **Recent AI Activity** — Quiet feed of what the system did (classified, drafted, filed)

### Primary Navigation Pages

| Page | Purpose | What You Do |
|------|---------|-------------|
| **Today** | House pulse and quick overview | Start your day here |
| **Needs approval** | Unified queue for all drafts | Approve/Edit/Reject/Escalate with keyboard shortcuts (A/E/R/X) |
| **Exceptions** | Guest tickets, missing data, timeouts | Triage and resolve issues that AI couldn't handle |
| **Live bookings** | Arriving / in-house / departing views | See current guest status |
| **Comms** | Timeline of all messages + reservation panel | Unified guest conversation view |

### Secondary Tools (under "Tools" quick action)

| Tool | Purpose | CLI Tool Integration |
|------|---------|---------------------|
| **Inquiry Intake** | Extract booking fields from email/WhatsApp | `browns-inquiry-intake` |
| **Quote Draft** | Generate quotes from inquiries + rate cards | `browns-quote-invoice-draft` |
| **Welcome Drafts** | Draft welcome messages for arrivals | `browns-welcome-draft-pack` |
| **Late Check-In Queue** | Track after-hours arrivals | `browns-late-checkin-queue` |
| **Daily Brief** | Morning ops brief (RED/AMBER/GREEN) | `browns-daily-ops-brief` |
| **NightsBridge Import** | Parse NightsBridge CSV bookings | `browns-nightsbridge-bookings-adapter` |
| **Booking Change Check** | Detect last-minute booking changes | `browns-booking-change-check` |
| **CT Pack** | Communication pack for upcoming stays | `browns-ct-pack` |
| **Rate Card Upload** | Manage property pricing | (internal only) |

---

## 📋 Daily Workflow

### Morning Routine (Updated P0)

1. **Login** and land on **Today** page
2. Check the **Needs approval badge** — If > 0, click to review queue
3. Visit **Needs approval** page:
   - Review each draft (inbound, welcome, quote, tickets)
   - Use keyboard shortcuts: **A** (Approve), **E** (Edit & approve), **R** (Reject), **X** (Escalate)
   - Empty state = "Routine handled. Nothing needs you." ✓
4. Check **Exceptions badge** — If > 0, click to resolve issues
5. Visit **Exceptions** page:
   - See what AI asked, what it found, why it stopped, next step
   - Triage → In Progress → Resolved workflow
   - Common: Missing rate card, Timeout (never auto-sent), Guest tickets
6. Check **Next 24h** on Today:
   - Click Arriving/In-house/Departing cards to see details
7. Check **NightsBridge Sync** status:
   - Fresh (< 12h ago) = ✓ green
   - Stale (> 12h ago) = ⚠️ amber — Click "Upload now"
   - Missing = ⚠️ red — Expected 05:00 & 19:00 SAST daily

### Using the Needs Approval Queue (New in P0)

**What appears here:**
- Inbound WhatsApp drafts (booking inquiries, date queries)
- Welcome message drafts (auto-generated from NB data)
- Quote drafts (if rate card is available)
- Guest exception drafts (lost key, gate access, maintenance)
- Staff briefs (for Admin/Housekeeping WhatsApp channel)

**How to review:**

1. Click on any item in the list
2. See:
   - **Source** — Where it came from (WhatsApp inbound, NB welcome, etc.)
   - **Draft content** — What AI prepared
   - **Metadata** — Guest details, booking info
3. Take action:
   - **Approve (A)** — Mark ready to send (still requires human send)
   - **Edit & approve (E)** — Click to edit draft in textarea, then approve
   - **Reject (R)** — Dismiss with reason
   - **Escalate (X)** — Flag for Grant/Liana with note
4. **Keyboard shortcuts work when item is selected** — No mouse needed for fast approval

**Hard rule:** Approve **does NOT auto-send**. All output is draft-only. You must manually send via WhatsApp/email after approval.

### Generating a Quote

1. Go to **Quote Draft** page (`/ops/quote-draft`)
2. Select saved inquiry or enter booking details
3. Ensure rate cards are uploaded (`/ops/rate-cards`)
4. Click **Generate Quote**
5. Review draft output (HTML or markdown)
6. Click **Export** to download
7. **APPROVE MANUALLY** before sending to guest

## 🔄 Always-On Inbound Webhook (P1 Documentation)

**Status:** Implemented and documented for CoS/Grok Bot integration

### How Inbound Works

1. **Old WhatsApp number** (+27836458313) OR **Guests WhatsApp group** → Receives messages
2. **CoS Bridge** (if configured) OR **Direct WABA webhook** → Sends to `/api/inbound/webhook`
3. **GuestFlow classify** → Auto-classifies intent (booking_inquiry, date_query, suite_preference, etc.)
4. **Auto-draft reply** → Uses rate cards + playbooks (never invents data)
5. **Queue in "Needs approval"** → Appears with source "WhatsApp inbound"
6. **Human approves** → Via Needs approval page (keyboard shortcut A)
7. **Human sends** → Copy draft to WhatsApp manually (or future: via approved `/api/whatsapp/send`)

### What Happens on Different Intents

| Intent | What AI Does | What Goes to Queue | Exception Raised If |
|--------|--------------|-------------------|---------------------|
| **booking_inquiry** | Extract dates/guests/property → Draft quote | Quote draft (if rate card exists) | Missing rate card → Exceptions |
| **date_query** | Check availability → Draft reply | Availability draft | No calendar access |
| **existing_guest** | Match to booking → Draft welcome/late | Welcome/late draft (if NB data synced) | No booking found |
| **outlier_exception** | Classify category → Draft guest reply + staff brief | Ticket with 2 drafts | Always creates ticket |
| **spam** | Mark as spam → Auto-close | Nothing (silent close) | N/A |

### Timeout Handling (P1)

**Rule:** If classification or draft generation takes > 30s, the system:
1. **Holds the draft** in a "timeout" exception
2. **Never silent drops** the message
3. **Never auto-sends** a partial/broken draft
4. Creates an **Exception ticket** with:
   - What asked: Original message
   - What AI found: Partial context (if any)
   - Why stopped: "Classification timeout"
   - Next step: "Manual review and classify"

**You see this in:** Exceptions page → Filter "timeout" category

### Welcome Messages (Same-Day Arrivals)

1. Go to **Welcome Drafts** page (`/ops/welcome-drafts`)
2. System shows upcoming arrivals (today/tomorrow)
3. Click **Generate Pack**
4. Download welcome message drafts
5. **APPROVE MANUALLY** before posting to WhatsApp

---

## 🔧 CLI Tool Integration

Each ops page exports **packs** (JSON/markdown files) that match CLI tool formats.

### If browns-* CLI Tools Exist

When a CLI tool is available (e.g., `tools/browns-inquiry-intake/`):

```bash
# Example: Run inquiry intake
node tools/browns-inquiry-intake/dist/index.js --input inquiry.json

# Example: Generate quote
node tools/browns-quote-invoice-draft/dist/index.js --booking booking.json --rates rates.csv

# Example: Daily brief
node tools/browns-daily-ops-brief/dist/index.js --date 2026-12-15
```

### If CLI Tools Don't Exist Yet

The ops pages still export the **expected format** so you can:
1. Download the pack
2. Review it manually
3. Copy/paste relevant parts for guest communication
4. Wait for CLI tools to be built later

---

## 🧪 WhatsApp Sandbox vs Live Mode

GuestFlow supports two WhatsApp modes:

### SANDBOX MODE (Default)

**Current Status:** GuestFlow is in SANDBOX MODE by default until Grant completes Business Profile approval.

**What Sandbox Does:**
- ✅ All UI flows work (approve buttons, portal, Nightsbridge sync)
- ✅ "Send" actions log dry-run attempts without calling Meta API
- ✅ Returns success-shaped responses for smoke testing
- ✅ Safe for demos and staff training
- ❌ Does NOT send real messages to guests

**How to Tell You're in Sandbox:**
- Check `/api/whatsapp/send` endpoint returns `"sandboxMode": true`
- Console logs show `[SANDBOX]` prefix
- Success messages say "dry-run successful (SANDBOX MODE)"

### LIVE MODE (After Approval)

**When to Enable:** Only after Grant completes:
1. Meta Business Profile approval (typically 1-3 days)
2. Purchase SA phone number from approved provider
3. Link number to WhatsApp Business Account
4. Test with Twilio magic number (+15005550006)

**How Grant Enables Live Mode:**
```bash
# In Vercel/Fly.io environment variables:
WHATSAPP_MODE=live
WHATSAPP_TOKEN=EAAl...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
```

**Live Mode Behavior:**
- ✅ "Send" actions call Meta WhatsApp Cloud API
- ✅ Real messages delivered to guest phone numbers
- ⚠️ Requires human approval before every send

---

## ⚠️ Hard Gates — What You MUST NOT Do

### ❌ NEVER Auto-Send

**All output is DRAFT-ONLY (both sandbox and live)**

- GuestFlow does NOT send emails automatically
- GuestFlow does NOT send WhatsApp messages automatically
- Every quote, welcome message, and communication **requires manual approval**
- Sandbox mode adds extra safety — messages never leave the app

### ❌ NEVER Invent Data

If the system shows:
- `[RATE CARD REQUIRED]` — Do NOT guess a price
- `[PHONE NUMBER MISSING]` — Do NOT make up a number
- `[UNKNOWN ETA]` — Do NOT invent an arrival time

**Action:** Contact Grant or property manager to get the real data

### ❌ NEVER Bypass Approval Banners

Every draft export shows an **approval banner** in the UI:

> ⚠️ DRAFT ONLY — Requires approval before sending

**This means:** Review → Approve → Then Send Manually

### ❌ NEVER Share Staff Password Publicly

- Password is for Browns staff only
- Don't post in public channels
- Don't email without encryption
- Use secure password manager or Signal/WhatsApp direct message

### ❌ NEVER Commit Guest Data to Public Repos

- GuestFlow stores data in SQLite locally
- Backups may contain guest names, emails, phone numbers
- Only store backups in **private, secure locations**
- Never push `data/guestflow.db` to GitHub public repos

---

## 💾 Data & Backups

### Where Data Lives

| Environment | Storage | Persistence |
|-------------|---------|-------------|
| **Production (Vercel)** | Turso DB (cloud SQLite) | Permanent until deleted |
| **Local Development** | SQLite file (`data/guestflow.db`) | Permanent on your machine |

### Backing Up Data

**Weekly Backup (Recommended):**

```bash
# From apps/guestflow directory
npm run db:export > backups/backup-$(date +%Y%m%d).json
```

**What gets backed up:**
- Tenants (Browns properties)
- Rate cards (pricing data)
- Inquiries (guest requests)
- Bookings (confirmed reservations)

**Optional:** Grant can set up weekly Turso dumps via CLI (see DEPLOY.md)

---

## 🔍 Troubleshooting

### "Invalid password" on login

- Double-check password (case-sensitive)
- Check for trailing spaces
- Contact Grant if you think password changed

### Page won't load or shows error

- Check internet connection
- Try refreshing (Ctrl+R or Cmd+R)
- Clear browser cache
- Try different browser
- Contact Grant if problem persists

### Data not saving after inquiry intake

- Verify you clicked "Save to Database"
- Check that you're logged in (session may have expired)
- Try logging out and back in

### Rate card missing for quote

- Go to `/ops/rate-cards`
- Upload Browns property rate cards (CSV/JSON)
- Try generating quote again

### Export/download not working

- Check browser popup blocker settings
- Try right-click → "Save Link As"
- Use different browser

---

## 📱 Mobile Access

GuestFlow is now fully mobile-optimized for phones and tablets.

### Mobile-Friendly Features

✅ **Responsive navigation** — Hamburger menu on phones, full navigation on desktop  
✅ **Touch-optimized inputs** — All form fields and buttons sized for easy tapping (44px minimum)  
✅ **Scrollable tables** — Wide data tables scroll horizontally without breaking layout  
✅ **Flexible grids** — Card layouts stack vertically on narrow screens  
✅ **No zoom quirks** — Proper viewport settings prevent awkward zooming on form inputs

### Supported Breakpoints

- **Mobile phones:** 390px–767px width (iPhone SE and larger)
- **Tablets:** 768px–1023px width
- **Desktop:** 1024px and wider

### Mobile Testing Notes

All core pages have been tested at ~390px width:

- `/staff-login` — Login form works cleanly on phones
- `/ops` (hub) — Tool cards stack vertically, tap targets are large
- `/ops/nightsbridge-import` — Tables scroll horizontally
- `/ops/welcome-drafts` — Forms and stats stack for narrow screens
- `/ops/bookings` — Table scrolls, action buttons are touch-friendly
- `/guest/[code]` (guest portal) — Fully responsive, guests can view stay details on phones

**Use any modern mobile browser** — Chrome, Safari, Edge all work. No special mobile app needed.

---

## 📞 Support & Contact

**Owner:** Grant Brown  
**Email:** grant@thebrowns.co.za  
**Property:** The Browns Luxury Guest Suites, Dullstroom

**For Issues:**
1. Check this runbook first
2. Check DEPLOY.md for technical details
3. Contact Grant via WhatsApp or email

---

## 📚 Additional Resources

- **README.md** — Technical overview and feature list
- **DEPLOY.md** — Deployment guide, backups, DNS setup
- **Ops Hub** — All tools accessible from https://browns-guestflow.vercel.app/ops

---

**Last Updated:** M4 (2026-12) — Final harden phase
