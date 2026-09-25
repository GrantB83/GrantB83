# Data Model: Inbox Scroll and Layout Improvements

**Feature**: 025-inbox-scroll-improvements  
**Date**: September 25, 2026  
**Phase**: 1 (Design)

## Overview

This feature is primarily a UI/layout enhancement and does not introduce new database entities or persistent data structures. However, it does involve component state and layout calculation entities that are important for understanding the implementation.

---

## Component State Entities

### InboxLayoutState

Represents the runtime state of the inbox shell layout.

**Attributes**:
- `breakpoint`: "phone" | "tablet" | "desktop" — Current responsive breakpoint based on viewport width
- `pane`: "list" | "thread" — Active pane on phone breakpoint (desktop/tablet show both)
- `listCollapsed`: boolean — Whether thread list is collapsed on tablet (toggle control)
- `chromeOffset`: number (pixels) — Top offset for operations nav or app header above inbox shell
- `keyboardInsetPx`: number (pixels) — Bottom inset when mobile keyboard is visible (0 when hidden)

**Validation Rules**:
- `breakpoint` must be one of the three valid values
- `chromeOffset` must be ≥0
- `keyboardInsetPx` must be ≥0
- On phone breakpoint, `pane` determines visibility (only one pane visible at a time)
- On tablet/desktop, `pane` is not directly used (both panes visible, list may be collapsed)

**State Transitions**:
- `breakpoint` transitions based on viewport width changes (resize, orientation change)
- `pane` transitions on phone when user selects thread (list → thread) or navigates back (thread → list)
- `listCollapsed` toggles on tablet when user clicks expand/collapse button
- `chromeOffset` updates on mount or when operations nav height changes
- `keyboardInsetPx` updates when mobile keyboard shows/hides (Visual Viewport API)

---

### ThreadDetailState

Represents the state of an open thread view.

**Attributes**:
- `selectedId`: number | null — ID of the currently selected thread (null when no thread open)
- `detail`: ThreadDetail | null — Full thread details including messages, contacts, facts
- `listScrollPosition`: number (pixels) — Stored scroll position of thread list (for restoration)

**Validation Rules**:
- `selectedId` must match a valid thread ID or be null
- `detail` must be present if `selectedId` is not null
- `listScrollPosition` must be ≥0

**State Transitions**:
- When thread is selected: store `listScrollPosition` → fetch `detail` → set `selectedId`
- When user navigates back: clear `selectedId` → clear `detail` → restore `listScrollPosition`
- On desktop/tablet, list remains visible so scroll position is maintained in real-time (no save/restore)

---

### ComposerState

Represents the state of the message composer UI.

**Attributes**:
- `collapsed`: boolean — Whether optional chrome (care banners, template preview) is collapsed
- `textareaRows`: number — Number of visible textarea rows (2-4 typical range)
- `composerHeightPx`: number (calculated) — Current total height of composer footer

**Validation Rules**:
- `textareaRows` must be ≥2 (minimum for usability per FR-004)
- `composerHeightPx` should be ≤ 50% of thread column height on desktop (FR-004)

**State Transitions**:
- When `keyboardInsetPx` increases (keyboard shown): `collapsed` → true, `textareaRows` → min (2)
- When viewport height decreases below threshold: `collapsed` → true
- When template-heavy mode active + short viewport: `collapsed` → true
- When conditions normalize (keyboard hidden, taller viewport): `collapsed` → false, `textareaRows` → default (3-4)

---

## Layout Calculation Entities

### InboxShellDimensions

Runtime calculations for inbox shell available space.

**Derived Attributes**:
- `shellHeight`: viewportHeight - chromeOffset - keyboardInsetPx (pixels)
- `minMessageHeight`: Math.max(240, shellHeight * 0.35) (pixels)
- `maxComposerHeight`: shellHeight * 0.50 (pixels, desktop only)

**Relationships**:
- Used by `InboxLayoutShell` to set `style={{ top: chromeOffset, bottom: keyboardInsetPx }}`
- Used by `ThreadLayoutShell` to enforce message transcript min-height and composer max-height

---

## Session Storage Keys

### LIST_SCROLL_KEY

Key used for persisting thread list scroll position in sessionStorage.

**Value**: 'inbox-list-scroll'

**Stored Data**: string representation of scroll position in pixels (e.g., "350")

**Lifecycle**:
- Written when thread is selected (before navigation)
- Read when list view is shown (on mount or back navigation)
- Cleared on explicit context reset (search, filter change) — optional, not required

---

## Component Props Interfaces

See `contracts/component-contracts.md` for detailed TypeScript interface definitions of component props.

---

## Non-Goals

This feature does **NOT** introduce:
- New database tables or columns
- New API endpoints or data fetching patterns
- Changes to thread, message, or contact data models
- Changes to sessionStorage beyond existing `LIST_SCROLL_KEY` usage

---

## Summary

The "data model" for this layout feature is primarily **runtime component state** and **derived layout calculations**. Key entities are `InboxLayoutState` (shell dimensions and breakpoints), `ThreadDetailState` (selected thread and scroll position), and `ComposerState` (collapse state and height). Layout dimensions are calculated from viewport, chrome offset, and keyboard inset to enforce minimum message height and maximum composer height constraints.
