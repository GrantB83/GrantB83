# Feature Specification: Staff Ops Daily Brief (Ops Hub)

**Feature Branch**: `cursor/guestflow-daily-brief-ops-hub-59c7`

**Created**: 2026-09-14

**Status**: Draft

**Input**: Replace the paused Nightsbridge-sourced Admin/ops WhatsApp daily brief with an internal Browns Dullstroom GuestFlow staff Ops Hub view: today/tomorrow arrivals, departures, exceptions (late check-in flags, empty suites). Staff may copy/export a WhatsApp-ready brief or queue a draft staff message. A human must approve before any send. Never auto-send to guests or staff.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Today/Tomorrow Ops Brief (Priority: P1)

A Browns Dullstroom staff member logs into the Ops Hub each morning and opens the Daily Ops Brief page. They see today and tomorrow arrivals, departures, in-house guests, and flagged exceptions (late check-ins, missing guest data, empty suites after departures) sourced from GuestFlow booking data already ingested from NightsBridge or seed data.

**Why this priority**: This replaces the manual/paused WhatsApp admin brief with a single internal view staff can trust before guest-facing work begins.

**Independent Test**: Log in via staff auth, open `/ops/daily-brief`, select today's date, and verify arrivals/departures/exceptions render from database bookings (or a clear empty state when no data exists).

**Acceptance Scenarios**:

1. **Given** bookings exist for today in GuestFlow DB, **When** staff opens the daily brief, **Then** arrivals, departures, and in-house counts match booking check-in/check-out dates for the selected day
2. **Given** a booking has `late_check_in` set or late-arrival notes, **When** staff views the brief, **Then** it appears in the RED/exceptions section
3. **Given** no bookings match the selected date, **When** staff opens the brief, **Then** an explicit empty state is shown with no invented guest names, rates, or amounts
4. **Given** booking data is missing suite/room assignment, **When** staff views exceptions, **Then** the suite is flagged (empty/missing) without guessing a room number

---

### User Story 2 - Copy or Export WhatsApp-Ready Brief (Priority: P1)

Staff copy the brief to clipboard or download plain-text/markdown suitable for pasting into the internal staff WhatsApp group. The export includes a footer stating draft-only / no auto-send and never includes invented rates or payment amounts.

**Why this priority**: The primary ritual being replaced was a staff WhatsApp morning brief; copy/export is the safe default replacement.

**Independent Test**: Generate a brief with seeded bookings, copy or download text, and verify format matches staff group conventions (sections for arrivals, departures, exceptions) with draft-only footer.

**Acceptance Scenarios**:

1. **Given** a populated brief, **When** staff clicks "Copy for WhatsApp", **Then** plain text is copied including today summary, tomorrow preview, and "DRAFT ONLY" footer
2. **Given** a populated brief, **When** staff downloads markdown or text export, **Then** file content matches on-screen data with no invented financial fields
3. **Given** zero bookings, **When** staff attempts export, **Then** export is disabled or produces a brief stating no operations for the date (not fabricated guests)

---

### User Story 3 - Tomorrow Preview & Exception Scan (Priority: P2)

Staff scan tomorrow's arrivals and departures on the same page without changing tools, so housekeeping and front-of-house can prep ahead.

**Why this priority**: Operational value beyond today-only view; still read-only and low risk.

**Independent Test**: With bookings spanning today and tomorrow, verify tomorrow section lists correct next-day arrivals/departures independently of today's section.

**Acceptance Scenarios**:

1. **Given** bookings with check-in tomorrow, **When** staff views the brief for today, **Then** a tomorrow preview section lists those arrivals
2. **Given** suites with departure today and no arrival today/tomorrow on same unit, **When** staff views exceptions, **Then** empty-suite turnover flags appear

---

### User Story 4 - Optional Staff Brief Draft Queue (Priority: P3 — deferred)

Staff optionally save the brief text into an existing human approval queue for later WhatsApp Admin post. This is only in scope if GuestFlow already supports staff-ops draft enqueue without a new send path.

**Why this priority**: Nice-to-have; default workflow is view + copy/export.

**Independent Test**: N/A if no existing staff-ops approval queue — story marked deferred.

**Acceptance Scenarios**:

1. **Given** no existing staff-ops draft approval type, **When** staff use the brief page, **Then** only copy/export actions are offered (no "Send" or auto-enqueue buttons)

---

### Edge Cases

- What happens when NightsBridge ingest has not run and the bookings table is empty?
- How does the system handle bookings missing guest name, phone, or suite?
- What happens when staff selects a historical or future date with no data?
- How are timezone boundaries handled for "today" vs "tomorrow" (Africa/Johannesburg)?
- What happens when the database connection fails?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a staff-authenticated Ops Hub page at `/ops/daily-brief` for Browns Dullstroom internal operations only
- **FR-002**: System MUST load booking data from the existing GuestFlow database (SQLite/Turso) without NightsBridge login scraping or browser automation
- **FR-003**: System MUST display today arrivals, departures, in-house guests, and exception flags derived from stored booking fields
- **FR-004**: System MUST display a tomorrow preview (next calendar day) for arrivals and departures on the same page
- **FR-005**: System MUST flag late check-ins when `late_check_in` is true or late-arrival keywords appear in booking notes (without inventing ETA times)
- **FR-006**: System MUST flag empty/missing suites when `suite_or_unit` or room assignment is blank, and flag turnover gaps when a unit has departure without a same-day/tomorrow arrival
- **FR-007**: System MUST provide copy-to-clipboard and download export (plain text and markdown) formatted for internal staff WhatsApp groups
- **FR-008**: System MUST NOT auto-send messages to guests or staff; all outputs are drafts requiring human approval off-system or via existing approved send paths
- **FR-009**: System MUST NOT invent rates, payment amounts, phone numbers, Wi-Fi codes, or ETAs not present in booking data
- **FR-010**: System MUST show explicit UI copy: "Draft only — no auto-send"
- **FR-011**: System MUST expose a staff-authenticated GET API returning structured brief data for the selected tenant and date
- **FR-012**: System MUST show a clear empty or error state when booking data is absent or the query fails — never guess occupancy

### Key Entities

- **Booking**: Guest stay record with check-in/out dates, suite/unit, guest name, late check-in flag, notes, party size; sourced from existing `bookings` table
- **Daily Brief Snapshot**: Derived view for a target date including arrivals, departures, in-house, tomorrow preview, and exception lists
- **Brief Export**: WhatsApp-ready plain text or markdown representation of a snapshot; draft-only footer required

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can open the daily brief and see today/tomorrow operations within 5 seconds for typical tenant data (≤50 bookings)
- **SC-002**: 100% of exported briefs include an explicit draft-only / no-auto-send footer
- **SC-003**: Zero exported briefs contain invented rates or payment amounts (verified by unit tests on the brief builder)
- **SC-004**: When no booking data exists, staff see an empty state within one page load — no placeholder guest names
- **SC-005**: Unit tests for the brief builder pass locally in CI/agent environment

## Assumptions

- Browns Dullstroom is the sole tenant for this feature; multi-tenant selector may exist but scope is internal Browns ops
- Existing Phase 17 daily brief UI and export route are upgraded, not rebuilt from scratch
- Staff authentication uses existing `STAFF_PASSWORD` cookie middleware
- Optional staff-ops draft enqueue is **out of scope** unless an existing approval queue type already supports it (none found for daily ops brief); copy/export is the default workflow
- "Today/tomorrow" uses Africa/Johannesburg calendar dates unless staff picks another date via date picker
- GuestFlow retail/SaaS paths remain untouched
