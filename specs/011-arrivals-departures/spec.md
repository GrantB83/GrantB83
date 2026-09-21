# Feature Specification: Arrivals & Departures Staff Dashboard

**Feature Branch**: `cursor/arrivals-departures-6a15`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "GuestFlow Arrivals/Departures ops page - Staff dashboard `/ops/arrivals-departures` listing Arrivals and Departures by date range with from/to Africa/Johannesburg dates; arrivals by check_in, departures by check_out; not stay-overlap bookings API."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Upcoming Arrivals (Priority: P1)

Staff need to see which guests are checking in today or within a selected date range to prepare properties and coordinate housekeeping.

**Why this priority**: Daily operational necessity for property preparation. Without this view, staff must manually scan through all bookings to find arrivals.

**Independent Test**: Can be fully tested by selecting a date range and verifying that only bookings with check_in dates within that range appear in the Arrivals section.

**Acceptance Scenarios**:

1. **Given** staff accesses the page, **When** they select "Today" to "+7 days" (default), **Then** all bookings with check_in dates in that range are displayed in the Arrivals section, sorted by check_in date ascending, then by property/suite
2. **Given** staff has selected a date range, **When** viewing the Arrivals list, **Then** each row shows: Date | Guest | Property | Suite/room | Adults/Children | Phone | Late check-in? | Status | Portal link
3. **Given** staff views arrivals, **When** the guest has a phone number, **Then** the phone is displayed in the UI but never logged to console or server logs

---

### User Story 2 - View Departures (Priority: P1)

Staff need to see which guests are checking out within a date range to coordinate housekeeping turnovers and prepare for next arrivals.

**Why this priority**: Equal operational priority to arrivals for housekeeping coordination and property turnover planning.

**Independent Test**: Can be fully tested by selecting a date range and verifying that only bookings with check_out dates within that range appear in the Departures section.

**Acceptance Scenarios**:

1. **Given** staff accesses the page, **When** they view the default date range, **Then** all bookings with check_out dates in that range are displayed in the Departures section, sorted by check_out date ascending, then by property/suite
2. **Given** staff views departures, **When** reviewing the list, **Then** each row shows the same columns as arrivals: Date | Guest | Property | Suite/room | Adults/Children | Phone | Late check-in? | Status | Portal link
3. **Given** multiple bookings check out on the same date, **When** viewing that date, **Then** bookings are sub-sorted by property name, then suite/unit name

---

### User Story 3 - Filter by Date Range with Africa/Johannesburg Timezone (Priority: P1)

Staff need to select custom date ranges using their local timezone (Africa/Johannesburg) to plan operations for specific periods.

**Why this priority**: Core functionality - the date filter determines which bookings are shown. Must use correct timezone for SA operations.

**Independent Test**: Can be fully tested by changing the From/To date inputs and verifying that the displayed bookings update correctly based on Africa/Johannesburg calendar dates.

**Acceptance Scenarios**:

1. **Given** staff opens the page, **When** the page loads, **Then** From date defaults to today and To date defaults to today +7 days, both in Africa/Johannesburg timezone
2. **Given** staff selects a custom From date, **When** they select a To date before the From date, **Then** validation prevents the invalid range
3. **Given** staff changes the date range, **When** they submit, **Then** both Arrivals and Departures sections refresh with bookings matching the new date filters

---

### User Story 4 - Exclude Cancelled Bookings by Default (Priority: P2)

Staff primarily need to see active bookings. Cancelled bookings should be excluded by default to reduce noise, with an option to include them if needed.

**Why this priority**: Quality-of-life improvement that reduces clutter in daily operations while maintaining flexibility.

**Independent Test**: Can be fully tested by verifying that cancelled bookings (status = 'cancelled') do not appear by default, then toggling "Include cancelled" and verifying they appear.

**Acceptance Scenarios**:

1. **Given** staff loads the page, **When** viewing arrivals or departures, **Then** bookings with status = 'cancelled' are not displayed
2. **Given** staff wants to review cancelled bookings, **When** they toggle "Include cancelled" checkbox, **Then** cancelled bookings appear in the lists
3. **Given** the "Include cancelled" toggle is enabled, **When** staff reloads the page, **Then** the toggle returns to the default (unchecked) state

---

### User Story 5 - Copy Guest Portal Links (Priority: P2)

Staff need to quickly share guest portal links with arriving or departing guests for self-service access to stay information.

**Why this priority**: Reuses existing portal link functionality from the Bookings page for staff convenience.

**Independent Test**: Can be fully tested by clicking the "Copy Link" button on any booking row and verifying the correct portal URL is copied to the clipboard.

**Acceptance Scenarios**:

1. **Given** staff views an arrival or departure, **When** they click "Copy Link", **Then** the guest portal link is copied to clipboard and button shows "Copied!" for 2 seconds
2. **Given** staff has copied a link, **When** they paste it into a browser, **Then** the guest portal page for that booking loads correctly

---

### Edge Cases

- What happens when no bookings match the selected date range? Display empty state with link to `/ops/nightsbridge-import`
- How does the system handle bookings without check_in or check_out dates? They do not appear in the results
- What happens when a booking has no property or suite assigned? Display "—" in that column
- How are bookings with the same check-in/check-out date and property sorted? Alphabetically by suite name, then by guest name
- What if a guest has no phone number? Display blank/dash in the phone column; never log or error

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a staff-authenticated route at `/ops/arrivals-departures` that displays arrivals and departures by date range
- **FR-002**: System MUST filter arrivals where `check_in` date is between `from` and `to` dates (inclusive), interpreted as Africa/Johannesburg calendar dates
- **FR-003**: System MUST filter departures where `check_out` date is between `from` and `to` dates (inclusive), interpreted as Africa/Johannesburg calendar dates
- **FR-004**: System MUST NOT use stay-overlap filtering semantics (this is distinct from the existing `/api/bookings` endpoint which filters on stay overlap)
- **FR-005**: System MUST provide a GET endpoint at `/api/ops/arrivals-departures` with query parameters: `tenant_id`, `from` (YYYY-MM-DD), `to` (YYYY-MM-DD)
- **FR-006**: API MUST return response format: `{ arrivals: [...], departures: [...] }` where each array contains booking objects
- **FR-007**: System MUST exclude bookings with `status = 'cancelled'` by default
- **FR-008**: System MUST provide an optional toggle to include cancelled bookings in the results
- **FR-009**: System MUST require staff authentication cookie for both the page and API endpoint
- **FR-010**: System MUST sort arrivals by check_in date ASC, then property name, then suite/unit name
- **FR-011**: System MUST sort departures by check_out date ASC, then property name, then suite/unit name
- **FR-012**: System MUST display phone numbers in the UI when available but NEVER log phone numbers to console or server logs
- **FR-013**: System MUST NOT fabricate or invent any PII data (names, phones, addresses)
- **FR-014**: System MUST display counts in section headers (e.g., "5 Arrivals", "3 Departures")
- **FR-015**: System MUST provide portal link generation and copy functionality (reuse existing `/api/bookings/[id]/generate-link` pattern)
- **FR-016**: System MUST display empty state with link to `/ops/nightsbridge-import` when no results found
- **FR-017**: System MUST provide date picker controls with default range of today → today +7 days (Africa/Johannesburg timezone)
- **FR-018**: System MUST add navigation link to the Ops hub page near the existing Bookings link

### Key Entities *(include if feature involves data)*

- **Booking**: Existing entity in the `bookings` table containing guest_name, check_in, check_out, suite_or_unit, property_name, adults, children, guest_phone, late_check_in, status, tenant_id
- **Date Range Filter**: User-selected `from` and `to` dates in YYYY-MM-DD format, interpreted as Africa/Johannesburg calendar dates
- **Arrivals Result Set**: Bookings where check_in date falls within the selected date range (not cancelled by default)
- **Departures Result Set**: Bookings where check_out date falls within the selected date range (not cancelled by default)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can view all arrivals for a selected date range in under 2 seconds
- **SC-002**: Staff can view all departures for a selected date range in under 2 seconds
- **SC-003**: Default date range (today +7 days) displays correctly using Africa/Johannesburg timezone on first page load
- **SC-004**: 100% of displayed phone numbers are shown in the UI, and 0% are logged to console or server logs
- **SC-005**: Portal link copy functionality works identically to the existing Bookings page implementation
- **SC-006**: Empty state displays with actionable link when no bookings match the date range
- **SC-007**: Cancelled bookings are excluded by default, reducing noise in daily operational views
- **SC-008**: Page is accessible from the Ops hub with a single click from the navigation

## Assumptions

- Staff authentication middleware already exists and protects `/ops/*` routes
- The `bookings` table contains `check_in`, `check_out`, `status`, `guest_phone`, `late_check_in`, and tenant scoping fields
- The existing portal link generation logic from `/ops/bookings` can be reused without modification
- Date inputs use HTML5 date pickers which handle date selection in the user's local timezone (Africa/Johannesburg for SA operations)
- The API does not need pagination initially since the date range naturally limits result set size
- The frontend uses the same styling patterns as existing `/ops/bookings` page (Tailwind CSS classes)
- No real-time updates are required - staff manually refresh to see new data
- The NightsBridge import process is the source of truth for booking data (referenced in empty state)
