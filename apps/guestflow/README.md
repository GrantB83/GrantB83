# GuestFlow - Guesthouse Operations SaaS (Phase 25 Demo)

**Status:** DEMO / WAITLIST — Not production-ready  
**Purpose:** Multi-tenant-ready product demo for guesthouse operations automation  
**Current Phase:** Phase 25 — Guided sales demo walkthrough (DRAFT/fixtures only)

---

## What Works (Phase 25)

### ✅ Phase 25 Additions (Guided Sales Demo Walkthrough)

1. **Sales Walkthrough Page** (`/demo/sales-walkthrough`)
   - Ordered walkthrough chaining existing demo capabilities into coherent SaaS pitch
   - 11 numbered steps: Seed → Tenant Switcher → Inquiry → Quote → NightsBridge → Bookings → Welcome → Late Check-In → CT-Pack → Change Check → OTA Worksheet
   - One-liner pitch copy per step explaining value proposition
   - Hard gates callout banner (NO live payments, NO auto-send, NO OTA publishing, etc.)
   - Progress persists across sessions via browser localStorage

2. **Checklist UI for Salesperson Progress**
   - Click checkbox to mark steps complete/incomplete
   - Real-time progress bar showing completion percentage (e.g., "5/11 steps (45%)")
   - Completed steps highlighted with green border and checkmark
   - Local-only tracking (no server auth or sync)—purely client-side for demo convenience
   - Reset progress button with confirmation prompt

3. **Printable Markdown Export**
   - "Export Walkthrough (Markdown)" button generates downloadable `.md` file
   - Includes progress summary (X/11 steps completed with percentage)
   - Lists all 11 steps with completion status (✅ Completed / ⬜ Pending)
   - Each step shows route, pitch copy, and completion status
   - Embedded hard gates reminder section (NO payments, NO ads, etc.)
   - Timestamped filename: `guestflow-sales-walkthrough-YYYY-MM-DD.md`

4. **Demo Hub Integration**
   - Prominent Phase 25 emerald card at top of demo hub linking to sales walkthrough
   - Badge: "Phase 25 🎯"
   - Positioned above Phase 23 quote draft for visibility
   - Description: "Ordered walkthrough chaining existing demo capabilities: inquiry→quote→CRM/bookings→ops→OTA"

5. **Extended Smoke Test Coverage**
   - Route test for `/demo/sales-walkthrough` accessibility
   - Content checks: "Guided Sales Demo Walkthrough", "Hard Gates", "Progress"
   - Validates page renders correctly with expected sections

6. **Mirrors Guided Demo Best Practices**
   - Linear progression: Inquiry → Quote → Operations → OTA
   - Each step links to existing phase route (no new integrations)
   - Never invents rates, contact info, or data—uses existing fixtures only
   - Clear "DEMO PLACEHOLDER reminder" on all steps
   - Hard gates held: NO live payments, NO WhatsApp/email auto-send, NO live NB API, NO OTA publishing

**What Works vs. Stubbed:**
- ✅ Works: 11-step walkthrough, checklist UI, localStorage progress, markdown export, hard gates callout
- 🚧 Stubbed: Same as Phase 23 (production auth, live payments, email/WhatsApp auto-send, public signup, live OTA integrations)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — walkthrough is DRAFT ONLY with local-only progress tracking
- Never invents rates, contact info, guest phone, ETAs, or Wi-Fi codes
- All data persists to local SQLite only (no live NB API or WhatsApp sends)
- Fixtures and DEMO data only—no production rate publishing or OTA live integrations
- Checklist progress stored in browser localStorage only (no server sync)

---

## What Works (Phase 23)

### ✅ Phase 23 Additions (Demo Quote/Invoice Draft from Inquiry JSON)

1. **Quote Draft from Inquiry JSON** (`/demo/quote-draft`)
   - Accept inquiry/quote JSON from Phase 22 output, paste, or fixtures
   - Three input modes: Sample Data, Paste JSON, or Load Fixtures
   - If amounts present in JSON → DRAFT quote/proforma text with those amounts only
   - If amounts missing → availability-only draft with `[RATE CARD REQUIRED]` placeholders
   - Never invents rates — strict adherence to embedded amounts or rate card data only

2. **Fixture Loading**
   - Load fixture with amounts: complete quote generation demo
   - Load fixture without amounts: availability-only confirmation demo
   - Fixtures located in `fixtures/` directory (inquiry-with-amounts.json, inquiry-without-amounts.json)
   - Demonstrates both quote generation scenarios: complete pricing vs. placeholder-only

3. **JSON Input Parsing**
   - Paste inquiry JSON directly into text area
   - Automatic validation of required fields (guestName, checkIn, checkOut, property, room)
   - Automatic calculation of nights if not provided
   - Clear error messages for invalid JSON or missing required fields
   - Preview parsed data before generating quote

4. **Smart Rate Handling**
   - Checks for embedded amounts in inquiry JSON first (Phase 23)
   - Falls back to rate card lookup if no embedded amounts
   - Clearly labels rate source: "quoted amount from inquiry" vs "rate card"
   - Respects same [RATE CARD REQUIRED] placeholder rules when rates missing
   - Never invents pricing—mirrors tools/browns-quote-invoice-draft semantics

5. **Export & Integration**
   - Same export functionality as Phase 8 (markdown, HTML, print-to-PDF)
   - Preserves all placeholders when rates missing
   - Link from inquiry-intake page (Phase 22) to quote-draft with instructions
   - Phase 23 badge on demo hub with prominent card
   - Export includes draft status and H7 approval gate reminder

6. **Mirrors tools/browns-quote-invoice-draft**
   - Same fixture structure and semantics
   - Same placeholder rules: never invents amounts
   - Same approval gate requirements (H7 before send)
   - Tenant-scoped rate card integration maintained
   - Compatible with Phase 22 inquiry-intake JSON output

**What Works vs. Stubbed:**
- ✅ Works: JSON input (paste/fixtures), embedded amounts detection, quote generation, availability-only mode, export (markdown/HTML/PDF), [RATE CARD REQUIRED] placeholders
- 🚧 Stubbed: Same as Phase 22 (production auth, live payments, email/WhatsApp auto-send, public signup, live OTA integrations, CRM note attachment)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — quotes are DRAFT ONLY with local-only export
- Never invents amounts (uses embedded JSON amounts or rate card only)
- Missing amounts → availability-only confirmation with `[RATE CARD REQUIRED]` placeholders
- Quotes require H7 approval gate before sending to guest
- All data persists to local SQLite only (no live NB API or WhatsApp sends)
- Fixtures and DEMO data only—no production rate publishing

---

## What Works (Phase 22)

### ✅ Phase 22 Additions (Demo Inquiry Intake — Heuristic Extraction)

1. **Inquiry Intake Page** (`/demo/inquiry-intake`)
   - Paste inquiry text (email/WhatsApp-style) or load sample fixtures
   - Extracts structured booking/quote fields: guest name, dates, party size, contact, suite prefs, special requests
   - Pure TypeScript heuristics — NO LLM, mirrors tools/browns-inquiry-intake semantics
   - Uses active demo tenant from tenant context
   - Three sample fixtures: with-amounts, without-amounts, whatsapp-style

2. **Smart Rate Handling**
   - Rates/amounts ONLY if explicitly present with currency in inquiry text
   - Missing amounts → availability-only inquiry (flags "No Rates Found" in blue alert)
   - Never invents pricing — hard gate respected
   - Currency detection: ZAR (R/rand) or USD ($)

3. **Draft Reply Generation**
   - Auto-generates draft reply stub with placeholders for missing fields
   - Preserves extracted amounts when present, uses `[RATE CARD REQUIRED]` when missing
   - Includes `[DRAFT - REQUIRES H1/H2 APPROVAL BEFORE SEND]` footer
   - Export as markdown (.md) file for local save (no live send)

4. **CRM Save Option** (`POST /api/leads`)
   - Save extracted inquiry as DRAFT lead in tenant-scoped CRM
   - Stores guest name, contact, check-in/out dates, suite, adults/children, channel
   - Status: 'new' with `[DRAFT INQUIRY]` prefix in notes
   - Uses existing leads API with tenant_id validation

5. **Missing Field Tracking**
   - Amber warnings for missing required fields (guestName, contact, dates, adults)
   - Lists missing fields explicitly in UI and draft reply
   - Never silently invents contact info or dates

6. **Fixture Loading**
   - `inquiry-with-amounts.txt` — includes quote (R4500/night), total (R13500), deposit (R6750)
   - `inquiry-without-amounts.txt` — availability check only, no rates mentioned
   - `inquiry-whatsapp-style.txt` — casual tone with phone, emojis, questions
   - One-click fixture loading from amber banner UI

**What Works vs. Stubbed:**
- ✅ Works: Heuristic extraction, rate detection, draft reply generation, markdown export, CRM save (DRAFT), fixture loading
- 🚧 Stubbed: Same as Phase 21 (production auth, live payments, email/WhatsApp auto-send, public signup, live NB API)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — inquiry intake is DRAFT ONLY with local-only markdown export
- Never invents rates — missing amounts flagged as "No Rates Found" (availability-only)
- Never invents contact info, dates, or guest details (uses `[PLACEHOLDER]` syntax in draft reply)
- All data persists to local SQLite only with DRAFT labels
- Pure TS heuristics — NO LLM API calls

5. **Export & Integration**
   - Same export functionality as Phase 8 (markdown, HTML, print-to-PDF)
   - Preserves all placeholders when rates missing
   - Link from inquiry-intake page (Phase 22) to quote-draft with instructions
   - Phase 23 badge on demo hub with prominent card
   - Export includes draft status and H7 approval gate reminder

6. **Mirrors tools/browns-quote-invoice-draft**
   - Same fixture structure and semantics
   - Same placeholder rules: never invents amounts
   - Same approval gate requirements (H7 before send)
   - Tenant-scoped rate card integration maintained
   - Compatible with Phase 22 inquiry-intake JSON output

**What Works vs. Stubbed:**
- ✅ Works: JSON input (paste/fixtures), embedded amounts detection, quote generation, availability-only mode, export (markdown/HTML/PDF), [RATE CARD REQUIRED] placeholders
- 🚧 Stubbed: Same as Phase 19 (production auth, live payments, email/WhatsApp auto-send, public signup, live OTA integrations, CRM note attachment)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — quotes are DRAFT ONLY with local-only export
- Never invents amounts (uses embedded JSON amounts or rate card only)
- Missing amounts → availability-only confirmation with `[RATE CARD REQUIRED]` placeholders
- Quotes require H7 approval gate before sending to guest
- All data persists to local SQLite only (no live NB API or WhatsApp sends)
- Fixtures and DEMO data only—no production rate publishing
>>>>>>> de6ed99 (feat(guestflow): add Phase 23 quote draft from inquiry JSON)

---

## What Works (Phase 19)

### ✅ Phase 19 Additions (Late Check-In Queue from Bookings)

1. **Late Check-In Queue Page** (`/demo/late-checkin-queue`)
   - Track arriving guests with late check-ins, after-hours arrivals, or unknown ETAs
   - Configurable after-hours threshold (default: 15:00 local demo)
   - Uses active demo tenant from tenant context
   - Categorizes by: after-hours flag, late/after-hours keywords in notes, or missing check-in time
   - Surfaces missing phone and ETA with placeholders—never invents contact info or arrival times

2. **Smart Categorization**
   - `after-hours`: bookings with `late_check_in = true` flag
   - `note-keyword`: bookings with "late", "after-hours", or "ETA" keywords in notes
   - `unknown-time`: bookings without check-in time specified and no late indicators
   - Displays missing phone as `[GUEST_PHONE]` placeholder
   - Displays unknown ETA as `[ETA UNKNOWN]` placeholder

3. **Export Options** (`POST /api/late-checkin/export`)
   - Download as Markdown (.md) or plain text (.txt) file
   - Includes queue summary stats and individual late check-in details
   - Export for leave-behind or handoff notes (no send)
   - Local-only operations with no external storage

4. **Demo Hub Integration**
   - Prominent Phase 19 orange card at top of demo hub linking to late check-in queue page
   - Links from bookings board, daily-brief, and welcome-drafts pages
   - Integration with tenant switcher for multi-tenant demo
   - Positioned above Phase 18 welcome drafts

5. **Extended Fixtures & Database Schema**
   - Added `guest_phone` and `property_name` fields to bookings table
   - Migration script `scripts/migrate-phase19-guest-phone.js` for existing databases
   - Demo seed includes at least one late check-in and one unknown-time arrival
   - Test bookings: late arrival with phone, unknown time without phone, note keyword "late"

6. **Mirrors tools/browns-late-checkin-queue Semantics**
   - Same filtering logic: late_check_in flag, note keywords, or missing check-in time
   - Same placeholder rules: never invents phone or ETAs
   - Tenant-scoped SQLite bookings query with date filtering
   - Export mirrors Phase 8 quote export and Phase 13 leave-behind UX

**What Works vs. Stubbed:**
- ✅ Works: Late check-in queue filtering/categorization, markdown/text export, tenant-scoped queries, missing field placeholders
- 🚧 Stubbed: Same as Phase 18 (production auth, live payments, email/WhatsApp auto-send, public signup, live OTA integrations)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — late check-in queue is DRAFT ONLY with local-only export
- Never invents guest phone (uses `[GUEST_PHONE]` placeholder)
- Never invents ETAs (uses `[ETA UNKNOWN]` placeholder when check-in time not specified)
- All data persists to local SQLite only with no external sends
- Fixtures only — no live NB API or OTA integrations

---

## What Works (Phase 21)

### ✅ Phase 21 Additions (Booking Change Check for Last-Minute Verification)

1. **Booking Change Check Page** (`/demo/booking-change-check`)
   - Compare two booking snapshots (before vs after) to detect changes
   - Uses active demo tenant from tenant context
   - Two input modes: (a) demo fixtures with pre-populated changes, or (b) paste/upload JSON snapshots
   - Reports additions (new bookings), removals (cancellations), and field-level updates
   - Never invents missing fields - shows [EMPTY] or [NOT ASSIGNED] for missing data
   - Markdown export for leave-behind/verification documentation

2. **Smart Change Detection**
   - Detects new bookings added to the after snapshot
   - Identifies removed/cancelled bookings (present in before, absent in after)
   - Tracks field-level updates: guest name, suite, dates, notes, late check-in flag, etc.
   - Groups updates by booking for clear reporting
   - Visual color-coding: green for additions, red for removals, amber for modifications

3. **Demo Fixtures Included**
   - Pre-populated before/after snapshots with representative changes
   - Examples: suite reassignment, checkout date extension, booking cancellation, new booking
   - Mirrors real-world last-minute change scenarios (tools/browns-booking-change-check semantics)
   - Safe to toggle between fixture mode and manual JSON input

4. **Export Options**
   - Download change report as Markdown (.md) file
   - Structured format with summary stats + detailed change breakdown
   - Suitable for leave-behind documentation or verification before CT-pack communications
   - Local-only operations with no external storage

5. **Demo Hub Integration**
   - Prominent Phase 21 amber card at top of demo hub linking to booking change check
   - Positioned above Phase 20 CT-pack for visibility
   - Integration with tenant switcher for multi-tenant demo

6. **Mirrors tools/browns-booking-change-check Semantics**
   - Same comparison logic: diff two snapshots by booking ID
   - Same placeholder rules: never invents missing fields
   - Same reporting structure: additions, removals, field updates
   - Suitable for last-minute verification before sending guest communications

**What Works vs. Stubbed:**
- ✅ Works: Snapshot comparison, change detection, markdown export, fixture mode, manual JSON input
- 🚧 Stubbed: Same as Phase 19 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — change check is DRAFT ONLY with local-only export
- Never invents guest names, suites, dates, or other fields
- All data comparisons are local-only (no external API calls or storage)

---

## What Works (Phase 18)

### ✅ Phase 18 Additions (Welcome Message Drafts from Bookings)

1. **Welcome Drafts Page** (`/demo/welcome-drafts`)
   - Generate same-day/upcoming welcome message stubs from tenant bookings
   - Configurable as-of date and window-days (default: same-day +1)
   - Uses active demo tenant from tenant context
   - Numbered DRAFT welcome stubs with warm Dullstroom-ish tone
   - Tenant-scoped SQLite bookings query with date filtering

2. **Smart Placeholder Handling**
   - `[GUEST_PHONE]` placeholder when phone is missing (never invents)
   - `[RATE CARD REQUIRED]` placeholder when rates are missing (never invents)
   - Skips bookings without guest_name and lists them separately in missing-fields section
   - Clear amber warnings for bookings with missing data

3. **Export Options** (`POST /api/welcome-drafts`)
   - Download as Markdown (.md) or HTML (.html) file
   - Print to PDF via browser print dialog (opens HTML in new window)
   - Mirrors Phase 8 quote export UX for consistency
   - Export includes queue summary + individual welcome stubs
   - Local-only operations with no external storage

4. **Demo Hub Integration**
   - Prominent Phase 18 rose card at top of demo hub linking to welcome drafts page
   - Link from daily-brief page to welcome drafts ("View Welcome Drafts" button)
   - Integration with tenant switcher for multi-tenant demo
   - Positioned above Phase 13 leave-behind export

5. **Extended Fixtures & Smoke Tests**
   - Demo seed now includes today/tomorrow arrivals for welcome drafts testing
   - Booking without guest_name to test skip logic
   - Extended smoke test coverage for `/demo/welcome-drafts` route
   - API test for `/api/welcome-drafts` GET endpoint with tenant filtering

6. **Mirrors tools/browns-welcome-draft-pack Semantics**
   - Same filtering logic: `asOfDate <= checkInDate < asOfDate + windowDays`
   - Same placeholder rules: never invents phone or rates
   - Same skip logic: bookings without guest_name are filtered out
   - Same warm Dullstroom-ish tone in welcome message generation

**What Works vs. Stubbed:**
- ✅ Works: Booking query/filtering, welcome stub generation, markdown/HTML export, print-to-PDF, skip logic, placeholder handling
- 🚧 Stubbed: Same as Phase 17 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — welcome drafts are DRAFT ONLY with local-only export
- Never invents guest phone (uses `[GUEST_PHONE]` placeholder)
- Never invents rates (uses `[RATE CARD REQUIRED]` placeholder)
- Skips bookings without guest_name and reports them separately
- All data persists to local SQLite only

---

## What Works (Phase 17)

### ✅ Phase 17 Additions (Demo Daily Ops Brief from Bookings)

---

## What Works (Phase 14)

### ✅ Phase 14 Additions (Sales Funnel Polish for Demo Walkthrough)

1. **Enhanced Landing Page** (`/`)
   - Explicit "Inquiry → Quote → Welcome → Operations" messaging in How It Works section
   - Four-step guest journey visualization (Inquiry Intake → Quote & Invoice → Welcome Pack → Daily Operations)
   - Clear multi-property operations pitch throughout
   - Complete sales funnel entry point for demos

2. **Polished Pricing Page** (`/pricing`)
   - Prominent amber warning banner: "⚠️ DEMO PLACEHOLDER PRICING - NOT LIVE OFFERS"
   - Each pricing tier labeled "EXAMPLE" with disclaimer: "(Demo placeholder - not a live offer)"
   - Additional disclaimer: "The pricing tiers below are example structures only. Final pricing will be announced at launch."
   - Clear distinction between demo and real pricing for sales demos

3. **Verified Waitlist Integration**
   - Waitlist form properly stores leads in tenant-scoped SQLite database
   - Integration with CRM confirmed via Phase 11 convert functionality
   - Lead capture includes property name, room count, current system, and operational notes
   - Seamless flow from waitlist → CRM → qualification pipeline

4. **Updated Demo Walkthrough** (`/demo/walkthrough`)
   - Phase 14 badge and updated copy emphasizing sales funnel journey
   - Enhanced Step 1 to highlight explicit Inquiry → Quote → Welcome → Operations flow
   - Enhanced Step 2 with detailed demo placeholder pricing talking points
   - Clear guidance on showcasing the complete guest journey during demos

5. **Extended Smoke Test Coverage**
   - Dedicated Phase 14 section testing sales funnel pages
   - Landing page tests for "inquiry→quote→welcome→ops" and "Multi-Property" messaging
   - Pricing page tests for "DEMO PLACEHOLDER" labels and "example structures only" disclaimer
   - Waitlist form test for "Property Name" lead capture field
   - Ensures sales funnel pages render correctly for demos

**What Works vs. Stubbed:**
- ✅ Works: Complete sales funnel (landing → pricing → waitlist → CRM), clear demo labeling, inquiry→quote→welcome→ops flow visualization
- 🚧 Stubbed: Same as Phase 13 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — sales pages are for demo walkthroughs with clearly labeled placeholder pricing
- All pricing labeled as "EXAMPLE" and "DEMO PLACEHOLDER" — not live offers
- Waitlist capture only, no payment processing or automated campaigns
- All data persists to local SQLite only

---

## What Works (Phase 13)

### ✅ Phase 13 Additions (Printable Leave-Behind Export)

1. **Leave-Behind Export on `/demo/leavebehind`**
   - Download leave-behind as Markdown (.md) or HTML (.html) file
   - Print-to-PDF functionality via browser print dialog (opens HTML in new window)
   - Three export modes: Download Markdown, Download HTML, Print to PDF
   - Mirrors Phase 8 quote export UX for consistency
   - Updated UI with orange Phase 13 badge

2. **Export API Endpoint** (`POST /api/leavebehind/export`)
   - Accepts `format` parameter ('markdown' or 'html')
   - Returns text/markdown or text/html with proper Content-Disposition headers
   - Markdown-to-HTML conversion with print-optimized CSS
   - Automatic filename generation (guestflow-platform-overview.md/html)
   - Consistent with Phase 8 quote export API pattern

3. **Demo Hub Phase 13 Integration**
   - Prominent orange card at top linking to leave-behind page (Phase 13 badge)
   - Positioned above Phase 11 waitlist conversion
   - Phase 5 leave-behind card updated to show "Phase 5 → 13" evolution

4. **Extended Smoke Test Coverage**
   - Route test for `/demo/leavebehind` accessibility
   - API test for `/api/leavebehind/export` POST endpoint with format validation
   - Validates markdown and HTML export generation work correctly

**What Works vs. Stubbed:**
- ✅ Works: Markdown export, HTML export, print-to-PDF, API endpoint with Content-Disposition headers
- 🚧 Stubbed: Same as Phase 12 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — leave-behind export is local demo feature only
- Never invents rates/pricing beyond what's already on the leavebehind page
- All export operations are local-only (no external storage or tracking)

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

## What Works (Phase 12)

### ✅ Phase 12 Additions (CRM Lead Notes)

1. **Lead Notes on CRM Page** (`/crm`)
   - Expand any lead row by clicking chevron icon to reveal note history
   - Inline note form to add timestamped text notes
   - Notes display in reverse chronological order (newest first)
   - Each note shows timestamp with date, time formatting
   - Protected by DemoAuthGuard (password: demo2026)

2. **Notes API Endpoints**
   - `POST /api/leads/notes` — Add note to a lead (requires lead_id, tenant_id, note_text)
   - `GET /api/leads/notes?lead_id=N&tenant_id=M` — Fetch all notes for a lead
   - Tenant-scoped validation (lead must belong to specified tenant)
   - Returns 404 if lead not found or tenant mismatch
   - Protected by tenant scope—never cross-tenant leaks

3. **Database Schema** (`lead_notes` table)
   - Stores notes in separate table with foreign keys to waitlist and tenants
   - Columns: id, lead_id, tenant_id, note_text, created_at
   - Indexes on lead_id and tenant_id for fast queries
   - Migration script provided for existing databases

4. **Demo Hub Phase 12 Integration**
   - Prominent pink card at top linking to CRM page (Phase 12 badge)
   - Positioned above Phase 11 waitlist conversion
   - Updated CRM features list to include note functionality

5. **Extended Smoke Test Coverage**
   - API test for `/api/leads/notes` POST endpoint with validation
   - API test for `/api/leads/notes` GET endpoint with tenant filtering
   - Validates note creation and retrieval work correctly

**What Works vs. Stubbed:**
- ✅ Works: Timestamped notes, tenant-scoped storage, inline add form, note history view
- 🚧 Stubbed: Same as Phase 11 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — notes stored in local SQLite with demo auth stub
- Never invents note text—only stores user-provided text with timestamp
- All data persists to tenant-scoped local SQLite only

---

## What Works (Phase 14)

### ✅ Phase 14 Additions (Sales Funnel Polish for Demo Walkthrough)

1. **Enhanced Landing Page** (`/`)
   - Explicit "Inquiry → Quote → Welcome → Operations" messaging in How It Works section
   - Four-step guest journey visualization (Inquiry Intake → Quote & Invoice → Welcome Pack → Daily Operations)
   - Clear multi-property operations pitch throughout
   - Complete sales funnel entry point for demos

2. **Polished Pricing Page** (`/pricing`)
   - Prominent amber warning banner: "⚠️ DEMO PLACEHOLDER PRICING - NOT LIVE OFFERS"
   - Each pricing tier labeled "EXAMPLE" with disclaimer: "(Demo placeholder - not a live offer)"
   - Additional disclaimer: "The pricing tiers below are example structures only. Final pricing will be announced at launch."
   - Clear distinction between demo and real pricing for sales demos

3. **Verified Waitlist Integration**
   - Waitlist form properly stores leads in tenant-scoped SQLite database
   - Integration with CRM confirmed via Phase 11 convert functionality
   - Lead capture includes property name, room count, current system, and operational notes
   - Seamless flow from waitlist → CRM → qualification pipeline

4. **Updated Demo Walkthrough** (`/demo/walkthrough`)
   - Phase 14 badge and updated copy emphasizing sales funnel journey
   - Enhanced Step 1 to highlight explicit Inquiry → Quote → Welcome → Operations flow
   - Enhanced Step 2 with detailed demo placeholder pricing talking points
   - Clear guidance on showcasing the complete guest journey during demos

5. **Extended Smoke Test Coverage**
   - Dedicated Phase 14 section testing sales funnel pages
   - Landing page tests for "inquiry→quote→welcome→ops" and "Multi-Property" messaging
   - Pricing page tests for "DEMO PLACEHOLDER" labels and "example structures only" disclaimer
   - Waitlist form test for "Property Name" lead capture field
   - Ensures sales funnel pages render correctly for demos

**What Works vs. Stubbed:**
- ✅ Works: Complete sales funnel (landing → pricing → waitlist → CRM), clear demo labeling, inquiry→quote→welcome→ops flow visualization
- 🚧 Stubbed: Same as Phase 13 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — sales pages are for demo walkthroughs with clearly labeled placeholder pricing
- All pricing labeled as "EXAMPLE" and "DEMO PLACEHOLDER" — not live offers
- Waitlist capture only, no payment processing or automated campaigns
- All data persists to local SQLite only

---

## What Works (Phase 13)

### ✅ Phase 11 Additions (Waitlist to CRM Lead Conversion)

1. **Waitlist Management UI** (`/demo/waitlist-manage`)
   - Protected admin view showing unconverted waitlist entries
   - Filters to active tenant via tenant context
   - Table displays contact info, property details, room count, current system
   - One-click "Convert to CRM" button per row
   - Removes entry from waitlist view after successful conversion
   - Protected by DemoAuthGuard (password: demo2026)

2. **Convert API Endpoint** (`POST /api/waitlist/convert`)
   - Accepts `waitlistId` and `tenantId` in request body
   - Validates entry exists and belongs to specified tenant
   - Updates waitlist entry status to "converted"
   - Returns success with lead summary (id, name, email, property, status)
   - Protected by demo auth, tenant-scoped validation
   - Never invents contact details—only updates existing records

3. **CRM Status Expansion**
   - Added "converted" as valid lead status (teal badge)
   - CRMTable component now displays converted leads with teal highlight
   - Status dropdown includes converted option for manual status management
   - Converted leads visible in main CRM view alongside other statuses

4. **Demo Hub Phase 11 Integration**
   - Prominent cyan card at top linking to waitlist management page (Phase 11 badge)
   - Positioned above Phase 9 demo seed for visibility
   - Completes sales workflow: waitlist → convert → CRM → follow-up

5. **Extended Smoke Test Coverage**
   - Auth check for `/demo/waitlist-manage` route
   - API test for `/api/waitlist/convert` endpoint with tenant validation
   - Validates conversion updates status correctly

**What Works vs. Stubbed:**
- ✅ Works: One-click conversion, tenant-scoped validation, status tracking, demo auth protection
- 🚧 Stubbed: Same as Phase 10 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — waitlist conversion is local demo feature with demo auth stub
- Never invents contact details—only copies existing name/email/property/notes from waitlist entry
- Conversion just updates status field; all data remains in same tenant-scoped SQLite table
- All data persists to local SQLite only

---

## What Works (Phase 10)

### ✅ Phase 10 Additions (Demo Tenant Switcher)

1. **Tenant Switcher on Demo Hub** (`/demo`)
   - Prominent tenant selector at top of demo hub page
   - Lists all tenants from SQLite database
   - Pill-based UI for selecting active demo tenant
   - Quick shortcut button for "Use Seeded Dullstroom Demo"
   - Shows active tenant details (name, location, timezone)
   - Selection persists across demo routes via localStorage

2. **Tenant Context Provider**
   - React Context wraps entire app for shared tenant state
   - Automatic loading of tenants on app startup
   - Sticky selection stored in browser localStorage
   - Falls back to default tenant if none selected
   - Provides useTenant() hook for all pages

3. **Tenant-Scoped Pages**
   - **CRM** (`/crm`) — Filters leads by selected tenant
   - **Rate Card Upload** (`/demo/rate-card-upload`) — Uploads/views rates for selected tenant
   - **Quote Draft** (`/demo/quote-draft`) — Fetches rate cards for selected tenant
   - All pages automatically respect tenant selection

4. **Tenant-Scoped APIs**
   - `GET /api/leads?tenant_id=N` — Fetch leads for specific tenant
   - `GET /api/rate-cards?tenant_id=N` — Fetch rate cards for specific tenant
   - `POST /api/rate-cards` with `tenant_id` body param — Upload rates to specific tenant
   - `DELETE /api/rate-cards?tenant_id=N` — Clear rates for specific tenant

5. **Extended Smoke Test Coverage**
   - Tests for `/api/leads?tenant_id=1` endpoint
   - Tests for `/api/rate-cards?tenant_id=1` endpoint
   - Validates tenant filtering works correctly

**What Works vs. Stubbed:**
- ✅ Works: Multi-tenant switcher on demo hub, sticky localStorage selection, tenant-scoped CRM/quotes/rates
- 🚧 Stubbed: Same as Phase 9 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — tenant switcher is for local demo purposes only
- In production, tenants authenticated via NextAuth.js with proper row-level security
- All data persists to local SQLite only

---

## What Works (Phase 9)

### ✅ Phase 9 Additions (One-Click Demo Seed)

1. **Demo Seed API** (`/api/demo/seed`)
   - POST endpoint that resets demo SQLite to known-good sales walkthrough state
   - Creates 1 demo tenant ("Dullstroom Demo Guesthouse")
   - Creates 2 sample properties (Riverside Suite + Mountain View Cottage)
   - Generates 4 rate card rows with synthetic DEMO rates (peak/standard seasons)
   - Inserts 3 sample leads for CRM with diverse scenarios
   - Inserts 3 inquiries for quote draft generation
   - Inserts 2 confirmed bookings for daily brief / ops demos
   - Protected by demo auth (Bearer token: demo2026)
   - Idempotent: re-running replaces demo tenant data only, never touches other tenants

2. **Demo Seed UI** (`/demo/seed`)
   - Simple one-button interface to trigger seed operation
   - Protected by DemoAuthGuard (password: demo2026)
   - Shows detailed summary after seeding (tenant, properties, rates, leads, bookings)
   - Quick-nav links to CRM, quote draft, rate cards after successful seed
   - Clear warnings about idempotent behavior and DEMO-only data
   - Hard gates reminder displayed on page

3. **Demo Hub Phase 9 Integration**
   - Prominent violet card at top linking to demo seed page (Phase 9 badge)
   - Positioned above Phase 8 quote export for visibility
   - Completes demo setup workflow: seed → walkthrough → leave-behind

4. **Extended Smoke Test Coverage**
   - Auth check for `/demo/seed` route
   - Full API test for `/api/demo/seed` endpoint with Bearer auth
   - Validates successful seed with summary data structure

**What Works vs. Stubbed:**
- ✅ Works: One-click seed, idempotent operation, demo auth protection, SQLite persistence
- 🚧 Stubbed: Same as Phase 8 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — all rates clearly labeled DEMO (synthetic only)
- Never invents production rates for real properties
- Idempotent seed safe to run multiple times (replaces demo tenant data only)
- All data persists to local SQLite only

---

## What Works (Phase 8)

### ✅ Phase 8 Additions (Printable Quote Export)

1. **Printable Quote Export** (`/demo/quote-draft` + `/api/quotes/export`)
   - Download quote as markdown (.md) or HTML (.html) file
   - Print-friendly HTML format with proper styling for paper output
   - Preserves [RATE CARD REQUIRED] placeholders when rates are missing
   - Never invents pricing—strict adherence to uploaded rates only
   - Export includes draft status, approval gates reminder, and reference number
   - Three export modes: Download Markdown, Download HTML, Print to PDF

2. **Export API Endpoint** (`/api/quotes/export`)
   - POST endpoint accepting booking and quote data
   - Returns text/markdown or text/html with proper Content-Disposition headers
   - Markdown-to-HTML conversion with basic formatting and print-optimized CSS
   - Automatic filename generation from property name

3. **Demo Hub Phase 8 Integration**
   - Prominent teal card linking quote export feature (Phase 8 badge)
   - Positioned above Phase 7 onboarding wizard for visibility
   - Quote draft page now includes three export buttons below generated quote

## What Works (Phase 7)

### ✅ Phase 7 Additions (Tenant Onboarding Wizard)

1. **Tenant Onboarding Wizard** (`/demo/onboard`)
   - Multi-step DEMO flow with progress indicator
   - Step 1: Create tenant (name, location, timezone)
   - Step 2: Add property (name, location, room count)
   - Step 3: Optional rate card upload link
   - Step 4: Completion screen with links to CRM and demo hub
   - Persist tenant and property data to SQLite
   - Protected by DemoAuthGuard (password: demo2026)
   - Clearly labeled as DEMO only (not public signup)

2. **New API Routes**
   - POST `/api/tenants` — Create new tenant with validation
   - POST `/api/properties` — Create new property linked to tenant
   - Extended GET routes for properties API

3. **Demo Hub Phase 7 Integration**
   - Prominent emerald card linking tenant onboarding wizard (Phase 7 badge)
   - Positioned above Phase 6 hosting readiness for visibility
   - Multi-step wizard icon and clear description

4. **Extended Smoke Test Coverage**
   - Auth check for `/demo/onboard` route
   - API test for `/api/properties` endpoint
   - Validates full onboarding flow is accessible

**What Works vs. Stubbed:**
- ✅ Works: Multi-step wizard, tenant/property creation, SQLite persistence, demo auth protection
- 🚧 Stubbed: Same as Phase 6 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — clearly labeled DEMO onboarding wizard, NOT production signup
- All data persists to local SQLite only

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

## Phase 14 Summary

**What Changed:**
- Enhanced landing page with explicit "Inquiry → Quote → Welcome → Operations" guest journey flow
- Four-step visualization on landing page (Inquiry Intake, Quote & Invoice, Welcome Pack, Daily Operations)
- Polished pricing page with prominent "DEMO PLACEHOLDER PRICING" warning banners
- Each pricing tier labeled "EXAMPLE" with disclaimers: "(Demo placeholder - not a live offer)"
- Additional disclaimer text: "The pricing tiers below are example structures only"
- Updated demo walkthrough script with Phase 14 badge and enhanced sales funnel talking points
- Extended smoke tests with dedicated Phase 14 section for sales funnel validation
- README updated with Phase 14 section documenting sales funnel polish

**What Works vs. Stubbed:**
- ✅ Works: Complete polished sales funnel for demos, clear placeholder labeling, verified waitlist→CRM integration
- 🚧 Stubbed: Same as Phase 13 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — sales pages for walkthrough demos with clear "DEMO PLACEHOLDER" labels
- All pricing marked as examples/placeholders, not live offers
- Waitlist capture only, no payment processing
- All data persists to local SQLite only

---

## Phase 13 Summary

**What Changed:**
- Leave-behind export functionality on `/demo/leavebehind` with markdown and HTML download options
- Print-to-PDF via browser print dialog (opens HTML export in new window)
- Export API endpoint (`/api/leavebehind/export`) returning markdown or HTML with proper Content-Disposition headers
- Mirrors Phase 8 quote export UX for consistent user experience across export features
- Demo hub updated with prominent Phase 13 orange card linking leave-behind page
- Phase 5 leave-behind card updated to show "Phase 5 → 13" evolution
- Extended smoke test script to cover leave-behind export route and API endpoint
- README updated with Phase 13 section and hard gates reminder

**What Works vs. Stubbed:**
- ✅ Works: Markdown export, HTML export, print-to-PDF, API endpoint, no invented content
- 🚧 Stubbed: Same as Phase 12 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — leave-behind export with local-only operations (no external storage/tracking)
- Never invents rates/pricing beyond what's already on the leavebehind page content
- All export operations remain local-only with no data persistence beyond download

---

## Phase 12 Summary

**What Changed:**
- Lead notes functionality on `/crm` page with expandable rows (click chevron to expand)
- Inline note form to add timestamped text notes to any lead
- Note history displays in reverse chronological order within expanded row
- POST API endpoint `/api/leads/notes` for adding notes (tenant-scoped validation)
- GET API endpoint `/api/leads/notes?lead_id=N&tenant_id=M` for fetching notes
- New `lead_notes` table in SQLite with foreign keys to waitlist and tenants
- Migration script `scripts/migrate-add-lead-notes.js` for existing databases
- Demo hub updated with prominent Phase 12 pink card linking CRM page
- Extended smoke tests for notes API endpoints
- README updated with Phase 12 section and hard gates reminder

**What Works vs. Stubbed:**
- ✅ Works: Timestamped notes, tenant-scoped validation, inline add, note history view
- 🚧 Stubbed: Same as Phase 11 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — notes with demo auth stub (password: demo2026)
- Never invents note text—only stores user-provided timestamped text
- All data persists to tenant-scoped local SQLite only

---

## Phase 14 Summary

**What Changed:**
- Enhanced landing page with explicit "Inquiry → Quote → Welcome → Operations" guest journey flow
- Four-step visualization on landing page (Inquiry Intake, Quote & Invoice, Welcome Pack, Daily Operations)
- Polished pricing page with prominent "DEMO PLACEHOLDER PRICING" warning banners
- Each pricing tier labeled "EXAMPLE" with disclaimers: "(Demo placeholder - not a live offer)"
- Additional disclaimer text: "The pricing tiers below are example structures only"
- Updated demo walkthrough script with Phase 14 badge and enhanced sales funnel talking points
- Extended smoke tests with dedicated Phase 14 section for sales funnel validation
- README updated with Phase 14 section documenting sales funnel polish

**What Works vs. Stubbed:**
- ✅ Works: Complete polished sales funnel for demos, clear placeholder labeling, verified waitlist→CRM integration
- 🚧 Stubbed: Same as Phase 13 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — sales pages for walkthrough demos with clear "DEMO PLACEHOLDER" labels
- All pricing marked as examples/placeholders, not live offers
- Waitlist capture only, no payment processing
- All data persists to local SQLite only

---

## Phase 13 Summary

**What Changed:**
- Waitlist management UI at `/demo/waitlist-manage` with one-click convert buttons
- POST API endpoint `/api/waitlist/convert` for tenant-scoped conversion
- Updated CRM status options to include "converted" (teal badge)
- Converted leads now visible in main CRM view with teal status indicator
- Demo hub updated with prominent Phase 11 cyan card linking waitlist management
- Extended smoke test script to cover waitlist management and convert API
- README updated with Phase 11 section and hard gates reminder

**What Works vs. Stubbed:**
- ✅ Works: One-click conversion, tenant-scoped validation, status tracking, demo auth protection
- 🚧 Stubbed: Same as Phase 10 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — waitlist conversion with demo auth stub (password: demo2026)
- Never invents contact details—only updates status of existing waitlist entries
- All data persists to local SQLite only

---

## Phase 10 Summary

**What Changed:**
- Demo tenant switcher on `/demo` hub page with pill-based UI (Phase 10 badge)
- React Context provider (`TenantProvider`) wraps entire app for shared tenant state
- Selection persists across routes via localStorage (sticky navigation)
- CRM, rate card upload, and quote draft pages now use selected tenant from context
- Tenant-scoped API endpoints: `/api/leads?tenant_id=N`, `/api/rate-cards?tenant_id=N`
- Quick shortcut button for "Use Seeded Dullstroom Demo"
- Extended smoke tests for tenant-filtered APIs
- README updated with Phase 10 section and hard gates reminder

**What Works vs. Stubbed:**
- ✅ Works: Multi-tenant switcher, sticky localStorage selection, tenant-scoped pages/APIs
- 🚧 Stubbed: Same as Phase 9 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — tenant switcher is for local demo/development only
- In production, tenants authenticated via NextAuth.js with proper row-level security
- All data persists to local SQLite only

---

## Phase 9 Summary

**What Changed:**
- One-click demo seed at `/demo/seed` with simple button interface (protected by DemoAuthGuard)
- POST API endpoint `/api/demo/seed` that resets demo SQLite to known-good sales state
- Creates 1 demo tenant, 2 properties, 4 rate cards (DEMO labeled), 3 leads, 3 inquiries, 2 bookings
- Idempotent operation safe to re-run (replaces demo tenant data only, never touches other tenants)
- Demo hub updated with prominent Phase 9 violet card linking seed page
- Extended smoke test script to cover seed page and API endpoint with auth
- README updated with Phase 9 section and hard gates reminder

**What Works vs. Stubbed:**
- ✅ Works: One-click seed, idempotent operation, demo auth protection, SQLite persistence
- 🚧 Stubbed: Same as Phase 8 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — seed creates synthetic DEMO rates only, never production rates
- Idempotent seed safe to run multiple times (replaces demo tenant data only)
- All data persists to local SQLite only

---

## Phase 8 Summary

**What Changed:**
- Printable quote export with markdown and HTML download options from quote draft page
- Print-to-PDF functionality via browser print dialog (HTML formatted)
- Export API endpoint (`/api/quotes/export`) returning markdown or HTML with proper headers
- Preserves [RATE CARD REQUIRED] placeholders when no matching rate found (never invents)
- Demo hub updated with prominent Phase 8 teal card linking quote export feature
- Export includes draft status, H7 approval gate reminder, and unique reference number
- README updated with Phase 8 section and hard gates reminder

**What Works vs. Stubbed:**
- ✅ Works: Quote export (markdown/HTML), print functionality, no invented rates
- 🚧 Stubbed: Same as Phase 7 (production auth, live payments, email/WhatsApp auto-send)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Quotes remain DRAFT until H7 approval
- Missing rates stay as [RATE CARD REQUIRED]—never fabricated

---

## Phase 7 Summary

**What Changed:**
- Tenant onboarding wizard at `/demo/onboard` with multi-step flow (tenant → property → rates → complete)
- POST API routes for tenant and property creation (`/api/tenants`, `/api/properties`)
- Protected by DemoAuthGuard (password: demo2026)
- SQLite persistence for tenant and property data
- Demo hub updated with prominent Phase 7 emerald card linking onboarding wizard
- Extended smoke test script to cover onboarding route and properties API
- README updated with Phase 7 section and hard gates reminder

**What Works vs. Stubbed:**
- ✅ Works: Multi-step wizard, tenant/property creation, SQLite persistence, demo auth protection
- 🚧 Stubbed: Same as Phase 6 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — onboarding wizard is DEMO labeled, NOT production signup flow
- All data persists to local SQLite only

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

## Hard Gates Reminder (Phase 14)

**GuestFlow respects these safety constraints:**

1. ❌ **NO live payments** — No Stripe, no card charges, no payment processing
2. ❌ **NO paid ads** — No Google Ads pixels, no Meta conversion tracking
3. ❌ **NO public signup** — Waitlist only, demo auth stub is NOT production-ready
4. ❌ **NO WhatsApp/email auto-send** — All messaging is draft-only with approval banners
5. ✅ **Demo labeling** — All pages clearly marked DEMO / WAITLIST / COMING SOON / EXAMPLE PRICING
6. ✅ **No invented data** — Rate cards uploaded only, never fabricated. Missing rates flagged clearly. Pricing labeled as demo placeholders. Conversion copies existing contact data only. Notes are user-provided text only.
7. ✅ **Local demo only** — SQLite database, no cloud deployments without explicit approval
8. ✅ **Strong .gitignore** — `node_modules`, `.next`, `*.db`, and data files excluded
9. ✅ **Demo auth only** — Simple password stub (demo2026) for local testing, NOT production auth

**These gates are unchanged from Phase 13. Phase 14 adds sales funnel polish for demo walkthroughs—polished landing page with explicit Inquiry→Quote→Welcome→Operations flow, pricing page with prominent "DEMO PLACEHOLDER PRICING" warning banners and "EXAMPLE" labels on all tiers, and verified waitlist→CRM integration. All safety constraints maintained.**

---

<<<<<<< HEAD
## Phase 21 Summary

**What Changed:**
- Booking change check page at `/demo/booking-change-check` with before/after snapshot comparison
- Two input modes: (a) demo fixtures with pre-populated realistic changes, (b) manual JSON paste/upload
- Smart change detection: additions (new bookings), removals (cancellations), field-level updates
- Change report with visual color-coding: green for additions, red for removals, amber for modifications
- Markdown export for leave-behind/verification documentation (local-only operations)
- Demo hub updated with prominent Phase 21 amber card linking booking change check
- Extended smoke tests for Phase 21 route
- README updated with Phase 21 section documenting change check features

**What Works vs. Stubbed:**
- ✅ Works: Snapshot comparison, change detection (additions/removals/updates), markdown export, fixture mode, manual JSON input
- 🚧 Stubbed: Same as Phase 18 (production auth, live payments, email/WhatsApp auto-send, public signup)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — change check is DRAFT ONLY with local-only export
- Never invents guest names, suites, dates, or other fields
- Mirrors tools/browns-booking-change-check semantics for last-minute verification before CT-pack communications
- All data comparisons are local-only (no external API calls or storage)

---

## Phase 3 Summary
=======
## Phase 23 Summary

**What Changed:**
- Quote draft page now accepts inquiry/quote JSON from Phase 22 output, paste, or fixtures
- Three input modes: Sample Data (existing), Paste JSON (new), Load Fixtures (new)
- Created fixtures directory with inquiry-with-amounts.json and inquiry-without-amounts.json
- Smart rate handling: checks for embedded amounts in inquiry JSON first, falls back to rate card
- If amounts present in JSON → generates DRAFT quote/proforma with those amounts only
- If amounts missing → generates availability-only draft with `[RATE CARD REQUIRED]` placeholders
- JSON input parsing with validation and clear error messages
- Rate source clearly labeled: "quoted amount from inquiry" vs "from rate card"
- Link from inquiry-intake page to quote-draft with Phase 22→23 instructions
- Demo hub updated with prominent Phase 23 card (teal)
- README updated with Phase 23 section and hard gates reminder
- Mirrors tools/browns-quote-invoice-draft semantics (never invents rates)

**What Works vs. Stubbed:**
- ✅ Works: JSON input (paste/fixtures), embedded amounts detection, quote generation with/without amounts, validation, export (markdown/HTML/PDF)
- 🚧 Stubbed: Same as Phase 19 (production auth, live payments, email/WhatsApp auto-send, CRM note attachment)

**Hard Gates (UNCHANGED):**
- NO live payments, NO paid ads, NO public signup, NO WhatsApp/email auto-send
- Demo environment only — quotes are DRAFT ONLY requiring H7 approval before send
- Never invents amounts—uses embedded JSON amounts or rate card only, never fabricates
- Missing amounts → availability-only confirmation with clear `[RATE CARD REQUIRED]` placeholders
- All export operations remain local-only (no external sends or storage)
- Fixtures and DEMO data only—no production rate publishing

---

## Phase 19 Summary
>>>>>>> de6ed99 (feat(guestflow): add Phase 23 quote draft from inquiry JSON)

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

## Next Steps (Post-Phase-14)

**Phase 14 completes the sales funnel polish with clear demo labeling and inquiry→quote→welcome→ops flow.** Next priorities focus on production features and live integrations:

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
