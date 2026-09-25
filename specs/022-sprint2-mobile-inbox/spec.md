# Feature Specification: Sprint 2 Mobile-Friendly Inbox

**Feature Branch**: `cursor/sprint2-mobile-inbox-7d95`

**Created**: 2026-09-25

**Status**: Ready for planning

**Input**: Queued CA #7 mobile inbox brief (Grant voice via GFM, 24 Sep 18:31 CT, Sprint 2) plus Grant’s Sprint 2 wording: on phone the thread is full screen with pinned guest details (name, booking/suite, dates, channel) and the reply box pinned at the bottom; tablet is two-panel; desktop is unchanged. UI only. No API or send-behaviour changes. Parallel PRs will add a window badge, delivery-status bubbles, and a header redirect toggle to the same thread UI.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Phone single-pane inbox with back and scroll restore (Priority: P1)

On a phone, staff see the thread list full width. Tapping a thread opens that conversation full screen. A back control and the browser back gesture return to the list at the same scroll position. The first thread is not auto-opened.

**Why this priority**: Today the inbox is a fixed two-pane with a capped list. On a 360px phone the list and thread fight for width, so staff cannot work a stay from their pocket.

**Independent Test**: Open the inbox at 360×800 and 390×844. Confirm only the list is visible. Tap a thread. Confirm the list is replaced by the thread. Use in-app back and browser back. Confirm the list reappears at the prior scroll offset.

**Acceptance Scenarios**:

1. **Given** a phone-width viewport and a list of threads, **When** staff open Inbox, **Then** they see a full-width list and do not automatically land inside a thread
2. **Given** the list, **When** they tap a thread, **Then** the conversation fills the screen and a back control is visible
3. **Given** an open thread, **When** they tap back or use browser back, **Then** they return to the list at the same scroll position
4. **Given** a phone-width viewport, **When** they rotate or resize still below the tablet breakpoint, **Then** the single-pane behaviour remains

---

### User Story 2 - Pinned guest details and pinned reply on the phone thread (Priority: P1)

On a phone, guest facts stay pinned at the top of the thread: name, booking/suite, stay dates, and channel. The reply box and Approve&Send stay pinned at the bottom, above the on-screen keyboard and above the home-indicator safe area. Message history scrolls between those two pins.

**Why this priority**: Staff cannot approve a guest reply if they lose the stay identity or the composer slips under the keyboard.

**Independent Test**: Open a thread at 360×800 and 390×844. Confirm the header remains visible while the timeline scrolls. Focus the draft field with a simulated keyboard inset. Confirm the composer and Approve&Send remain fully on screen.

**Acceptance Scenarios**:

1. **Given** an open phone thread, **When** staff scroll the message list, **Then** name, booking/suite, dates, and channel stay pinned at the top
2. **Given** an open phone thread, **When** they focus the draft field, **Then** the composer and Approve&Send stay above the keyboard and the safe-area inset
3. **Given** a long URL or email in a bubble or the draft, **When** the thread renders at 360px, **Then** the text wraps and the page does not scroll sideways
4. **Given** the header, **When** staff look at the pinned facts, **Then** they see name, booking/suite, dates, and channel from stored thread facts only

---

### User Story 3 - Tablet two-panel, desktop unchanged (Priority: P2)

On a tablet, staff keep a two-panel inbox with a narrower or collapsible list beside the thread. On a desktop, the existing two-panel layout (list capped, thread filling the remainder) stays as it is today.

**Why this priority**: Tablet is the stay-morning surface for some staff; desktop must not regress.

**Independent Test**: Open Inbox at 768×1024 and confirm two panels with a narrower/collapsible list. Open Inbox at 1280×800 and confirm the current desktop two-panel proportions.

**Acceptance Scenarios**:

1. **Given** a tablet-width viewport, **When** staff open Inbox, **Then** they see a list panel and a thread panel at the same time
2. **Given** a tablet-width viewport, **When** the list would crowd the thread, **Then** the list is narrower than desktop and can be collapsed
3. **Given** a desktop-width viewport, **When** staff open Inbox, **Then** the list remains the familiar capped width and the thread fills the rest

---

### User Story 4 - Thumb-sized, 360px-safe controls (Priority: P1)

Every primary control is easy to tap. Body and input text stay large enough that a phone does not zoom into fields. Channel badges, Needs attention, search, the compact redirect notice, and the confirm prompt all fit a 360px-wide screen. The existing hamburger still opens staff navigation.

**Why this priority**: Small text, tiny taps, and a wide confirm prompt are the current phone failure modes.

**Independent Test**: At 360×800, tap search, Needs attention, a thread row, hamburger, channel chips, Save draft, and Approve&Send. Confirm no control is smaller than a thumb target. Confirm the redirect notice is visible and compact. Confirm the confirm prompt fits the screen.

**Acceptance Scenarios**:

1. **Given** a 360px-wide inbox, **When** staff view the list, **Then** search, Needs attention, channel badges, and thread rows fit without horizontal scroll
2. **Given** the same viewport, **When** they open the hamburger, **Then** the existing staff destinations appear and remain usable
3. **Given** the redirect notice is on, **When** they view Inbox on a phone, **Then** the notice is visible and compact
4. **Given** they start Approve&Send, **When** the confirm prompt appears, **Then** the full prompt and both actions fit the phone
5. **Given** any primary control, **When** staff aim with a thumb, **Then** the tap target is at least 44px in both dimensions
6. **Given** the search field or draft box, **When** they focus it, **Then** the text size is at least 16px so the phone does not zoom

---

### User Story 5 - Same Approve&Send and rebase-safe thread slots (Priority: P1)

Approve&Send still requires the human confirm step and the existing one-time confirm token. Nothing is auto-sent. The thread chrome exposes empty, named slots so later work can drop in a window badge, per-bubble delivery status, and a header redirect toggle without rewriting the layout.

**Why this priority**: Safety must not change. Parallel Sprint 2 PRs touch the same thread; a slot shell avoids rebase churn.

**Independent Test**: Trigger Approve&Send on a fixture thread. Confirm the same confirm copy, approve, confirm-token, and send sequence. Inspect the thread header and bubbles for named slots that later work can fill.

**Acceptance Scenarios**:

1. **Given** a draft, **When** staff tap Approve&Send and confirm, **Then** the existing approve → confirm-token → send sequence runs and nothing is auto-sent
2. **Given** they cancel the confirm prompt, **When** they return to the thread, **Then** no send is attempted
3. **Given** the thread header, **When** later work adds a window badge, **Then** it can occupy the header badge slot without moving guest facts
4. **Given** a message bubble, **When** later work adds delivery status, **Then** it can occupy the bubble status slot
5. **Given** the thread header, **When** later work adds a redirect toggle, **Then** it can occupy the header actions slot

---

### Edge Cases

- Empty inbox: list empty-state still fits 360px; thread pane shows a select prompt on tablet/desktop and stays hidden on phone
- Unmatched temp thread: Link-to-booking controls wrap inside the pinned header without overflowing
- Very long booker names, suite names, booking ids, URLs, and emails wrap; they never force sideways scroll
- Browser back from a deep-linked phone thread returns to the list, not off the site, when the list was the previous inbox view
- Keyboard open plus home-indicator inset: composer stays fully visible
- Redirect notice hidden (live mode): layout still pins header and composer correctly
- Parallel slot content absent: empty slots take no meaningful space and do not shift the layout

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On viewports narrower than 768px, Inbox MUST show a single pane: list or thread, never both
- **FR-002**: On phone, tapping a thread MUST open that thread full screen with a back control
- **FR-003**: On phone, in-app back and browser back MUST return to the list and restore the list scroll position
- **FR-004**: On phone, Inbox MUST NOT auto-open the first thread
- **FR-005**: On phone, the thread header MUST stay pinned and MUST show guest name, booking/suite, stay dates, and channel
- **FR-006**: On phone, the composer and Approve&Send MUST stay pinned at the bottom above the on-screen keyboard and the safe-area inset
- **FR-007**: On viewports 768–1199px, Inbox MUST show two panels with a narrower or collapsible list
- **FR-008**: On viewports 1200px and wider, Inbox MUST keep the current two-panel layout (capped list, thread filling the remainder)
- **FR-009**: Body and input text on Inbox MUST be at least 16px
- **FR-010**: Primary Inbox tap targets (hamburger, back, thread rows, filter, channel chips, Save draft, Approve&Send, confirm actions) MUST be at least 44×44px
- **FR-011**: Long text, URLs, and emails MUST wrap so Inbox has no horizontal overflow at 360px
- **FR-012**: Channel badges, Needs attention, and search MUST fit a 360px-wide list
- **FR-013**: The outbound redirect notice MUST remain visible when active and MUST be compact on phone
- **FR-014**: The existing hamburger navigation MUST continue to open the current staff destinations
- **FR-015**: Approve&Send MUST keep the current human confirm plus confirm-token sequence; Approve-only MUST NOT send; nothing auto-sends
- **FR-016**: The confirm prompt MUST fit a phone viewport
- **FR-017**: The thread layout MUST expose a header badge slot, a per-bubble status slot, and a header actions slot for later window-badge, delivery-status, and redirect-toggle work
- **FR-018**: This feature MUST NOT change Inbox APIs, send sinks, or outbound behaviour
- **FR-019**: Screenshot and accessibility evidence MUST use seeded or mock guest data only — never real guest PII
- **FR-020**: The production build MUST typecheck; TypeScript build errors MUST NOT be ignored

### Key Entities

- **Inbox list pane**: Full-width on phone; narrower/collapsible on tablet; capped width on desktop
- **Thread pane**: Full-screen on phone; companion panel on tablet and desktop
- **Pinned guest header**: Name, booking/suite, dates, channel, plus empty badge and actions slots
- **Message bubble**: Existing channel-badged body plus an empty status slot
- **Pinned composer**: Draft field, channel chips, Save draft, Approve&Send
- **Confirm prompt**: Phone-fitting stand-in for today’s confirm step; same decision and same send sequence
- **Layout slots**: Header badge slot, bubble status slot, header actions slot — empty in this change

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can complete list → thread → back on a 360-wide phone without losing list place
- **SC-002**: On a 360-wide phone, staff can see pinned guest facts and the reply box at the same time, including when the keyboard is open
- **SC-003**: Inbox shows no sideways scroll at 360×800, 390×844, 768×1024, or 1280×800 for list, thread, draft-with-keyboard, or confirm
- **SC-004**: Every primary Inbox control is thumb-sized (at least 44px) and body/input text is at least 16px
- **SC-005**: Staff can Approve&Send with the same confirmation and one-time token sequence as today; cancel sends nothing
- **SC-006**: An accessibility review of Inbox on a phone scores at least 90
- **SC-007**: Later window-badge, delivery-status, and redirect-toggle work can land in named slots without rewriting the thread shell
- **SC-008**: Evidence screenshots exist for list, thread, draft-with-keyboard, and confirm at 360×800, 390×844, 768×1024, and 1280×800 using mock guests only

## Assumptions

- Breakpoints: phone <768px, tablet 768–1199px, desktop ≥1200px
- “Desktop unchanged” means the current two-panel proportions and auto-select-first-thread behaviour stay on desktop only
- Keyboard-open screenshots may simulate the keyboard inset (visual viewport) rather than a physical device keyboard
- Custom confirm UI is allowed if it preserves the same copy intent, cancel/confirm outcomes, and confirm-token send sequence
- Parallel Sprint 2 PRs own the badge, delivery-status, and redirect-toggle behaviour; this change only reserves slots
- No merge, no production deploy, no live guest send
- Ritual removed: pinch-zoom and sideways-scroll on the stay-morning inbox from a phone
