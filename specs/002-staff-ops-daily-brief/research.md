# Research: Staff Ops Daily Brief

**Date**: 2026-09-14

## Decision 1: Data source for brief

**Decision**: Query existing `bookings` table via `getDbAsync()` with date-range filter covering target date and next day.

**Rationale**: NightsBridge ingest already populates `bookings` (cron + manual upload). No new scrape or automation required.

**Alternatives considered**:
- Call external NB API at brief time — rejected (fail-closed: no scrape)
- Client-side fixture JSON — rejected for production path (seed/demo only)

## Decision 2: Status derivation

**Decision**: Derive `arriving` / `inhouse` / `departing` by comparing normalized `check_in` / `check_out` dates (YYYY-MM-DD) to target date, matching Phase 17 demo logic and `tools/browns-daily-ops-brief` status grouping.

**Rationale**: Bookings table stores calendar dates; no separate status column for daily ops slice.

**Alternatives considered**:
- Use `bookings.status` field (`confirmed`) — insufficient for daily ops grouping

## Decision 3: Exception detection

**Decision**:
- **Late check-in**: `late_check_in = 1` OR notes contain late-arrival keywords (same inference as late-checkin queue)
- **Missing fields**: blank `guest_name`, `guest_phone`, `suite_or_unit` / `room_number`
- **Empty suites (turnover)**: units with departure on target date where no arrival is scheduled same day or next day on that unit

**Rationale**: Matches spec edge cases without inventing ETAs or occupancy guesses.

## Decision 4: Export format

**Decision**: WhatsApp-ready plain text follows `tools/browns-daily-ops-brief` `generateTeamBrief()` section headers with added tomorrow preview and mandatory footer `DRAFT ONLY - DO NOT SEND WITHOUT APPROVAL`.

**Rationale**: Staff already familiar with CLI output; ensures consistency.

**Alternatives considered**:
- Markdown-only — kept as secondary download; clipboard uses plain text

## Decision 5: Staff draft enqueue

**Decision**: **Not implemented** — no existing `staff_ops` or daily-brief row in `/api/approvals` queue. Default UX is copy/export only.

**Rationale**: Fail-closed gate — do not invent new send/approval path. `guest_tickets.staff_brief` is for outlier tickets, not daily ops run sheet.

## Decision 6: Timezone

**Decision**: Default target date = today in `Africa/Johannesburg` via `date-fns-tz` or manual offset; date picker overrides for staff review of other days.

**Rationale**: AGENTS.md specifies Johannesburg for SA operations.

## Decision 7: Bookings API gap

**Decision**: Add dedicated `GET /api/daily-brief` rather than extending `/api/bookings` date filter — keeps brief derivation server-side and returns `{ success, today, tomorrow, exceptions, briefText }`.

**Rationale**: Current `/api/bookings` lacks `date` param and `derivedStatus` enrichment expected by Phase 17 page; brief API is the single source of truth.
