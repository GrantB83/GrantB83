# Quickstart Validation Guide: Inbox Scroll and Layout Improvements

**Feature**: 025-inbox-scroll-improvements  
**Date**: September 25, 2026  
**Phase**: 1 (Design)

## Overview

This guide provides runnable validation scenarios to verify the inbox scroll and layout improvements work end-to-end. Each scenario corresponds to user stories and acceptance criteria from the specification.

---

## Prerequisites

1. **Development environment**: Node.js 18+, npm installed
2. **GuestFlow repository cloned**: `git clone <repo-url>` (already available in workspace)
3. **Feature branch checked out**: `git checkout cursor/inbox-scroll-improvements-6349`
4. **Dependencies installed**: `cd apps/guestflow && npm install`
5. **Database initialized** (if needed): `npm run db:init` (for full app testing)
6. **Fixture mode enabled**: Add `?fixture=1` query parameter for testing without live data

---

## Setup Commands

```bash
# Navigate to GuestFlow app
cd /workspace/apps/guestflow

# Install dependencies (if not already done)
npm install

# Run development server
npm run dev

# Development server starts at http://localhost:3100
```

**Expected Outcome**: Server starts successfully, no build errors. Console shows "Ready on http://localhost:3100".

---

## Test Scenario 1: Desktop Message Transcript Readability (SC-001)

**User Story**: P1 - Desktop Message Transcript Readability

**Goal**: Verify message transcript is ≥240px tall or ≥35% of shell height on ~1280×800 desktop viewport with default composer.

### Steps:

1. Open browser and navigate to `http://localhost:3100/?fixture=1`
2. Resize browser window to approximately 1280×800 (or use DevTools device toolbar)
3. Select any thread from the list (e.g., first thread)
4. With thread open and default composer visible (no template-heavy mode), inspect message transcript area

### Validation:

**Browser DevTools Inspection**:
```javascript
// Open DevTools Console and run:
const messagesArea = document.querySelector('[class*="flex-1"][class*="overflow-y-auto"]')
const shellHeight = window.innerHeight - (parseInt(getComputedStyle(document.querySelector('.inbox-shell')).top) || 0) - (parseInt(getComputedStyle(document.querySelector('.inbox-shell')).bottom) || 0)
const messageHeight = messagesArea?.clientHeight || 0
const shellPercent = ((messageHeight / shellHeight) * 100).toFixed(1)

console.log(`Message height: ${messageHeight}px`)
console.log(`Shell height: ${shellHeight}px`)
console.log(`Message area is ${shellPercent}% of shell`)
console.log(`Pass: ${messageHeight >= 240 && messageHeight >= shellHeight * 0.35}`)
```

**Expected Result**: Console logs show message height ≥240px AND ≥35% of shell height. Pass should be `true`.

**Manual Visual Check**: Message transcript shows at least 3-4 messages visible without scrolling. Composer is present but does not dominate the view.

---

## Test Scenario 2: Independent List and Thread Scrolling (SC-002)

**User Story**: P1 - Independent List and Thread Navigation

**Goal**: Verify scrolling thread list does not affect message transcript scroll position and vice versa.

### Steps:

1. Open `http://localhost:3100/?fixture=1`
2. Select a thread with 10+ messages (or use fixture data with long threads)
3. Scroll the message transcript to message 5 (middle of thread)
4. Without clicking inside the message area, scroll the thread list using mouse wheel or trackpad
5. Observe whether message transcript scroll position changes
6. Now click inside message area and scroll messages
7. Observe whether thread list scroll position changes

### Validation:

**Expected Result**:
- Scrolling thread list does NOT change message transcript scroll position
- Scrolling message transcript does NOT change thread list scroll position
- Each area has independent scroll behavior without interference

**Browser Event Test** (optional):
```javascript
// Log scroll events to confirm independence
const listArea = document.querySelector('[data-inbox-pane="list"] [class*="overflow-y-auto"]')
const messagesArea = document.querySelector('[data-inbox-pane="thread"] [class*="overflow-y-auto"]')

listArea?.addEventListener('scroll', () => console.log('List scrolled:', listArea.scrollTop))
messagesArea?.addEventListener('scroll', () => console.log('Messages scrolled:', messagesArea.scrollTop))

// Scroll one area and verify only that area's event fires
```

---

## Test Scenario 3: List Scroll Position Restoration (SC-003)

**User Story**: P1 - Independent List and Thread Navigation

**Goal**: Verify list scroll position is restored when navigating between threads and back to list.

### Steps:

1. Open `http://localhost:3100/?fixture=1`
2. Scroll thread list down to thread 10 (or last visible thread)
3. Note the thread name at the top of the visible list area
4. Click on thread 10 to open it
5. View the thread detail for a few seconds
6. On desktop/tablet: thread remains open, list still visible and scrolled to same position (no action needed)
7. On phone: click back button to return to list

### Validation:

**Expected Result**:
- **Desktop/Tablet**: List remains visible and scrolled to thread 10 position while thread is open
- **Phone**: After clicking back, list reappears scrolled to thread 10 (same position as before selection)
- SessionStorage contains `'inbox-list-scroll'` key with scroll position value

**SessionStorage Check**:
```javascript
// In DevTools Console:
const scrollPos = sessionStorage.getItem('inbox-list-scroll')
console.log(`Stored list scroll position: ${scrollPos}px`)
```

---

## Test Scenario 4: Composer Height Cap on Desktop (SC-004)

**User Story**: P2 - Composer Space Management

**Goal**: Verify composer does not exceed 50% of thread column height on desktop viewport.

### Steps:

1. Open `http://localhost:3100/?fixture=1` on desktop viewport (≥1024px wide)
2. Select a thread
3. Expand composer by adding multiple lines of text in textarea (press Enter multiple times)
4. Enable template mode if available (select a template with variables)
5. Measure composer height vs thread column height

### Validation:

**Browser DevTools Measurement**:
```javascript
// Open DevTools Console:
const threadColumn = document.querySelector('[data-inbox-pane="thread"]')
const composer = document.querySelector('[data-inbox-composer]')
const threadHeight = threadColumn?.clientHeight || 0
const composerHeight = composer?.clientHeight || 0
const composerPercent = ((composerHeight / threadHeight) * 100).toFixed(1)

console.log(`Thread column height: ${threadHeight}px`)
console.log(`Composer height: ${composerHeight}px`)
console.log(`Composer is ${composerPercent}% of thread column`)
console.log(`Pass: ${composerHeight <= threadHeight * 0.50}`)
```

**Expected Result**: Composer height ≤50% of thread column height. Pass should be `true`.

**Visual Check**: Composer does not dominate the view. Message transcript remains primary visible area.

---

## Test Scenario 5: Mobile Keyboard Inset Handling (SC-008)

**User Story**: P2 - Composer Space Management

**Goal**: Verify composer collapses non-essential chrome when mobile keyboard is visible.

### Steps:

1. Open `http://localhost:3100/?fixture=1&keyboard=1` to simulate keyboard inset
2. Select a thread
3. Click into the composer textarea to focus it
4. Observe whether care banners, template details, or other optional UI collapses
5. Verify composer controls (textarea, send button) remain usable (≥44px touch targets)

### Validation:

**Visual Check**:
- Composer chrome (care banners, template preview) is collapsed or hidden
- Textarea remains visible with at least 2 rows
- Send button and channel selector remain visible and tappable
- Message transcript area is still visible (not completely hidden by composer)

**Browser DevTools Check**:
```javascript
// Verify keyboard inset is applied
const shellBottom = parseInt(getComputedStyle(document.querySelector('.inbox-shell')).bottom) || 0
console.log(`Keyboard inset: ${shellBottom}px`)
// Should be > 0 when ?keyboard=1 query param is present

// Verify message area still has minimum height
const messagesArea = document.querySelector('[data-inbox-pane="thread"] [class*="overflow-y-auto"]')
const messageHeight = messagesArea?.clientHeight || 0
console.log(`Message height with keyboard: ${messageHeight}px`)
console.log(`Pass: ${messageHeight >= 240}`)
```

**Expected Result**: Keyboard inset is applied (bottom style > 0), composer collapses optional UI, message area remains ≥240px or meets adjusted minimum.

---

## Test Scenario 6: Mobile Full-Screen Panes (SC-005)

**User Story**: P1 - Mobile Full-Screen Panes

**Goal**: Verify list-only and thread-only views each fill the full shell height on mobile.

### Steps:

1. Open `http://localhost:3100/?fixture=1` on mobile viewport (375px wide)
2. Verify list view fills the screen (no thread visible)
3. Tap on a thread to open it
4. Verify thread view fills the screen (list hidden, back button visible)
5. Tap back button
6. Verify list view returns and fills the screen

### Validation:

**Expected Result**:
- List view: fills 100% of shell height, thread pane is not visible
- Thread view: fills 100% of shell height, list pane is not visible, back button present
- Each view has one primary scrollable area (list or messages)
- Navigation back restores list scroll position (see Scenario 3)

**Browser DevTools Check**:
```javascript
// When list view is visible:
const listPane = document.querySelector('[data-inbox-pane="list"]')
const threadPane = document.querySelector('[data-inbox-pane="thread"]')
console.log('List visible:', !listPane?.classList.contains('invisible'))
console.log('Thread visible:', !threadPane?.classList.contains('invisible'))
// Only one should be visible at a time on phone
```

---

## Test Scenario 7: No Regressions to Search and Approve&Send (SC-006, SC-007)

**User Story**: P1 - Preserve Existing Functionality

**Goal**: Verify soft-inbox search (PR #228) and Approve&Send gates still function after layout changes.

### Steps (Search):

1. Open `http://localhost:3100/?fixture=1`
2. Click into the search field at the top of the thread list
3. Type a search query (e.g., "booking" or "guest name")
4. Press Enter or click search icon
5. Verify search results display correctly
6. Select a search result and verify thread opens

### Steps (Approve&Send):

1. Open `http://localhost:3100/?fixture=1`
2. Select a thread
3. Compose a draft message in the composer
4. Select WhatsApp or Email channel
5. Click "Approve & Send" button (if visible in fixture mode)
6. Verify approval flow initiates (confirmation dialog, draft creation, etc.)

### Validation:

**Expected Result**:
- Search functionality works identically to pre-layout-change behavior
- Search results are selectable and navigate correctly
- Approve&Send button is present and functional
- No visual or functional regressions in search or send flows

**Note**: Full end-to-end testing of Approve&Send may require live data or specific test fixtures. At minimum, verify the button is present and clickable without layout issues.

---

## Unit/Integration Tests

**Run Vitest tests**:

```bash
cd /workspace/apps/guestflow

# Run all tests
npm test

# Run tests in watch mode for development
npm run test:watch
```

**Expected Tests** (to be added during implementation):
- Layout calculation tests (min message height, max composer height)
- Scroll restoration tests (sessionStorage read/write)
- Responsive breakpoint tests (phone, tablet, desktop)
- Chrome offset calculation tests

**Expected Outcome**: All tests pass. No regressions in existing tests.

---

## Manual Testing Matrix

| Viewport | Breakpoint | List Scroll | Thread Scroll | Composer Height | Keyboard | Pass |
|----------|------------|-------------|---------------|-----------------|----------|------|
| 1280×800 | desktop    | Independent | Independent   | ≤50%            | N/A      | ✓    |
| 1024×768 | tablet     | Independent | Independent   | ≤50%            | N/A      | ✓    |
| 375×667  | phone      | List-only   | Thread-only   | Responsive      | Inset    | ✓    |
| 1280×800 | desktop    | Restored    | N/A           | N/A             | N/A      | ✓    |
| 375×667  | phone      | Restored    | N/A           | Collapsed       | Simulated| ✓    |

---

## Success Criteria Checklist

After running all validation scenarios, verify:

- [ ] **SC-001**: Message transcript ≥240px or ≥35% shell height on desktop (Scenario 1)
- [ ] **SC-002**: Independent scroll for list and messages (Scenario 2)
- [ ] **SC-003**: List scroll position restored on navigation (Scenario 3)
- [ ] **SC-004**: Composer ≤50% of thread column on desktop (Scenario 4)
- [ ] **SC-005**: Mobile panes fill shell, one scroll per pane (Scenario 6)
- [ ] **SC-006**: Search functionality not regressed (Scenario 7)
- [ ] **SC-007**: Approve&Send gates not regressed (Scenario 7)
- [ ] **SC-008**: Composer collapses chrome on keyboard inset (Scenario 5)
- [ ] **SC-009**: No third nested scroll container (visual inspection)
- [ ] **SC-010**: Layout tests pass (unit tests)

---

## Troubleshooting

**Issue**: Message area is too short (< 240px) on desktop

**Solution**: Check that `useInboxChromeOffset` is not double-counting operations nav height. Verify flexbox `min-h-0` is set on parent containers. Ensure message area has `min-height` constraint applied.

**Issue**: Scrolling one pane affects another

**Solution**: Verify both panes use `overflow-y-auto` at the same flex level (siblings, not nested). Ensure no parent has `overflow: hidden` on the scroll axis.

**Issue**: List scroll position not restored

**Solution**: Check sessionStorage for `'inbox-list-scroll'` key. Verify scroll position is written before navigation and read on mount. Ensure `scrollTo()` is called with `behavior: 'instant'`.

**Issue**: Composer dominates view on desktop

**Solution**: Ensure composer has `max-height: 50%` constraint applied on desktop breakpoint. Verify collapsible chrome (care, template) is not always expanded.

---

## Ready for Implementation

Once all design artifacts (research, data-model, contracts, quickstart) are reviewed and approved, proceed to `/speckit-tasks` to generate the task list for implementation.
