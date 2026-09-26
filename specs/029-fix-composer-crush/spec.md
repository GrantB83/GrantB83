# Feature Specification: Fix Composer Crush on Unmatched/Window-Closed Threads

**Feature Branch**: `029-fix-composer-crush`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "Fix GuestFlow soft-inbox composer crush on unmatched + window-closed threads"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff Triages Unmatched Thread (Priority: P1)

A GuestFlow staff member opens an unmatched thread (no linked booking) with window-closed status from the inbox. They need to read the message transcript and compose a reply using the available channel chips (WhatsApp, SMS, Email) and the draft textarea.

**Why this priority**: This is the core operator job. Staff cannot effectively triage and respond to guest inquiries if the composer is crushed off-screen. This blocks daily operations.

**Independent Test**: Open thread 28 (+27722219581) on production or preview at ~1280×800 desktop viewport. Verify composer band (channel chips + textarea ≥2 lines + Approve&Send button) is fully visible without scrolling the page.

**Acceptance Scenarios**:

1. **Given** an unmatched thread with window-closed status is displayed, **When** staff views the thread at desktop viewport (~1280×800), **Then** the composer (channel chips + textarea + Approve&Send) is fully visible in the viewport without scrolling
2. **Given** the unmatched panel shows the collapsed one-line "Link to booking ▾" strip, **When** staff reviews the thread, **Then** the transcript scrolls independently while composer remains anchored at bottom
3. **Given** staff has drafted a reply in the textarea, **When** they need to send it, **Then** the Approve&Send button is fully visible and clickable without hunting or scrolling

---

### User Story 2 - Staff Responds to Matched Thread (Priority: P1)

A staff member opens a matched thread (with a linked booking) that has an existing draft. They need to review the draft, edit if needed, and send it.

**Why this priority**: Regression prevention. The fix must not break the existing matched thread experience.

**Independent Test**: Open any matched thread with a draft. Verify composer is fully visible and functional at desktop viewport.

**Acceptance Scenarios**:

1. **Given** a matched thread with a draft is displayed, **When** staff views it at desktop viewport, **Then** composer remains fully visible with no regression from current behavior
2. **Given** staff edits the draft, **When** they scroll the transcript, **Then** composer stays anchored at bottom

---

### User Story 3 - Mobile Staff Triage (Priority: P2)

A staff member using a mobile device (~390px width) needs to triage threads and compose replies on the go.

**Why this priority**: Mobile is secondary but must remain usable. Staff should still be able to read and reply from phone when away from desk.

**Independent Test**: Open thread on mobile viewport (~390px). Verify thread-only view shows usable composer. Back button restores list.

**Acceptance Scenarios**:

1. **Given** a thread is open on mobile viewport (~390px), **When** in thread-only view, **Then** composer is usable (chips + textarea + button visible)
2. **Given** staff is in thread-only view, **When** they tap Back, **Then** inbox list is restored

---

### Edge Cases

- What happens when the unmatched panel is expanded to show booking link options? (Must cap expanded height ≤~96px with internal scroll)
- What happens when there are multiple metadata-only messages in transcript? (Only transcript scrolls; composer never shrinks)
- What happens when a long draft pushes textarea height? (Textarea can grow within composer zone; composer remains anchored)
- What happens when window-closed chip appears in header AND as a duplicate bar? (Deduplicate; show chip in header only)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Thread column MUST use flex column layout with height 100% of the work area
- **FR-002**: Thread column MUST have exactly three zones: Chrome (flex: 0 0 auto), Transcript (flex: 1 1 auto), Composer (flex: 0 0 auto)
- **FR-003**: Chrome zone MUST include thread header (≤1-2 lines) + ONE window-closed chip + unmatched strip (default collapsed to one line)
- **FR-004**: Transcript zone MUST be the ONLY region with overflow-y: auto for scrolling messages
- **FR-005**: Composer zone MUST reserve min-height for channel chips + textarea (~2-3 lines) + Approve&Send button
- **FR-006**: Composer MUST remain fully visible in viewport at all times (never scroll off-screen)
- **FR-007**: Unmatched panel default state MUST be one-line strip "Link to booking ▾" (not expanded card)
- **FR-008**: When unmatched panel is expanded, height MUST be capped at ≤~96px with internal scroll if needed
- **FR-009**: Window-closed status MUST appear ONCE (in header chip OR as tip bar, not both)
- **FR-010**: Scroll floors from PR #235 MUST be preserved where they do not conflict with this layout rule
- **FR-011**: Redirect ON behavior MUST remain unchanged (no removal of redirect functionality)
- **FR-012**: Gold Redirect banner strip MUST NOT be reintroduced (stay with current behavior post-#244)

### Key Entities *(include if feature involves data)*

- **Thread**: Represents a conversation with a guest; can be matched (linked to booking) or unmatched (temporary, no booking link)
- **Composer**: The reply interface with channel chips (WhatsApp, SMS, Email), draft textarea, and Approve&Send button
- **Chrome**: Header area showing thread identity, status chips (window-closed, unmatched), and optional unmatched booking-link panel
- **Transcript**: Scrollable message history including actual messages and metadata-only rows

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On desktop viewport (~1280×800), composer band (channel chips + textarea ≥2 lines + Approve&Send) is fully visible in viewport for unmatched threads without page scrolling
- **SC-002**: On desktop viewport, matched threads with drafts maintain current composer visibility (no regression)
- **SC-003**: On mobile viewport (~390px), thread-only view shows usable composer with all controls accessible
- **SC-004**: Staff can complete operator job (read transcript → compose reply → send) without scrolling page or hunting for clipped controls

## Assumptions

- Desktop viewport reference is ~1280×800 (common staff workstation resolution)
- Mobile viewport reference is ~390px width (iPhone SE / Android equivalent)
- "Usable composer" means minimum 2-3 line textarea height (not single-line input)
- Unmatched panel expanded state is ≤5% of user interactions (most staff use collapsed default)
- Transcript scroll behavior (messages scroll independently) is preferred over page-level scroll
- Current Redux/Zustand state management for drafts and thread data is unchanged
- Redirect ON/OFF toggle functionality exists and must not be modified
- PR #244 removed gold Redirect banner strip; this must not be reintroduced
