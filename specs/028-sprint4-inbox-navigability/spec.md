# Feature Specification: Sprint 4 Inbox Navigability and Redirect Banner Removal

**Feature Branch**: `cursor/sprint4-inbox-navigability-a224`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "Sprint 4 items 1 + 2 for GuestFlow (`apps/guestflow`): Inbox navigability (compact thread header, compact composer, transcript as primary scroll) and remove yellow Redirect strip visual banner while keeping redirect behavior unchanged."

## Operator Jobs & Acceptance Criteria *(mandatory)*

### Item 1: Inbox Navigability

**Operator Job**: Staff on desktop (~1280) and phone (~390) can triage from the list, open a thread, read the transcript as the primary surface, and reply via channel+draft+Approve&Send without the header/contact Save or composer eating the chat (compact header ~1–2 lines; contact edit in Details/modal; template/care disclosed; #235 floors kept).

**Proxy ACs**:
- Desktop ~1280×800: message transcript ≥50% of thread column height
- Thread header height ≤120px collapsed
- Composer ≤35% collapsed, ≤50% expanded (existing #235 floor maintained)
- Phone ~390×844: single pane (list OR thread), Back restores list scroll
- Contact editing accessible ≤2 clicks from thread view
- TypeScript compilation clean (`tsc --noEmit`)
- Existing layout tests pass with updated assertions

**Operator-Job AC**: Staff can fluently triage → read → reply on desktop and phone. Transcript is primary scroll surface. Header/composer compact enough that reading messages doesn't require constant scrolling away from context. Contact editing reachable without blocking chat. Daily workflow feels fluid, not cramped.

### Item 2: Remove Yellow Redirect Strip

**Operator Job**: Staff see no gold/yellow Redirect ON banner above the navy sticky ops header on desktop and phone; redirect **behavior** remains ON (OUTBOUND_MODE/sinks unchanged); sticky navy header still works.

**Proxy ACs**:
- Gold/yellow Redirect banner not visible (0 banner elements in DOM)
- Navy sticky ops header present and functional
- OUTBOUND_MODE environment variable still "redirect"
- Redirect sinks unchanged (test email/WhatsApp destinations)
- `useInboxChromeOffset` correctly calculates offset without banner

**Operator-Job AC**: Staff open inbox on desktop and phone, see clean navy header without gold banner above it. Ops nav (Inbox/Arrivals/Bookings/Ops/Logout) accessible. Redirect behavior confirmed ON via health check or actual Approve&Send (goes to test sink). No visual clutter from removed banner.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff reads guest message history without vertical scrolling wars (Priority: P1)

Staff member opens a guest conversation thread to read message history and context before responding. The message transcript should be the primary, easily scrollable surface without competing with header and composer for vertical space.

**Why this priority**: Core navigability issue blocking efficient triage → read → reply workflow. Current three-section layout starves the transcript, making it difficult to read conversation context.

**Independent Test**: Open any guest thread on desktop (~1280px) and phone (~390px). Message transcript should occupy the majority of vertical space (≥50% on desktop, visible without scrolling away header/composer on phone). Staff can scroll through message history smoothly without nested scroll conflicts.

**Acceptance Scenarios**:

1. **Given** staff opens a guest thread on desktop, **When** viewing the thread layout, **Then** message transcript is the tallest of the three thread bands (header, messages, composer) and occupies at least 50% of the thread column height
2. **Given** staff opens a guest thread on phone, **When** viewing the thread, **Then** messages are visible and scrollable without the header and composer consuming more than 50% of viewport combined
3. **Given** staff scrolls through message history, **When** using mouse wheel or touch scroll, **Then** only the message transcript scrolls (no competing scroll owners)

---

### User Story 2 - Staff views compact thread header with guest identity (Priority: P1)

Staff needs to quickly identify which guest conversation they're viewing, but doesn't need full booking details and contact editing forms visible at all times in the thread header.

**Why this priority**: Current tall header with inline Staff phone/email Save consumes excessive vertical space and competes with reading messages. Moving contact editing to a details sheet/modal allows focus on the conversation.

**Independent Test**: Open any guest thread. Header should display ~1-2 lines of identity (guest name, suite, dates, NB ref) without inline contact editors. Staff phone/email Save should be accessible via Details sheet or Edit contact modal, not permanently in the default header band.

**Acceptance Scenarios**:

1. **Given** staff opens a guest thread, **When** viewing the header, **Then** header displays guest name, suite, date range, and NB reference in a compact format (≤96-120px height)
2. **Given** staff needs to edit contact information, **When** they access the details/edit control, **Then** Staff phone/email fields and Save contact are available in a Details sheet or Edit contact modal (not in default header band)
3. **Given** thread header is compact, **When** more booking details are needed, **Then** staff can expand or open details without blocking message reading

---

### User Story 3 - Staff composes reply with collapsed composer (Priority: P1)

Staff needs to compose and send guest messages, but the composer shouldn't dominate vertical space when not actively writing long drafts. Channel selection, draft text, and Approve&Send should be immediately visible, with template/care controls behind disclosure.

**Why this priority**: Current tall composer can consume up to 50% of thread column, especially on phone with keyboard. Collapsing template/care controls behind disclosure frees vertical space for reading messages while keeping essential compose controls accessible.

**Independent Test**: Open any guest thread. Composer should show channel chips, draft textarea, and Approve&Send button by default, with template selector and care/window notes behind a disclosure/toggle. Composer should not exceed 50% of thread column height (existing floor from #235).

**Acceptance Scenarios**:

1. **Given** staff views a thread, **When** composer is in default state, **Then** channel chips, draft textarea, and Approve&Send are visible while template selector and care notes are behind disclosure
2. **Given** staff opens template/care disclosure, **When** expanded, **Then** additional controls appear but composer still respects ≤50% max height constraint
3. **Given** staff on phone with keyboard visible, **When** typing in draft, **Then** composer plus keyboard respects existing floor (messages ≥240px or ≥35% of shell)

---

### User Story 4 - Staff navigates between thread list and conversation on phone (Priority: P2)

On phone (~390px), staff needs to navigate from the conversation list to a specific thread, read/reply, then return to the list with scroll position preserved.

**Why this priority**: Maintains existing phone navigation pattern from specs 022/025 and PR #235/#242. Critical for mobile workflow but already implemented - this story ensures we don't regress during navigability improvements.

**Independent Test**: On phone, navigate from list to thread via tap, use Back button or browser back to return to list. List scroll position should be preserved. URL should reflect `?thread=<id>` when thread is open.

**Acceptance Scenarios**:

1. **Given** staff views conversation list on phone, **When** they tap a thread, **Then** thread view replaces list (single pane) and URL updates to `/?thread=<id>`
2. **Given** staff is viewing a thread on phone, **When** they tap Back or use browser back, **Then** list view is restored with previous scroll position (via LIST_SCROLL_KEY)
3. **Given** staff shares a thread URL, **When** another staff member opens `/?thread=<id>`, **Then** thread opens directly on phone (single pane) or in thread column on desktop

---

### User Story 5 - Staff views inbox without yellow Redirect banner (Priority: P2)

Staff member accesses the inbox and sees the familiar sticky navy ops header without the gold/yellow "Redirect ON" visual banner above it. Redirect behavior remains active (test sinks still receive sends), but the visual chrome is removed.

**Why this priority**: Visual cleanup requested by Grant. The banner is no longer necessary but redirect behavior must remain unchanged until a separate go-live CLEAR.

**Independent Test**: Open inbox on desktop and phone. Gold/yellow "Redirect ON" banner above navy ops header should not be visible. Navy sticky ops header from Sprint 3 T (PR #242) should remain. Redirect behavior should still route sends to test sinks (verify via health/status check, not actual send).

**Acceptance Scenarios**:

1. **Given** staff opens inbox on desktop, **When** page loads, **Then** no gold/yellow Redirect banner is visible above the navy ops header
2. **Given** staff opens inbox on phone, **When** page loads, **Then** no gold/yellow Redirect banner is visible and sticky navy ops header is present
3. **Given** redirect behavior check, **When** checking OUTBOUND_MODE or health endpoint, **Then** redirect behavior remains ON (not changed)

---

### Edge Cases

- What happens when a thread has no messages (Window closed, new booking)? Empty state should display friendly message in transcript area; composer still accessible.
- How does the system handle extremely long message threads? Transcript scroll performance must remain smooth; virtualization may be needed for 100+ messages.
- What happens when staff phone/email fields are empty? Details/Edit modal should allow adding contact info; no validation errors on empty state.
- How does composer behave on very short viewport (phone landscape)? Existing #235 floors apply: messages ≥240px minimum; composer respects max 50% even when keyboard is visible.
- What happens on tablet breakpoint (768-1199)? Two-pane collapsible list behavior from InboxLayoutShell should apply with same navigability improvements.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Thread header MUST display guest identity in a compact format (≤96-120px height collapsed) showing guest name, suite, date range, and NB reference
- **FR-002**: Staff phone and Staff email input fields with Save contact button MUST be moved out of the default thread header band to a Details sheet or Edit contact modal
- **FR-003**: Composer MUST show channel chips, draft textarea, and Approve&Send button in default collapsed state
- **FR-004**: Template selector and care/window notes MUST be behind a disclosure/toggle control (not always visible)
- **FR-005**: Message transcript MUST be the primary scroll surface in the thread column with no competing nested scroll owners
- **FR-006**: Message transcript MUST occupy the majority of thread column vertical space (target: messages are visibly taller than header + composer combined on desktop)
- **FR-007**: Composer MUST respect existing max height constraint of ≤50% of thread column (from #235)
- **FR-008**: Message area MUST respect existing min height constraints (≥240px or ≥35% of shell from #235)
- **FR-009**: Phone navigation MUST maintain single-pane stack (list OR thread, not simultaneous) with `?thread=<id>` URL state
- **FR-010**: Phone Back (browser back and UI Back button) MUST restore list view with preserved scroll position via LIST_SCROLL_KEY
- **FR-011**: Desktop MUST maintain two-pane layout (list | thread) with compact navigability improvements
- **FR-012**: Gold/yellow "Redirect ON" visual banner above navy ops header MUST be removed from inbox page
- **FR-013**: Navy sticky ops header (from Sprint 3 T / PR #242) MUST remain visible and functional
- **FR-014**: Redirect behavior (OUTBOUND_MODE, redirect sinks) MUST remain unchanged (not modified by this feature)
- **FR-015**: Approve&Send human gate MUST remain unchanged (no auto-send added)
- **FR-016**: WhatsApp From number (`+27600200825`) MUST remain unchanged
- **FR-017**: Brand colors MUST follow existing tokens: navy `#0A3775` for primary CTAs (Approve&Send), gold `#FAC72E` only for redirect chrome (if any remains elsewhere), accent `#DCE8F9` for selection wash

### Key Entities *(include if feature involves data)*

- **Thread**: Guest conversation with identity (name, suite, dates, NB ref), message history, and compose state
- **ThreadHeader**: Compact component displaying guest/booking identity, with optional Details/Edit access
- **Composer**: Message composition component with channels, draft, Approve&Send, and optional template/care disclosure
- **MessageTranscript**: Primary scrollable message history surface within thread column

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On desktop ~1280px with thread open, message transcript occupies at least 50% of thread column height (visibly taller than header and composer combined)
- **SC-002**: Thread header height in collapsed state is ≤120px (target 96px or ~2 lines of identity)
- **SC-003**: Composer in default collapsed state (template/care hidden) is ≤35% of thread column height on desktop, ≤50% maximum when expanded
- **SC-004**: Phone ~390px shows only one pane (list OR thread) at a time with Back successfully restoring list scroll position in 100% of navigation cycles
- **SC-005**: Gold/yellow Redirect banner is not visible on inbox page (0 banner elements found in DOM) while navy sticky ops header remains present
- **SC-006**: Redirect behavior verification: health/status check confirms OUTBOUND_MODE and redirect sinks unchanged from pre-implementation state
- **SC-007**: Staff can access contact editing (Staff phone/email Save) within 2 clicks/taps from thread view (Details sheet or Edit modal opens successfully)
- **SC-008**: All existing layout tests from specs 022/025 and Sprint 3 T+U pass with updated assertions for compact header/composer

## Assumptions

- Desktop breakpoint is ≥1200px, tablet is 768-1199px, phone is <768px (from InboxLayoutShell existing implementation)
- Existing floor constraints from PR #235 (messages ≥240px/≥35%, composer ≤50%) are retained as regression prevention
- Details sheet or Edit contact modal implementation can be simple (no complex booking CRM side panel needed yet - that's gap M7/Sprint 4 candidate F)
- Template selector and care/window notes can be collapsed behind a single disclosure control (e.g., "Template & Care" toggle button)
- Phone Back relies on existing LIST_SCROLL_KEY mechanism from PR #235/spec 022
- Sticky ops header implementation from Sprint 3 T/PR #242 is not modified (only Redirect banner removal below it)
- No new brand tokens are introduced; all colors use existing Browns tokens from `guestflow-brand/proposal-2026-09-24/tokens/tokens.json`
- No changes to OUTBOUND_MODE environment variable, redirect sink configuration, WhatsApp From number, or auto-send behavior
- Approve&Send human gate confirmation dialog remains unchanged
- No actual sends are performed during testing (Redirect ON ensures test sinks receive any Approve&Send actions)
- TypeScript compilation (`tsc --noEmit`) is clean for all modified packages
- Existing unit and layout tests are updated to reflect new compact header/composer contracts
