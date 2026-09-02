# GuestFlow - Guesthouse Operations SaaS (Phase 2 Demo)

**Status:** DEMO / WAITLIST — Not production-ready  
**Purpose:** Multi-tenant-ready product demo for guesthouse operations automation  
**Current Phase:** Phase 2 — Multi-tenant stub + CSV import demo

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

- Live rate card uploads (manual entry only)
- Multi-tenant authentication (NextAuth.js)
- Email/WhatsApp sending (all drafts, no auto-send)
- Payment processing (no Stripe/card charges)
- Analytics dashboard
- Operator CRM list management and qualification workflow

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

## Next Steps (Post-Phase-2)

1. **Authentication:** NextAuth.js for multi-tenant operator accounts with proper isolation
2. **Rate Card Upload:** CSV/JSON parser for seasonal rates
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
