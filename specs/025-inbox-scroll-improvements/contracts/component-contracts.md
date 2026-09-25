# Component Contracts: Inbox Scroll and Layout Improvements

**Feature**: 025-inbox-scroll-improvements  
**Date**: September 25, 2026  
**Phase**: 1 (Design)

## Overview

This document defines the public interfaces (TypeScript props) for the layout components modified or introduced by this feature. These contracts ensure consistent usage across the inbox UI.

---

## InboxLayoutShell

**Purpose**: Top-level shell that manages the list and thread panes with responsive breakpoints.

**File**: `apps/guestflow/src/components/inbox/InboxLayoutShell.tsx`

**Props Interface**:

```typescript
interface InboxLayoutShellProps {
  /** Current responsive breakpoint */
  breakpoint: InboxBreakpoint

  /** Active pane on phone (both visible on tablet/desktop) */
  pane: InboxPane

  /** Thread list pane content (ReactNode) */
  list: ReactNode

  /** Thread detail pane content (ReactNode) */
  thread: ReactNode

  /** Whether list is collapsed on tablet breakpoint */
  listCollapsed: boolean

  /** Callback when user toggles list collapse (tablet only) */
  onToggleList: () => void

  /** Top offset for operations nav or app header (pixels) */
  chromeOffset: number

  /** Bottom inset for mobile keyboard (pixels) */
  keyboardInsetPx: number
}

type InboxBreakpoint = 'phone' | 'tablet' | 'desktop'
type InboxPane = 'list' | 'thread'
```

**Behavior Contract**:
- On `breakpoint === 'phone'`: Only `pane` determines visibility (list or thread, not both)
- On `breakpoint === 'tablet'`: Both panes visible unless `listCollapsed === true`
- On `breakpoint === 'desktop'`: Both panes visible, list has `max-w-md`
- Shell uses `position: fixed` with `top: chromeOffset` and `bottom: keyboardInsetPx`
- Shell has `overflow: hidden` to enforce boundary; children manage scroll

**Validation**:
- `chromeOffset >= 0`
- `keyboardInsetPx >= 0`
- If `breakpoint === 'phone'`, `pane` must be valid
- `onToggleList` only relevant on tablet

---

## ThreadLayoutShell

**Purpose**: Layout for a single thread view with header, messages, and composer.

**File**: `apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx`

**Props Interface**:

```typescript
interface ThreadLayoutShellProps {
  /** Whether to show back button (true on phone, false on desktop/tablet) */
  showBack: boolean

  /** Callback when user clicks back button */
  onBack: () => void

  /** Thread title (contact name or booking reference) */
  title: ReactNode

  /** Thread facts (dates, property, status) */
  facts: ReactNode

  /** Channel line (WhatsApp Cloud, Email, etc.) */
  channelLine: ReactNode

  /** Optional badge slot (e.g., care window indicator) */
  headerBadgeSlot?: ReactNode

  /** Optional actions slot (e.g., link booking, refresh) */
  headerActionsSlot?: ReactNode

  /** Optional extra header content (e.g., alerts, notifications) */
  extraHeader?: ReactNode

  /** Message transcript content (scrollable area) */
  messages: ReactNode

  /** Composer footer content (channels, textarea, send button) */
  composer: ReactNode
}
```

**Behavior Contract**:
- Header is `shrink-0` (does not shrink when content is tall)
- Messages area is `flex-1 overflow-y-auto` (independently scrollable, takes remaining space)
- Composer footer is `shrink-0` (does not shrink, fixed at bottom)
- On phone, `showBack === true` and `onBack` navigates to list pane
- On desktop/tablet, `showBack === false` and list remains visible

**Layout Constraints**:
- Messages area must enforce `min-height: max(240px, 35% of shell height)` to remain readable
- Composer footer should cap at `max-height: 50% of thread column height` on desktop
- Header height should be reasonable but is not strictly capped (typically 80-120px)

**Validation**:
- `onBack` must be provided (even if `showBack === false`)
- `title`, `facts`, `channelLine` must be present (not nullable)

---

## useInboxChromeOffset

**Purpose**: Hook that calculates the top offset for the inbox shell based on operations nav height.

**File**: `apps/guestflow/src/components/inbox/useInboxChromeOffset.ts`

**Return Type**:

```typescript
function useInboxChromeOffset(): number
```

**Behavior Contract**:
- Measures the height of any fixed or sticky chrome elements above the inbox (operations nav, app header)
- Returns the height in pixels as a number
- Returns `0` if no chrome elements are present
- Re-calculates on mount and window resize (debounced)
- Should avoid double-counting if inbox shell is already `position: fixed`

**Usage Example**:

```typescript
const chromeOffset = useInboxChromeOffset()

return (
  <InboxLayoutShell
    chromeOffset={chromeOffset}
    {...otherProps}
  />
)
```

**Validation**:
- Returned value must be `>= 0`
- Should measure actual rendered height, not rely on hardcoded values

---

## useVisualViewportInset

**Purpose**: Hook that calculates the bottom inset when mobile keyboard is visible.

**File**: `apps/guestflow/src/components/inbox/useVisualViewportInset.ts`

**Signature**:

```typescript
function useVisualViewportInset(keyboardSim?: boolean): number
```

**Parameters**:
- `keyboardSim` (optional): If `true`, simulates keyboard inset for testing (typically 300-400px)

**Return Type**: `number` (pixels)

**Behavior Contract**:
- Uses Visual Viewport API to detect keyboard height on mobile
- Returns the inset in pixels (viewport height - visual viewport height)
- Returns `0` when keyboard is hidden or on desktop
- Updates when keyboard shows/hides (event-driven)
- If `keyboardSim === true`, returns a fixed test value (e.g., 350px)

**Usage Example**:

```typescript
const keyboardSim = searchParams.get('keyboard') === '1'
const keyboardInsetPx = useVisualViewportInset(keyboardSim)

return (
  <InboxLayoutShell
    keyboardInsetPx={keyboardInsetPx}
    {...otherProps}
  />
)
```

**Validation**:
- Returned value must be `>= 0`
- Should handle browsers without Visual Viewport API gracefully (fallback to 0)

---

## LIST_SCROLL_KEY

**Purpose**: Session storage key for persisting thread list scroll position.

**File**: `apps/guestflow/src/app/page.tsx` (constant)

**Value**: `'inbox-list-scroll'`

**Usage Contract**:

```typescript
// Store scroll position before navigating to thread
sessionStorage.setItem(LIST_SCROLL_KEY, String(listScrollRef.current.scrollTop))

// Restore scroll position when returning to list
const savedScroll = sessionStorage.getItem(LIST_SCROLL_KEY)
if (savedScroll && listScrollRef.current) {
  listScrollRef.current.scrollTop = parseInt(savedScroll, 10)
}
```

**Behavior Contract**:
- Stored as string representation of scroll position in pixels
- Written when thread is selected
- Read when list view is shown (mount or back navigation)
- Optional: cleared on explicit context reset (search, filter change)

---

## Summary

These contracts define the public interfaces for the inbox layout components. Key components are:

1. **InboxLayoutShell**: Shell container with responsive panes and chrome offsets
2. **ThreadLayoutShell**: Thread view with header, messages, and composer
3. **useInboxChromeOffset**: Hook for measuring top chrome offset
4. **useVisualViewportInset**: Hook for keyboard bottom inset
5. **LIST_SCROLL_KEY**: Session storage key for scroll restoration

All props and return types must adhere to these contracts for consistent behavior and testability.
