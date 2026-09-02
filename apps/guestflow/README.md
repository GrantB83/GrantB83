# GuestFlow - Guesthouse Operations SaaS (Phase 4 Demo)

**Status:** DEMO / WAITLIST — Not production-ready  
**Purpose:** Multi-tenant-ready product demo for guesthouse operations automation  
**Current Phase:** Phase 4 — Rate card upload, demo auth stub, and funnel polish

---

## What It Is

GuestFlow is a multi-tenant SaaS platform that automates guesthouse operations:

1. **Inquiry Intake** → Structured JSON from email/WhatsApp text
2. **Quote & Invoice Drafts** → Professional packager (draft-only, never invents rates)
3. **Guest Welcome Packs** → Personalized pre-arrival messages (never invents Wi-Fi/times)
4. **Daily Ops Brief** → Morning coordination from bookings JSON
5. **NightsBridge CSV Import** → Parse bookings and detect availability gaps (Phase 2)
6. **Multi-Tenant Support** → Tenant-scoped data with demo tenant switcher (Phase 2)

**Plus sales platform:**
- Landing page, pricing (COMING SOON / waitlist)
- Waitlist lead capture + operator CRM with tenant filtering (Phase 2)
- Sandbox tenant demo walkthrough with sample properties

---

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **SQLite** via better-sqlite3 for persistence
- **Lucide React** for icons
- **Date-fns** for date handling

---

## Run Instructions

### 1. Install Dependencies

```bash
cd apps/guestflow
npm install
```

### 2. Initialize Database

```bash
npm run db:init
```

This creates `data/guestflow.db` with sample properties and schema.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3100](http://localhost:3100)

### 4. Build for Production

```bash
npm run build
npm start
```

---

## What Works (Phase 6)

### ✅ Phase 6 Additions (Demo Smoke Test + Hosting Readiness)

1. **Demo Smoke Script** (`scripts/smoke-demo.mjs`)
   - Automated test suite that validates all key routes and pages locally
   - Checks database initialization and schema tables
   - Tests all demo pages (inquiry, quote, welcome pack, daily brief, etc.)
   - Validates API routes (/api/waitlist, /api/tenants, /api/rate-cards)
   - Exit code 0 on success, 1 on failure (CI/CD friendly)
   - Run with: `npm run smoke`

2. **Hosting Readiness Page** (`/demo/hosting-readiness`)
   - Comprehensive checklist for Origin namespace setup and deployment
   - Vercel ↔ Origin integration notes (recommended vs. self-hosted)
   - Hard gates reminder (NO live payments, NO auto-send, NO public signup)
   - Step-by-step deployment workflow (staging → production)
   - Security considerations (auth stub warning, HTTPS, rate limiting)
   - Public launch gates (noindex, legal, POPIA/GDPR compliance)

3. **Demo Hub Phase 6 Integration**
   - Prominent indigo card linking hosting readiness page (Phase 6 badge)
   - Positioned above Phase 5 sales tools for visibility
   - Completes pre-deployment checklist for Grant/CoS

## What Works (Phase 5)

### ✅ Phase 5 Additions (Demo Walkthrough + Sales Leave-Behind)

1. **Demo Walkthrough Script** (`/demo/walkthrough`)
   - Step-by-step sales presentation guide for Grant/CoS demos
   - 9-step sequence: Landing → Pricing → Waitlist → CRM → Rate Cards → Quote → NightsBridge → Tenant → Leave-Behind
   - Talking points and demo actions for each step (2-3 min per step)
   - Objection handling section (OTA integrations, payments, multi-property)
   - Hard gates reminder (NO live payments, NO auto-send, DEMO labeling)
   - Complete 20-25 minute demo flow

2. **Sales Leave-Behind** (`/demo/leavebehind`)
   - Printable one-pager summarizing platform value (no invented rates/promises)
   - Markdown export for email follow-up (download as `.md` file)
   - On-screen preview and print-to-PDF support
   - Preserves COMING SOON messaging and waitlist/pricing copy
   - Includes: What It Is, Core Features, How It Works, Roadmap, Pricing, Safety & Control
   - Professional formatting for post-demo handoff

3. **Demo Hub Phase 5 Integration**
   - Prominent purple cards linking walkthrough + leave-behind (Phase 5 badges)
   - Positioned above existing quick-nav for visibility
   - Completes sales funnel: discovery → demo script → leave-behind → follow-up

## What Works (Phase 4)

### ✅ Phase 4 Additions (Rate Cards, Auth Stub, Funnel Polish)

1. **Rate Card Upload** (`/demo/rate-card-upload`)
   - CSV and JSON upload support
   - Tenant-scoped SQLite storage for seasonal rates
   - Real-time validation (room_type and rate_per_night required)
   - View existing rate cards with clear display of seasons, dates, and min nights
   - Clear all rates function for testing
   - Sample CSV and JSON templates provided
   - Protected by demo auth stub

2. **Demo Auth Stub**
   - Simple session-based authentication for protected routes
   - Password: `demo2026` (clearly labeled as DEMO only)
   - Protects `/crm`, `/demo/rate-card-upload`, and `/demo/tenant` routes
   - Session persists in browser sessionStorage (local only)
   - Logout button on protected pages
   - ⚠️ NOT production auth—clearly labeled as stub for demo purposes only

3. **Funnel Polish - Rate Card Integration**
   - Quote draft page (`/demo/quote-draft`) now fetches real rate cards from database
   - Automatic rate matching by room type and date range
   - Shows green status when rate cards are loaded, amber when missing
   - Calculates actual totals (subtotal + 15% tax) when rate is found
   - Falls back to `[RATE CARD REQUIRED]` placeholders when no matching rate exists
   - Link to rate card upload from quote draft page
   - Never invents pricing—strict adherence to uploaded rates only

4. **Demo Hub Enhancements**
   - Prominent rate card upload card in quick-nav section (Phase 4 badge)
   - Updated demo walk to reflect rate card integration
   - All protected routes clearly labeled with DEMO badges

## What Works (Phase 3)

### ✅ Phase 3 Additions (Sales & Ops Demo Improvements)

1. **Enhanced CRM** (`/crm`)
   - CSV export of leads (tenant-scoped, local SQLite only)
   - Lead status tracking (New → Contacted → Qualified → Won/Lost)
   - Simple dropdown UI to update lead status inline
   - Maintains all Phase 2 filtering and display features

2. **Waitlist Form Enhancements** (`/waitlist`)
   - Property/company name field (already present, now emphasized)
   - Notes field for operational challenges (already present, now emphasized)
   - All data stored on lead record for CRM export

3. **Tightened Landing & Pricing Copy**
   - Multi-tenant guesthouse pitch emphasized throughout
   - "Multi-property operations" messaging on homepage
   - Portfolio management language on pricing page
   - COMING SOON / waitlist CTAs preserved (no live payments)

4. **Demo Hub Improvements** (`/demo`)
   - Prominent quick-nav cards for NightsBridge import and tenant switcher
   - New "Sales & Ops Funnel Checklist" component
   - Four-quadrant walkthrough: Discovery → Sales CRM → Product Demo → Operations Setup
   - Clear path from landing → waitlist → CRM → daily ops

## What Works (Phase 2)

### ✅ Fully Functional

1. **Landing Page** (`/`)
   - Hero, features grid, how-it-works, CTA
   - Footer with DEMO disclaimer

2. **Demo Hub** (`/demo`)
   - 5-step walkthrough guide
   - Sample properties (Riverside Lodge, Mountain View, Coastal Retreat)
   - Links to all interactive demos

3. **Inquiry Intake Demo** (`/demo/inquiry-intake`)
   - Paste sample email text
   - Extract structured JSON (guest details, dates, special requests)
   - Confidence scoring
   - No LLM (heuristic extraction only)

4. **Quote Draft Demo** (`/demo/quote-draft`)
   - Generate professional quote from booking data
   - Rate card validation (flags missing rates, never invents)
   - Draft-only output

5. **Welcome Pack Demo** (`/demo/welcome-pack`)
   - Personalized guest welcome message
   - Property facts from knowledge file
   - Flags missing Wi-Fi passwords/codes (never invents)

6. **Daily Brief Demo** (`/demo/daily-brief`)
   - Morning operations brief
   - RED/AMBER/GREEN priority system
   - Arrivals, departures, in-house guests
   - Housekeeping and breakfast schedules

7. **Pricing Page** (`/pricing`)
   - Three-tier structure (COMING SOON messaging)
   - FAQ section
   - Beta access program info

8. **Waitlist Form** (`/waitlist`)
   - Lead capture form
   - SQLite persistence (`/api/waitlist`)
   - Success confirmation flow

9. **Operator CRM** (`/crm`)
   - Read-only list of all waitlist leads with tenant filtering
   - Property interest, room count, current system tracking
   - Submission timestamps for follow-up prioritization
   - Shows tenant name for each lead
   - Demo-labeled (no email campaigns or qualification workflow)

10. **Multi-Tenant Support** (Phase 2)
    - `tenants` table with demo tenant "The Browns Luxury Guest Suites (Dullstroom)"
    - `tenant_id` on leads, bookings, inquiries, and properties
    - All demo routes default to demo tenant
    - Tenant switcher at `/demo/tenant` (local dev only)

11. **NightsBridge CSV Import** (`/demo/nightsbridge-import`) (Phase 2)
    - Upload/paste CSV with flexible header aliases
    - Parse bookings with status derivation (arriving/inhouse/departing)
    - Detect availability gaps between bookings
    - Late check-in detection
    - Draft-only, no live OTA API calls

12. **Database Layer**
    - SQLite schema: tenants, waitlist, properties, inquiries, bookings
    - Multi-tenant foreign keys
    - Sample data seeding with demo tenant
    - API routes for waitlist and tenant management

### 🚧 Stubbed / Coming Soon

- **Production authentication** (NextAuth.js with OAuth providers and proper session management)
- Multi-tenant user management and team permissions
- Email/WhatsApp sending (all drafts, no auto-send)
- Payment processing (no Stripe/card charges)
- Analytics dashboard
- Automated lead campaigns and email sequences
- Live OTA API integrations (beyond CSV import)

---

## 7-Step Demo Walk

### For Grant / CoS to Demo:

1. **Start:** Navigate to [http://localhost:3100](http://localhost:3100)

2. **Step 1 - Inquiry Intake:**
   - Click "Try Demo" or navigate to `/demo/inquiry-intake`
   - Sample inquiry pre-filled
   - Click "Extract Booking Data"
   - Observe structured JSON output (confidence: 95%)

3. **Step 2 - Quote Draft:**
   - From inquiry page, click "Generate Quote from This"
   - Or navigate to `/demo/quote-draft`
   - Click "Generate Draft Quote"
   - Note: Amounts show `[RATE CARD REQUIRED]` (never invented)

4. **Step 3 - Welcome Pack:**
   - Navigate to `/demo/welcome-pack`
   - Click "Generate Welcome Pack"
   - Observe personalized message with property facts
   - Note: Missing Wi-Fi/codes flagged `[PROPERTY OWNER TO PROVIDE]`

5. **Step 4 - Daily Brief:**
   - Navigate to `/demo/daily-brief`
   - View sample morning brief for Dec 15, 2026
   - RED alert for late check-in
   - AMBER priorities for dietary/pet requirements
   - Housekeeping and breakfast schedules

6. **Step 5 - NightsBridge CSV Import (Phase 2):**
   - Navigate to `/demo/nightsbridge-import`
   - Click "Load Sample" to populate CSV
   - Click "Parse CSV"
   - View parsed bookings with status and gaps detected

7. **Step 6 - Tenant Switcher (Phase 2):**
   - Navigate to `/demo/tenant`
   - View demo tenant: "The Browns Luxury Guest Suites (Dullstroom)"
   - Note: Multi-tenant switcher for local dev only

8. **Step 7 - Operator CRM:**
   - Navigate to `/crm` (or click "CRM" in nav)
   - View all waitlist leads filtered by tenant
   - See property details, room count, submission dates
   - Note: Demo-only, no email campaigns or status updates

---

## Hard Gates (Safety Constraints)

✅ **Respected in this build:**

1. No live payments (no Stripe, no card charges)
2. No paid ads / spend pixels
3. All messaging labeled DEMO / WAITLIST
4. No WhatsApp/email auto-send (drafts only, approval banners)
5. No invented rates (explicit flags when rate card missing)
6. Strong .gitignore (node_modules, .next, *.db excluded)

---

## File Structure

```
apps/guestflow/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with nav
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css             # Tailwind styles
│   │   ├── demo/
│   │   │   ├── page.tsx            # Demo hub
│   │   │   ├── inquiry-intake/     # Interactive intake demo
│   │   │   ├── quote-draft/        # Quote packager demo
│   │   │   ├── welcome-pack/       # Welcome message demo
│   │   │   └── daily-brief/        # Ops brief demo
│   │   ├── pricing/
│   │   │   └── page.tsx            # Pricing (COMING SOON)
│   │   ├── waitlist/
│   │   │   └── page.tsx            # Waitlist form
│   │   └── api/
│   │       └── waitlist/
│   │           └── route.ts        # Waitlist API (POST/GET)
│   ├── components/
│   │   └── Navigation.tsx          # Top nav bar
│   └── lib/
│       └── db.ts                   # SQLite database layer
├── scripts/
│   └── init-db.js                  # Database initialization
├── data/                            # Gitignored - SQLite db files
├── .gitignore                       # Strong exclusions
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md (this file)
```

---

## Catalog / Monorepo Hygiene

- ✅ Does NOT gut `tools/README.md`
- ✅ Self-contained under `apps/guestflow/`
- ✅ Can later move to own Origin repo when available
- ✅ No dependencies on `/tools/` (optional conceptual re-use only)
- ✅ `npm install && npm run build` succeeds in apps/guestflow/

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
npm run db:init  # Creates data/guestflow.db
```

Verify tables:
- waitlist
- properties (3 sample rows)
- inquiries
- bookings

---

## Phase 6 Summary

**What Changed:**
- Demo smoke test script (`scripts/smoke-demo.mjs`) validates all routes, API endpoints, and database
- Hosting readiness page (`/demo/hosting-readiness`) with Origin namespace checklist and deployment workflow
- Comprehensive pre-deployment checklist covering security, Vercel↔Origin integration, and public launch gates
- Demo hub updated with prominent Phase 6 indigo card linking hosting readiness page
- `npm run smoke` added to package.json scripts for CI/CD integration
- README updated with Phase 6 section and hard gates reminder

**What Works vs. Stubbed:**
- ✅ Works: Automated smoke tests, hosting readiness checklist, deployment workflow documentation
- 🚧 Stubbed: Same as Phase 5 (production auth, live payments, email/WhatsApp auto-send, public launch)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only—not ready for public SaaS launch without Grant approval via Origin/CoS

---

## Phase 5 Summary

**What Changed:**
- Demo walkthrough script page (`/demo/walkthrough`) with step-by-step sales presentation guide
- Sales leave-behind page (`/demo/leavebehind`) with printable one-pager and markdown export
- 9-step demo flow covering entire platform (landing → pricing → CRM → ops → leave-behind)
- Objection handling section and hard gates reminder on walkthrough page
- Demo hub updated with prominent Phase 5 purple cards linking both new pages
- README updated with Phase 5 section documenting sales demo tools

**What Works vs. Stubbed:**
- ✅ Works: Complete sales demo script, printable/exportable leave-behind, no invented content
- 🚧 Stubbed: Same as Phase 4 (production auth, live payments, email/WhatsApp auto-send)

---

## Phase 4 Summary

**What Changed:**
- Rate card upload UI with CSV/JSON parser (tenant-scoped SQLite)
- Quote draft page now uses real rate cards from database with automatic matching
- Demo auth stub protecting CRM, rate card upload, and tenant admin routes
- Rate card display on quote/demo pages with clear status indicators
- Never invents rates—missing rates stay flagged as `[RATE CARD REQUIRED]`
- README updated with Phase 4 section and hard gates reminder

**What Works vs. Stubbed:**
- ✅ Works: Rate card upload/storage, real quote calculations, demo auth stub (password: demo2026)
- 🚧 Stubbed: Production auth (NextAuth.js), live payments, email auto-send, WhatsApp auto-send

---

## Hard Gates Reminder (Phase 6)

**GuestFlow respects these safety constraints:**

1. ❌ **NO live payments** — No Stripe, no card charges, no payment processing
2. ❌ **NO paid ads** — No Google Ads pixels, no Meta conversion tracking
3. ❌ **NO public signup** — Waitlist only, demo auth stub is NOT production-ready
4. ❌ **NO WhatsApp/email auto-send** — All messaging is draft-only with approval banners
5. ✅ **Demo labeling** — All pages clearly marked DEMO / WAITLIST / COMING SOON
6. ✅ **No invented data** — Rate cards uploaded only, never fabricated. Missing rates flagged clearly.
7. ✅ **Local demo only** — SQLite database, no cloud deployments without explicit approval
8. ✅ **Strong .gitignore** — `node_modules`, `.next`, `*.db`, and data files excluded
9. ✅ **Demo auth only** — Simple password stub (demo2026) for local testing, NOT production auth

**These gates are unchanged from Phase 5. Phase 6 adds deployment readiness tools (smoke test script + hosting checklist), but maintains all safety constraints. No new functionality that touches payments, messaging, or data storage.**

---

## Phase 3 Summary

**What Changed:**
- CRM now exports leads as CSV (tenant-scoped)
- Lead status tracking with dropdown UI (new|contacted|qualified|won|lost)
- Waitlist form already captured company/property + notes (now highlighted in docs)
- Landing and pricing pages emphasize multi-tenant/multi-property operations
- Demo hub features prominent links to NightsBridge import + tenant switcher
- New "Sales & Ops Funnel Checklist" component on demo hub
- README updated with Phase 3 section and hard gates reminder

**What Works vs. Stubbed:**
- ✅ Works: CSV export, status updates, funnel walkthrough, all Phase 2 features
- 🚧 Stubbed: No live payments, no email auto-send, no WhatsApp auto-send, no automated campaigns

---

## Next Steps (Post-Phase-6)

**Phase 6 completes the deployment readiness toolkit.** Next priorities focus on production features and live integrations:

1. **Production Authentication:** NextAuth.js for multi-tenant operator accounts with proper isolation and OAuth providers
2. **Advanced Rate Card Features:** Seasonal overrides, promotion codes, minimum stay enforcement in booking flow
3. **NightsBridge Integration:** Live API integration (beyond CSV import demo)
4. **Email Sending:** Resend or Postmark with H1/H2 approval gates
5. **Analytics Dashboard:** Booking conversion, inquiry velocity
6. **Payment Links:** Stripe/PayFast integration (draft-only until H7)
7. **OTA API Integration:** Booking.com, Airbnb (beyond CSV)

---

## Testing Notes

- All demos use sample data (no live bookings)
- Waitlist submissions persist to SQLite
- No network calls to external APIs in phase 1
- Drafts are text-only (no PDF generation yet)

---

## Support

**Built by:** Grant Brown ([@GrantB83](https://github.com/GrantB83))  
**Based on:** The Browns Guest Suites + Rivendell operations  
**Contact:** grant@thebrowns.co.za

---

## License

MIT (demo purposes)
