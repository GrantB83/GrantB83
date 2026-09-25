# Feature Specification: Sprint 3 Sticky Header and Mobile Inbox Width

**Feature Branch**: `cursor/027-sprint3-sticky-header-mobile-0f4e`

**Created**: September 25, 2026

**Status**: Draft

**Input**: GuestFlow Sprint 3 items T (sticky ops/page header while inbox scrolls) and U (wider usable mobile inbox panes). Origin: Design review #229 missed items. Inbox nested-scroll PR #235 shipped height floors / independent pane scroll / Back list-scroll restore only — it did not close sticky header or mobile pane width.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sticky staff chrome while inbox panes scroll (Priority: P1)

On the authenticated soft inbox `/`, Grant or staff scroll the thread list or the message transcript. The navy ops/page header and the Outbound Redirect banner/control stack stay on screen. Redirect state remains reachable without scrolling back to the top of the page.

**Why this priority**: Stay-morning triage is inbox-first. If Redirect state and ops chrome disappear, staff lose the safety signal and must fight the page to recover it. This is the Sprint 3 T gap after #229 and #235.

**Independent Test**: Open `/?fixture=1` on desktop (~1280×800) and phone (~390×844). Scroll the list pane and the thread pane. Confirm the navy header plus Redirect banner/control remain visible and tappable while only the inbox panes move.

**Acceptance Scenarios**:

1. **Given** an authenticated staff session on `/` with Redirect ON, **When** staff scroll the inbox list, **Then** the navy ops header and Redirect banner/control remain visible at the top of the viewport
2. **Given** a thread is open, **When** staff scroll the message transcript, **Then** the same chrome stack stays visible and the Redirect control remains reachable without scrolling the page back to top
3. **Given** desktop and phone viewports, **When** staff scroll an inbox pane, **Then** there is one primary scroll per pane and no new dual-scroll fight between the outer page and the panes

---

### User Story 2 - Preserve #235 height floors without double-counting sticky chrome (Priority: P1)

Sticky chrome must not steal message height twice. Shell dimension helpers continue to subtract the visible chrome stack once. Existing #235 floors still hold.

**Why this priority**: A sticky header that is also counted as document flow padding would shrink the transcript below the #235 contract and recreate the cramped-pane failure.

**Independent Test**: At ~1280×800 with default composer, measure message area and composer against the #235 floors. Confirm chrome offset equals the sticky stack height once (not nav height plus the same stack again).

**Acceptance Scenarios**:

1. **Given** a ~1280×800 laptop viewport with a thread open and default composer, **When** staff view the message transcript, **Then** the message area is ≥ 240px tall OR ≥ 35% of the inbox shell height
2. **Given** the same desktop viewport, **When** the composer is shown, **Then** the composer occupies ≤ 50% of the thread column height
3. **Given** sticky chrome is enabled, **When** shell height is calculated, **Then** sticky header height is subtracted once and is not added again as page padding inside the inbox shell

---

### User Story 3 - Wider usable phone list and thread (Priority: P1)

On a phone-width staff inbox (~390 CSS px), the list search / needs-attention stack, list message preview, thread header box, and transcript bubbles use the full shell width minus necessary chrome. Phantom empty gutters do not eat the preview.

**Why this priority**: Sprint 3 U. #235 passed phone height and Back restore; Grant’s phone-width use is still too narrow to read.

**Independent Test**: Open `/?fixture=1` at ~390×844. Photograph the phone list and phone thread. Confirm preview text and the box above it are readable and tappable across nearly the full shell width.

**Acceptance Scenarios**:

1. **Given** a ~390×844 phone viewport on the list pane, **When** staff view a thread row, **Then** the message preview and the search / needs-attention stack above it are readable and tappable across the shell minus necessary chrome
2. **Given** the same phone viewport on the thread pane, **When** staff view the thread header and a message bubble, **Then** the header box and transcript use the full shell width minus necessary chrome with no phantom empty gutters
3. **Given** phone list and thread panes, **When** layout is measured, **Then** usable content width is at least 90% of the inbox shell width

---

### User Story 4 - Preserve Back list-scroll, Approve&Send, and inbox contracts (Priority: P1)

Sticky chrome and wider phone panes must not regress #235 independent scroll, Back restore via `LIST_SCROLL_KEY`, Approve&Send visibility, or outbound From identity.

**Why this priority**: T and U are chrome-only. A layout fix that hides Approve&Send or loses list position recreates stay-morning labour.

**Independent Test**: On phone, scroll the list, open a thread, tap Back. Confirm list scroll restores. Confirm Approve&Send remains visible. Confirm no auto-send and no From-number change.

**Acceptance Scenarios**:

1. **Given** a phone user has scrolled the list, **When** they open a thread and navigate Back, **Then** the list scroll position is restored using the existing `LIST_SCROLL_KEY` behavior
2. **Given** a thread with a draft, **When** staff view the composer on phone or desktop, **Then** Approve&Send remains visible and the confirmToken gate is unchanged
3. **Given** this feature is shipped, **When** outbound identity is inspected, **Then** WhatsApp From remains `+27600200825`, Redirect stays ON, and no auto-send path is introduced

---

### Edge Cases

- Redirect banner hidden (Redirect OFF): sticky stack is navy header only; chrome offset shrinks; inbox shell moves up; floors still hold
- Mobile hamburger open: expanded nav is part of the sticky stack; chrome offset grows; panes shrink rather than scrolling under the menu
- On-screen keyboard: existing keyboard inset still reduces shell from the bottom; sticky header stays at the top; composer collapse rules from #235 remain
- Short desktop viewport below 800px: message floor of 240px or 35% still applies; sticky chrome is not double-counted
- Guest routes and `/staff-login`: staff chrome stays hidden (existing rule)
- Non-inbox staff pages (`/ops`, bookings): sticky chrome must not cover page content; those pages keep a single top offset, not an inbox shell

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Staff ops/page header and Outbound Redirect banner/control MUST remain visible (sticky or fixed) while inbox list and thread panes scroll on `/`
- **FR-002**: Inbox chrome offset helpers MUST measure the sticky chrome stack once and MUST NOT double-count that height when positioning the inbox shell or computing #235 floors
- **FR-003**: Desktop and phone inbox MUST keep one primary scroll per visible pane and MUST NOT introduce a new outer-page versus pane dual-scroll fight
- **FR-004**: At phone width (~390 CSS px), list preview, list header stack, thread header box, and transcript MUST use the full inbox shell width minus necessary chrome
- **FR-005**: Phone usable content width MUST be at least 90% of the inbox shell width
- **FR-006**: Existing #235 height floors MUST hold (~1280×800: messages ≥240px or ≥35% of shell; composer ≤50% of thread column)
- **FR-007**: Back from phone thread MUST continue to restore list scroll via `LIST_SCROLL_KEY`
- **FR-008**: Approve&Send MUST remain visible; confirmToken / no-auto-send behavior MUST NOT change
- **FR-009**: Official WhatsApp From MUST stay `+27600200825`; Redirect go-live, Ultra meter, and stay@ From flip are out of scope
- **FR-010**: Brand token restyle beyond sticky behaviour and width/gutter fixes is out of scope
- **FR-011**: Guest routes and staff-login MUST continue to hide staff chrome
- **FR-012**: Screenshots of phone list and phone thread at ~390×844 MUST be captured before merge for GFM Preview ACCEPT

### Key Entities

- **Ops chrome stack**: The authenticated navy header plus Redirect banner/control shown to staff. Attributes: visibility (shown/hidden by route and Redirect state), measured height, sticky/fixed attachment to the viewport top
- **Inbox shell**: Fixed remaining viewport under the chrome stack. Attributes: top offset (chrome height once), bottom inset (keyboard), independent list and thread scrollers
- **Phone pane content**: List header stack, list row preview, thread header box, and message bubbles. Attribute: usable content width relative to shell width

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After scrolling an inbox pane, staff can still see and use Redirect state without scrolling the page back to top (100% of desktop and phone fixture checks)
- **SC-002**: On ~1280×800, message transcript remains ≥240px or ≥35% of shell and composer remains ≤50% of the thread column
- **SC-003**: On ~390×844, list preview and thread header/transcript occupy at least 90% of shell width and remain readable without pinch-zoom
- **SC-004**: Phone Back restores the prior list scroll position on every fixture trial
- **SC-005**: Staff no longer lose Redirect visibility or readable preview during stay-morning phone triage (ritual removed: scroll-to-top plus pinch-to-read)

## Assumptions

- T and U ship together because both change inbox chrome measurement and pane box model
- #235 Production squash `e068438` is already on `main` (height floors, independent pane scroll, `LIST_SCROLL_KEY`)
- Fixture mode `/?fixture=1` is the safe visual proof path (invented guests only)
- Redirect remains ON in Preview/Production until a separate go-live CLEAR
- Draft PR only; GFM Preview ACCEPT is the merge gate
- Optional composer/thread-header collapses are used only if needed to free width/height without hiding Approve&Send
