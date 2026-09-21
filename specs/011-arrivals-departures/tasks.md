# Implementation Tasks: Arrivals & Departures

**Feature**: Arrivals & Departures Staff Dashboard
**Branch**: `cursor/arrivals-departures-6a15`
**Status**: In Progress

## Task List

### T1: Create API Endpoint `/api/ops/arrivals-departures`

**Status**: Pending
**Priority**: P1
**Dependencies**: None

**Description**: Create GET endpoint that returns arrivals and departures based on check_in/check_out dates within a date range.

**Acceptance Criteria**:
- [ ] Endpoint accepts query params: `tenant_id`, `from` (YYYY-MM-DD), `to` (YYYY-MM-DD)
- [ ] Returns `{ arrivals: [...], departures: [...] }`
- [ ] Arrivals filtered by `check_in >= from AND check_in <= to`
- [ ] Departures filtered by `check_out >= from AND check_out <= to`
- [ ] Excludes `status = 'cancelled'` by default
- [ ] Sorts arrivals by check_in ASC, property, suite
- [ ] Sorts departures by check_out ASC, property, suite
- [ ] Requires staff authentication
- [ ] NEVER logs phone numbers to console or server logs

**Files to Modify/Create**:
- Create: `apps/guestflow/src/app/api/ops/arrivals-departures/route.ts`

---

### T2: Create UI Page `/ops/arrivals-departures`

**Status**: Pending
**Priority**: P1
**Dependencies**: T1

**Description**: Create staff dashboard page with date range picker and arrivals/departures sections.

**Acceptance Criteria**:
- [ ] Page route at `/ops/arrivals-departures`
- [ ] Date range picker (From/To) defaults to today → today +7 days
- [ ] Two sections: Arrivals and Departures
- [ ] Each section shows count in header
- [ ] Columns: Date | Guest | Property | Suite/room | Adults/Children | Phone | Late check-in? | Status | Portal link
- [ ] Copy portal link button (reuse existing logic)
- [ ] Empty state with link to `/ops/nightsbridge-import`
- [ ] Optional "Include cancelled" toggle
- [ ] Phone numbers displayed but never logged
- [ ] Responsive table with horizontal scroll

**Files to Modify/Create**:
- Create: `apps/guestflow/src/app/ops/arrivals-departures/page.tsx`

---

### T3: Add Navigation Link to Ops Hub

**Status**: Pending
**Priority**: P2
**Dependencies**: T2

**Description**: Add link to arrivals-departures page in the Ops hub navigation near the Bookings link.

**Acceptance Criteria**:
- [ ] Link appears on `/ops` page
- [ ] Placed near existing "Bookings" link
- [ ] Uses consistent styling with other ops links
- [ ] Icon and badge consistent with ops hub design

**Files to Modify/Create**:
- Modify: `apps/guestflow/src/app/ops/page.tsx`

---

### T4: Manual Testing

**Status**: Pending
**Priority**: P1
**Dependencies**: T1, T2, T3

**Description**: Test the complete feature end-to-end.

**Test Cases**:
- [ ] Default date range shows correct arrivals and departures
- [ ] Changing date range updates both sections correctly
- [ ] Arrivals filtered by check_in date only
- [ ] Departures filtered by check_out date only
- [ ] Cancelled bookings excluded by default
- [ ] Toggle "Include cancelled" shows cancelled bookings
- [ ] Phone numbers display in UI
- [ ] No phone numbers in console logs
- [ ] Portal link copy works correctly
- [ ] Empty state displays when no results
- [ ] Timezone handling correct for Africa/Johannesburg
- [ ] Sorting correct (date ASC, property, suite)
- [ ] Navigation link from ops hub works

---

## Implementation Notes

- Reuse patterns from `/ops/bookings` page for consistency
- Use existing portal link logic from bookings page
- Date filtering is by calendar date (check_in/check_out), NOT stay overlap
- Africa/Johannesburg timezone interpretation happens client-side via date inputs
- No pagination needed initially (date range naturally limits results)
