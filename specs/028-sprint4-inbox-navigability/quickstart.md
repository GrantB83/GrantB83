# Quickstart: Sprint 4 Inbox Navigability Validation

**Feature**: 028-sprint4-inbox-navigability  
**Created**: 2026-09-26  
**Purpose**: End-to-end validation guide for compact inbox layout and Redirect banner removal

## Prerequisites

- GuestFlow development environment running (`npm run dev` in `apps/guestflow/`)
- Test data seeded (`npm run seed:browns`)
- Turso/libSQL database initialized and migrated
- Browser DevTools open for responsive testing

## Validation Scenarios

### V1: Desktop Compact Thread Layout

**Goal**: Verify message transcript is the tallest thread band on desktop ~1280×800

**Steps**:
1. Navigate to `http://localhost:3100/inbox`
2. Click any guest thread in the list (e.g., "Alex Guest")
3. Measure thread header height (should be ≤120px)
4. Measure composer height in collapsed state (should be ≤35% of thread column, approximately ≤280px on 800px viewport)
5. Measure message transcript height (should be >50% of thread column, approximately ≥400px)
6. Scroll message transcript smoothly
7. Open Template & Care disclosure in composer
8. Verify composer expands but still respects ≤50% maximum (≤400px)

**Expected Outcomes**:
- Header shows: Guest name, suite, dates, NB ref, channel line, Details button (if present)
- No Staff phone/email inputs visible in header
- Message transcript is visibly taller than header + composer combined
- Composer has Template & Care toggle button (collapsed by default)
- Clicking toggle expands/collapses template selector and care notes

**Success Criteria**: SC-001 (messages ≥50%), SC-002 (header ≤120px), SC-003 (composer ≤35% collapsed)

---

### V2: Phone Thread Navigation and Compact Layout

**Goal**: Verify phone single-pane navigation and compact layout on ~390×844

**Steps**:
1. Resize browser to 390×844 (iPhone SE) or use DevTools device emulation
2. Navigate to `http://localhost:3100/inbox`
3. Verify conversation list fills viewport (list-only view)
4. Tap a guest thread
5. Verify thread view replaces list (thread-only view) and URL updates to `/?thread=<id>`
6. Measure thread header height (should be ≤96px)
7. Verify message transcript is visible and scrollable
8. Verify composer shows channel chips, draft, and Approve & Send
9. Tap Back button or use browser back
10. Verify list view restored with scroll position preserved

**Expected Outcomes**:
- Phone shows only one pane at a time (list OR thread, never both)
- Header compact with Back button on left
- Message transcript visible without header/composer consuming >50% combined
- Template & Care collapsed by default
- Back navigation works, list scroll position restored

**Success Criteria**: SC-001 (messages ≥50%), SC-002 (header ≤96px on phone), SC-004 (Back restores list scroll 100%)

---

### V3: Contact Details Sheet/Modal

**Goal**: Verify Staff phone/email editing via Details sheet

**Steps**:
1. Desktop: Open any thread
2. Click "Details" button in thread header (or icon in header actions)
3. Verify Details sheet opens (desktop: centered card overlay, phone: bottom sheet)
4. Edit Staff phone field (e.g., "+27 12 345 6789")
5. Edit Staff email field (e.g., "staff@example.com")
6. Click Save
7. Verify sheet closes and contact saved
8. Reopen Details sheet to confirm values persisted

**Expected Outcomes**:
- Details button visible and accessible from thread header (≤2 clicks from thread view)
- Sheet opens as modal overlay (desktop) or bottom sheet (phone)
- Staff phone and Staff email inputs editable
- Save button POSTs to `/api/umi/threads/[id]/contacts`
- Sheet closes on Save, Cancel, Escape, or backdrop click

**Success Criteria**: SC-007 (contact editing accessible within 2 clicks)

---

### V4: Composer Disclosure

**Goal**: Verify template/care toggle works

**Steps**:
1. Open any thread
2. Verify composer shows: channel chips, draft textarea, Approve & Send, and "Template & Care ▼" toggle
3. Click "Template & Care" toggle
4. Verify expanded section shows: template selector dropdown and care notes textarea
5. Toggle button now shows "Template & Care ▲"
6. Select a template from dropdown (if templates available)
7. Verify template body appears in draft textarea
8. Edit care notes
9. Click toggle again to collapse
10. Verify template selector and care notes hidden

**Expected Outcomes**:
- Composer default state: template/care hidden, toggle shows ▼
- Expanded state: template/care visible, toggle shows ▲
- Composer height ≤35% when collapsed, ≤50% when expanded
- Template selection works
- Care notes editable

**Success Criteria**: SC-003 (composer ≤35% collapsed, ≤50% expanded)

---

### V5: Redirect Banner Removal

**Goal**: Verify gold/yellow Redirect banner removed from inbox page

**Steps**:
1. Navigate to `http://localhost:3100/inbox`
2. Check for any gold/yellow banner above the navy ops header
3. Verify navy sticky ops header is present and visible
4. Scroll page to verify sticky header behavior (header should stick to top)
5. Check OUTBOUND_MODE via health endpoint or console (if accessible)

**Expected Outcomes**:
- No gold/yellow "Redirect ON" banner visible above or below ops header
- Navy sticky ops header present (from Sprint 3 T / PR #242)
- Ops header contains: GuestFlow logo/title, Inbox/Arrivals/Bookings/Ops nav, Logout
- Redirect behavior still active (OUTBOUND_MODE=redirect, test sinks receive sends)

**Success Criteria**: SC-005 (banner not visible, 0 banner elements in DOM), SC-006 (OUTBOUND_MODE unchanged)

---

### V6: Regression Tests

**Goal**: Verify existing tests pass with compact layout changes

**Steps**:
1. Run TypeScript compilation: `npm run build` (or `tsc --noEmit`)
2. Run unit/integration tests: `npm run test`
3. Check for test failures in:
   - `lib/__tests__/umi-threads.test.ts`
   - `lib/__tests__/umi-inbox-search.test.ts`
   - Any new layout tests in `lib/__tests__/inbox-layout.test.ts`
4. Review test output for assertion failures related to header height, composer height, or message area size

**Expected Outcomes**:
- TypeScript compilation clean (no type errors)
- All existing tests pass
- New layout tests (if added) pass
- No console errors or warnings during test run

**Success Criteria**: SC-008 (existing layout tests pass with updated assertions)

---

### V7: Tablet Responsive Behavior

**Goal**: Verify compact layout works on tablet 768-1199px

**Steps**:
1. Resize browser to 768×1024 (iPad portrait) or use DevTools device emulation
2. Navigate to `http://localhost:3100/inbox`
3. Verify two-pane layout with collapsible list (list toggle button visible)
4. Collapse list via toggle button
5. Verify thread column expands to fill space
6. Open a thread
7. Verify compact header and composer at tablet size

**Expected Outcomes**:
- Tablet shows two-pane layout with collapsible list
- Compact header/composer benefit tablet's limited horizontal space
- List toggle works
- Thread column readable with list collapsed or open

**Success Criteria**: SC-001, SC-002, SC-003 apply at tablet breakpoint

---

## Manual Testing Checklist

Before marking feature complete, verify:

- [ ] Desktop ~1280×800: Message transcript ≥50% thread column height
- [ ] Desktop: Header ≤120px, composer ≤35% collapsed
- [ ] Phone ~390×844: Single pane (list OR thread), Back restores list scroll
- [ ] Phone: Header ≤96px, messages visible without header+composer consuming >50%
- [ ] Details sheet: Opens on desktop (overlay) and phone (bottom sheet), saves contact
- [ ] Composer disclosure: Template & Care toggle works, collapsed by default
- [ ] Redirect banner: Not visible on inbox page
- [ ] Navy sticky ops header: Present and functional
- [ ] OUTBOUND_MODE: Still set to "redirect" (behavior unchanged)
- [ ] TypeScript: `npm run build` or `tsc --noEmit` clean
- [ ] Tests: `npm run test` passes
- [ ] No console errors or warnings
- [ ] No accidental changes to OUTBOUND_MODE, redirect sinks, WhatsApp From number

## Known Limitations

- Template & Care disclosure state does not persist across page refreshes (unless localStorage implemented)
- Details sheet does not show extended booking details beyond contact editing (booking side panel is gap M7, future sprint)
- No automated E2E tests for this feature (manual validation required)

## Deployment Notes

- This feature is UI-only; no database migrations required
- No environment variable changes
- No API contract changes
- Safe to deploy to Preview for GFM acceptance
- Do NOT deploy to Production until Grant CLEAR (standard GuestFlow policy)
