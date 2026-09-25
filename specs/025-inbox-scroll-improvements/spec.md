# Feature Specification: Inbox Scroll and Layout Improvements

**Feature Branch**: `cursor/inbox-scroll-improvements-6349`

**Created**: September 25, 2026

**Status**: Draft

**Input**: User description: "Grant voice 24 Sep 2026 — nested independent scroll sections; some panes too small to read. Fixed shell with overflow hidden + body overflow hidden; list and thread each claim scroll; tall thread header + tall composer (template/care/channel chips/textarea) starve the message transcript; list header stack + chromeOffset leave a short list viewport; keyboard inset shrinks shell further."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Desktop Message Transcript Readability (Priority: P1)

Grant opens GuestFlow inbox on his laptop (~1280×800 viewport) and selects a guest thread with a default draft template. The message transcript must remain readable with sufficient height to review conversation context and compose meaningful responses without constant scrolling.

**Why this priority**: The primary user interaction is reading and responding to guest messages. If the message area is too cramped, Grant cannot effectively review conversation history while drafting responses, leading to slower response times and potential context loss.

**Independent Test**: Can be fully tested by opening a thread on a ~1280×800 desktop viewport with the default composer expanded and measuring the message transcript height. Delivers immediate value by ensuring the core reading/writing workflow is functional.

**Acceptance Scenarios**:

1. **Given** a ~1280×800 laptop viewport with a thread open and default composer (not template-heavy mode), **When** Grant views the message transcript, **Then** the message area is ≥ 240px tall OR ≥ 35% of the inbox shell height
2. **Given** a thread with 10+ messages displayed, **When** Grant scrolls the message transcript, **Then** the scroll operates smoothly without interfering with the list pane scroll
3. **Given** the composer is expanded to 4 rows of text, **When** Grant types a message, **Then** the message transcript remains visible and does not collapse below readable height

---

### User Story 2 - Independent List and Thread Navigation (Priority: P1)

Grant needs to scroll the thread list to find specific conversations while keeping the message transcript independently scrollable. Selecting a new thread must not reset the list scroll position or cause the list to become unusably short.

**Why this priority**: Users frequently switch between threads while triaging. If scrolling is trapped or list position is lost, the workflow becomes frustrating and inefficient. This is a core navigation requirement.

**Independent Test**: Can be fully tested by scrolling the thread list, selecting a thread, reading messages, switching to another thread, and verifying list scroll position is preserved via the existing `LIST_SCROLL_KEY` mechanism.

**Acceptance Scenarios**:

1. **Given** Grant has scrolled the thread list down to thread 15, **When** Grant selects a thread, **Then** the thread opens and the list scroll position is maintained (no jump to top)
2. **Given** the thread view is open with message transcript scrolled to message 5, **When** Grant scrolls the thread list, **Then** only the list scrolls, not the message transcript
3. **Given** Grant returns to the inbox after viewing a thread, **When** the list reappears, **Then** the previous list scroll position is restored using the existing `LIST_SCROLL_KEY` behavior

---

### User Story 3 - Mobile Full-Screen Panes (Priority: P1)

On mobile devices, the list and thread views each need to occupy the full available shell height with one primary scroll per pane. Navigation back from a thread must restore the list scroll position.

**Why this priority**: Mobile users have limited screen space and need efficient single-pane navigation. Cramped or nested scrolls on mobile are unusable.

**Independent Test**: Can be fully tested on a mobile viewport by navigating between list-only and thread-only views, verifying each fills the shell and maintains scroll position on back navigation.

**Acceptance Scenarios**:

1. **Given** a mobile viewport with inbox open, **When** the list view is displayed, **Then** the list fills the full shell height with one scrollable area
2. **Given** a mobile user selects a thread, **When** the thread view opens, **Then** the thread fills the full shell height with the message transcript as the primary scrollable area
3. **Given** a mobile user has scrolled the list, **When** they open a thread and navigate back, **Then** the list scroll position is restored to the previous location

---

### User Story 4 - Composer Space Management (Priority: P2)

The composer must remain usable with minimum touch target sizes (≥44px controls) while not permanently dominating more than 50% of the thread column height on desktop. On short viewports or with keyboard inset, the composer should collapse or cap certain UI elements to preserve message transcript space.

**Why this priority**: The composer is essential for replies but should not overwhelm the message reading area. Users need to see context while typing.

**Independent Test**: Can be fully tested by measuring composer height in various states (default, template-heavy, keyboard visible) and verifying it respects the 50% cap on desktop while maintaining usable controls.

**Acceptance Scenarios**:

1. **Given** a desktop viewport with default composer, **When** Grant opens a thread, **Then** the composer occupies ≤ 50% of the thread column height
2. **Given** a mobile viewport with keyboard visible (`keyboardInsetPx` set), **When** the composer is active, **Then** composer chrome (care banners, template blocks) collapses to preserve message transcript space
3. **Given** a composer with template mode active, **When** the viewport height is reduced, **Then** the composer caps or collapses non-essential UI elements (e.g., template details, care window info) while keeping textarea and send controls usable (≥44px)

---

### User Story 5 - Preserve Existing Functionality (Priority: P1)

All existing soft-inbox features must continue to work, including thread search (PR #228), Approve&Send gates, and `LIST_SCROLL_KEY` scroll restoration.

**Why this priority**: Regressions to existing functionality undermine user trust and workflow stability. This is a non-negotiable requirement for any layout changes.

**Independent Test**: Can be fully tested by running existing test suites for search, Approve&Send flows, and scroll restoration after layout changes are complete.

**Acceptance Scenarios**:

1. **Given** soft-inbox search is used (PR #228 functionality), **When** a user searches for threads, **Then** search results display correctly and selection navigates properly
2. **Given** a draft with Approve&Send gate active, **When** Grant attempts to send, **Then** the approval flow functions as before layout changes
3. **Given** Grant has scrolled the list and selected a thread, **When** Grant returns to the list, **Then** `LIST_SCROLL_KEY` restoration works identically to pre-change behavior

---

### Edge Cases

- What happens when the viewport is extremely narrow (< 375px width)?
- How does the system handle a composer in template-heavy mode on a short laptop height (720px)?
- What happens when a thread has 100+ messages and the user scrolls to the bottom?
- How does the layout behave when `keyboardInsetPx` is very large (e.g., iOS keyboard with suggestion bar)?
- What happens if the thread header has extra-tall content (e.g., long property names or multi-line channel tags)?
- How does the layout recover if JavaScript scroll restoration fails or `LIST_SCROLL_KEY` is unavailable?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST ensure the message transcript area is ≥ 240px tall OR ≥ 35% of inbox shell height on ~1280×800 desktop viewports with default composer
- **FR-002**: System MUST provide independent scrolling for the thread list and the message transcript without scroll interference or focus trapping
- **FR-003**: System MUST preserve thread list scroll position when selecting threads, using the existing `LIST_SCROLL_KEY` mechanism
- **FR-004**: System MUST ensure composer controls remain usable (≥44px touch targets) while capping composer total height to ≤50% of thread column on desktop
- **FR-005**: System MUST collapse or cap composer chrome (care banners, template blocks, textarea rows) on short viewports or when `keyboardInsetPx` reduces available space
- **FR-006**: System MUST ensure mobile list-only and thread-only views each fill the full shell height with one primary scrollable area per pane
- **FR-007**: System MUST restore list scroll position on back navigation from thread view on mobile
- **FR-008**: System MUST NOT regress soft-inbox search functionality (PR #228)
- **FR-009**: System MUST NOT regress Approve&Send gate behavior
- **FR-010**: System MUST avoid creating a third nested scroll container inside the message transcript (prefer one primary scroll per pane)
- **FR-011**: System MUST re-evaluate `useInboxChromeOffset` hook to avoid double-counting operations nav height with fixed shell
- **FR-012**: System SHOULD support optional collapsible thread header facts/channel line to recover vertical space on short viewports
- **FR-013**: System MUST NOT modify soft-inbox search SQL unless layout changes require touching the same files (prefer no SQL changes)
- **FR-014**: System MUST NOT change auto-send or outbound redirect logic
- **FR-015**: System MUST NOT introduce brand fonts (Montserrat/Playfair) in this feature

### Key Entities *(include if feature involves data)*

- **Inbox Shell**: The fixed-position container bounded by `chromeOffset` (top) and `keyboardInsetPx` (bottom), managing overall inbox layout
- **Thread List Pane**: Independently scrollable pane with sticky header (title/refresh/search/"Needs attention") and flex-1 overflow-y-auto thread list
- **Thread Pane**: Layout shell containing shrink-0 header, flex-1 overflow-y-auto message transcript, and shrink-0 composer footer
- **Message Transcript**: The primary scrollable message area within the thread pane
- **Composer Footer**: The reply interface with channels, care window, template block, textarea, and Approve&Send controls
- **List Scroll Key**: The existing `LIST_SCROLL_KEY` mechanism for persisting and restoring thread list scroll position

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On ~1280×800 desktop viewports, message transcript height is measured at ≥240px or ≥35% of shell height with default composer, passing visual regression tests
- **SC-002**: Scroll independence verified: scrolling thread list does not affect message transcript scroll position and vice versa, confirmed by automated scroll event testing
- **SC-003**: List scroll position restoration tested across 10+ thread selections without position loss or jumps, using existing `LIST_SCROLL_KEY` mechanism
- **SC-004**: Composer height on desktop does not exceed 50% of thread column in default state, verified by layout measurement tests
- **SC-005**: Mobile list-only and thread-only views each fill 100% of available shell height (measured via layout tests) with one primary scroll per view
- **SC-006**: Existing soft-inbox search tests (PR #228) pass without modification after layout changes
- **SC-007**: Existing Approve&Send gate tests pass without modification after layout changes
- **SC-008**: Composer remains usable on short viewports: touch targets ≥44px, composer collapses non-essential chrome when `keyboardInsetPx` or viewport height is reduced
- **SC-009**: No third nested scroll container introduced within message transcript area, confirmed by DOM structure inspection
- **SC-010**: Add a lightweight layout assertion (unit or e2e test) that validates minimum message pane height on a reference viewport

## Assumptions

- Users primarily access GuestFlow inbox on desktop (~1280×800) and mobile devices (375-428px wide)
- The existing `LIST_SCROLL_KEY` scroll restoration mechanism is reliable and will continue to be used
- The `useInboxChromeOffset` hook provides the top offset for the fixed inbox shell and may need adjustment if operations nav height is being double-counted
- `keyboardInsetPx` is dynamically set by existing mobile keyboard detection and will continue to be available
- Soft-inbox search (PR #228) and Approve&Send gates are existing features with test coverage that should not regress
- The `InboxLayoutShell` and `ThreadLayoutShell` components are the primary layout owners, with `.inbox-shell` CSS class defining the fixed shell behavior
- Template-heavy composer mode and care window banners are optional UI elements that can be collapsed or capped on short viewports
- Brand fonts (Montserrat/Playfair) are out of scope per separate Design CLEAR track and should not be introduced
- Production deployment requires GuestFlow Manager Preview PASS and is not performed by this agent (draft PR only)
- The message transcript is the primary content area users need to read, and composer is secondary (but still essential)
- Desktop users expect to see both list and thread panes simultaneously; mobile users expect single-pane full-screen views
- Performance of scroll restoration and layout calculations should not introduce noticeable lag (< 100ms)
