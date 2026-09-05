# GuestFlow - Browns Dullstroom Internal Ops Console

**Status:** INTERNAL OPERATIONS — Not for sale, not multi-tenant SaaS  
**Purpose:** Localhost internal ops automation for The Browns Luxury Guest Suites (Dullstroom)  
**Scope:** Drives and wraps existing offline tools under `tools/browns-*`

---

## What This Is

GuestFlow is the **internal operations console** for The Browns Luxury Guest Suites in Dullstroom. It provides a local web UI to:

1. **Inquiry Intake** → Export packs for `tools/browns-inquiry-intake` and `tools/browns-inquiry-quote-pipeline-pack`
2. **Quote Drafts** → Drive `tools/browns-quote-invoice-draft`
3. **Welcome & Late Check-in** → Support `tools/browns-welcome-draft-pack`, `tools/browns-late-checkin-queue`, `tools/browns-guest-comms-*`
4. **Daily Brief** → Generate via `tools/browns-daily-ops-brief`
5. **NightsBridge CSV** → Parse with `tools/browns-nightsbridge-bookings-adapter`
6. **CT Pack & Change Check** → Integrate `tools/browns-ct-pack-*`

This is **NOT:**
- A SaaS product
- Multi-tenant
- For sale or retail distribution
- A public signup service

---

## How SA Ops Uses It

### Localhost (Development)

Run on localhost:3100 in Dullstroom or remote ops:

```bash
cd apps/guestflow
npm install
npm run db:init
npm run dev
```

Open http://localhost:3100

### Production (guestflow.thebrowns.co.za)

**Staff-only access** at `https://guestflow.thebrowns.co.za`

1. Visit URL (redirects to `/staff-login`)
2. Enter staff password (contact Grant for access)
3. Access full ops console

**Complete deployment guide:** See [`DEPLOY.md`](./DEPLOY.md) for Vercel/Fly.io/Cloudflare setup

Each page exports/downloads packs that match CLI tool inputs/outputs, with exact `node dist/index.js ...` commands shown for terminal execution.

---

## What Works (Internal Ops Features)

### ✅ Operational Pages (All DRAFT-ONLY)

1. **Inquiry Intake** (`/ops/inquiry-intake`)
   - Paste inquiry text from email/WhatsApp
   - Extract structured booking fields
   - Export JSON pack for browns-inquiry-intake CLI
   - Save to local SQLite for Browns tenant

2. **Quote Draft** (`/ops/quote-draft`)
   - Generate quote from inquiry JSON or booking data
   - Uses Browns rate cards (upload via `/ops/rate-cards`)
   - Export markdown/HTML for browns-quote-invoice-draft CLI
   - Never invents rates - requires rate card or shows `[RATE CARD REQUIRED]`

3. **Welcome Drafts** (`/ops/welcome-drafts`)
   - Generate welcome messages for upcoming arrivals
   - Export pack for browns-welcome-draft-pack CLI
   - Date-filtered for same-day/next-day arrivals

4. **Late Check-In Queue** (`/ops/late-checkin-queue`)
   - Track after-hours arrivals and unknown ETAs
   - Export for browns-late-checkin-queue CLI
   - Never invents phone numbers or arrival times

5. **Daily Brief** (`/ops/daily-brief`)
   - Morning operations brief with RED/AMBER/GREEN priorities
   - Arrivals, departures, housekeeping
   - Export for browns-daily-ops-brief CLI

6. **NightsBridge Import** (`/ops/nightsbridge-import`)
   - Parse NightsBridge CSV bookings
   - Detect gaps and late check-ins
   - Export for browns-nightsbridge-bookings-adapter CLI

7. **Booking Change Check** (`/ops/booking-change-check`)
   - Compare before/after booking snapshots
   - Detect additions, cancellations, modifications
   - Export for browns-ct-pack verification

8. **CT Pack** (`/ops/ct-pack`)
   - Communication pack for upcoming stays
   - Export for browns-ct-pack CLI

9. **Rate Card Upload** (`/ops/rate-cards`)
   - Upload CSV/JSON rate cards for Browns properties
   - Tenant-scoped to Browns only
   - Used by quote draft generator

---

## Hard Gates (Unchanged)

✅ **Respected:**

1. **NO auto-send** (email/WhatsApp) — All output is DRAFT-ONLY with approval banners
2. **NO invented data** — Missing rates/phones/ETAs flagged clearly, never fabricated
3. **NO live payments** — No Stripe, no payment processing
4. **NO public signup** — Internal ops console for Browns only
5. **SQLite only** — Local data/guestflow.db for Browns draft history
6. **Single tenant** — Browns Dullstroom properties only, multi-tenant switcher removed

---

## CLI Tool Integration

Each operational page shows the corresponding CLI command for terminal execution:

```bash
# Example: Inquiry Intake
node tools/browns-inquiry-intake/dist/index.js --input inquiry.json

# Example: Quote Draft  
node tools/browns-quote-invoice-draft/dist/index.js --booking booking.json --rates rates.csv

# Example: Daily Brief
node tools/browns-daily-ops-brief/dist/index.js --date 2026-12-15
```

If CLI tools are not yet built, the UI exports packs with the expected input/output format so Browns can:
1. Download the pack (JSON/markdown)
2. Run the documented CLI command manually
3. Review draft output before any guest communication

---

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **SQLite** via better-sqlite3 (Browns tenant only)
- **Lucide React** for icons
- **Date-fns** for date handling

---

## File Structure

```
apps/guestflow/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with ops nav
│   │   ├── page.tsx                # Browns ops hub (was landing page)
│   │   ├── globals.css             # Tailwind styles
│   │   ├── ops/                    # Internal ops pages (was /demo)
│   │   │   ├── page.tsx            # Ops hub
│   │   │   ├── inquiry-intake/     
│   │   │   ├── quote-draft/        
│   │   │   ├── welcome-drafts/
│   │   │   ├── late-checkin-queue/
│   │   │   ├── daily-brief/
│   │   │   ├── nightsbridge-import/
│   │   │   ├── booking-change-check/
│   │   │   ├── ct-pack/
│   │   │   └── rate-cards/
│   │   └── api/
│   │       ├── leads/              # Browns inquiry history
│   │       ├── bookings/           # Browns bookings
│   │       └── rate-cards/         # Browns rates
│   ├── components/
│   │   └── Navigation.tsx          # Ops nav (no retail links)
│   └── lib/
│       └── db.ts                   # SQLite (Browns tenant only)
├── scripts/
│   └── init-db.js                  # Database initialization
├── data/                            # Gitignored - SQLite db files
├── fixtures/                        # Sample inquiry/booking data
├── package.json
└── README.md (this file)
```

---

## Quality Gates

### Build & Lint

```bash
cd apps/guestflow
npm run build    # Must succeed
npm run lint     # Must pass
```

### Database Check

```bash
npm run db:init  # Creates data/guestflow.db with Browns tenant
```

---

## What Changed (Retail → Internal)

**Removed / Hidden:**
- `/pricing` page (was retail pricing tiers)
- `/waitlist` page (was public lead capture)
- `/demo/sales-*` pages (sales handoff, leave-behind, walkthrough)
- `/demo/invite-codes` and `/demo/redeem` (demo access codes)
- `/crm` page (was waitlist lead conversion)
- Multi-tenant switcher (collapsed to Browns only)
- Public marketing landing page (now Browns ops hub)
- Navigation links to pricing/waitlist

**Kept / Enhanced:**
- All operational pages (inquiry, quote, welcome, daily brief, etc.)
- Rate card upload (Browns properties only)
- SQLite for Browns draft history
- CLI tool integration documentation
- Export/download packs for offline CLI execution
- DRAFT-ONLY approval gates

---

## For SA Ops

### Daily Workflow

1. **Morning:** Visit `/ops/daily-brief` for RED/AMBER/GREEN priorities
2. **Inquiries:** Process via `/ops/inquiry-intake` → auto-export pack
3. **Quotes:** Generate via `/ops/quote-draft` with rate cards
4. **Welcome Messages:** One-click via `/ops/welcome-drafts` for same-day arrivals
5. **Late Check-Ins:** Review `/ops/late-checkin-queue` for after-hours
6. **CT Pack:** Verify bookings via `/ops/booking-change-check` before sending

### Export & Handoff

- All pages export JSON/markdown packs for CLI tools or manual review
- CLI commands shown: `node tools/browns-*/dist/index.js ...`
- **DRAFT-ONLY:** Review all output before posting to guests via WhatsApp/email
- Never auto-send — all output requires CoS/Grant approval

### DNS Setup (Grant One-Time)

In DNS provider (Cloudflare/Namecheap/etc.):

```
Type: CNAME
Name: guestflow
Target: <deployment-url>  (e.g., browns-guestflow.vercel.app)
TTL: Auto
```

Result: `guestflow.thebrowns.co.za` → Staff-only ops console

**Full deployment guide:** [`DEPLOY.md`](./DEPLOY.md)

---

## Support

**Owner:** Grant Brown ([@GrantB83](https://github.com/GrantB83))  
**Property:** The Browns Luxury Guest Suites, Dullstroom  
**Contact:** grant@thebrowns.co.za

---

## License

Internal use only — not for distribution
