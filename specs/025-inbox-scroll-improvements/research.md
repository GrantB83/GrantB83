# Research: Inbox Scroll and Layout Improvements

**Feature**: 025-inbox-scroll-improvements  
**Date**: September 25, 2026  
**Phase**: 0 (Outline & Research)

## Overview

This document consolidates research findings for implementing independent scroll behavior, minimum height constraints, and responsive composer layouts in the GuestFlow soft inbox to resolve cramped panes and scroll conflicts.

---

## R1: Flexbox Layout with Independent Scroll Containers

**Decision**: Use flexbox with `flex-1 overflow-y-auto` for scrollable areas (thread list, message transcript) and `shrink-0` for fixed headers/footers (thread header, composer).

**Rationale**: 
- Flexbox with `min-h-0` on parent and `flex-1 overflow-y-auto` on child creates an independent scroll container that respects remaining space after shrink-0 siblings.
- `overflow-y-auto` on multiple siblings at the same flex level creates independent scrollers without interference.
- `position: fixed` on `.inbox-shell` with `top` and `bottom` styles establishes a fixed-height container for flexbox to calculate against.
- This pattern is already partially implemented in `InboxLayoutShell` and `ThreadLayoutShell` but needs refinement to ensure scrollers don't fight and message transcript has minimum space.

**Alternatives considered**:
- **CSS Grid with `minmax` track sizes**: More explicit about min/max heights but less flexible for dynamic content. Flexbox is already in use and sufficient.
- **JavaScript-based height calculation**: Would introduce unnecessary complexity and potential performance issues. Pure CSS flexbox is performant and maintainable.
- **Third nested scroll container in messages**: Rejected per FR-010. One primary scroller per pane is clearer.

**Best practices**:
- Always set `min-h-0` on flex parents to allow children to shrink below content size.
- Use `overflow-y-auto` (not `overflow-y-scroll`) to only show scrollbar when needed.
- Avoid nesting multiple `overflow: auto` containers in the same scroll direction unless intentional (e.g., list and thread are siblings, not nested).
- Ensure touch targets (buttons, textarea) meet minimum size (44px on mobile).

**References**:
- MDN Flexbox Guide: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout
- CSS-Tricks Complete Guide to Flexbox: https://css-tricks.com/snippets/css/a-guide-to-flexbox/

---

## R2: Minimum Height Constraints for Readability

**Decision**: Implement minimum height constraints using `min-h-[240px]` or `style={{ minHeight: '35%' }}` (calculated as 35% of inbox shell height) on the message transcript area.

**Rationale**:
- 240px absolute minimum ensures at least 3-4 visible messages on typical laptop heights (~800px viewport minus chrome/composer).
- 35% relative minimum adapts to viewport size while preventing composer from dominating on tall viewports.
- Use `Math.max(240, shellHeight * 0.35)` in JavaScript to enforce whichever is larger.
- The message transcript is the primary content area users need to read; composer is secondary (but still essential).

**Alternatives considered**:
- **Fixed 50% split**: Too rigid; doesn't account for composer expansion in template-heavy mode or short viewports.
- **No minimum, pure flex**: Allows composer to starve message area below usable height on short viewports or keyboard inset.
- **vh units (e.g., `min-h-[30vh]`)**: Less precise than calculating against shell height; `vh` includes browser chrome which is irrelevant here.

**Best practices**:
- Calculate min-height dynamically based on available shell height (shell height = viewport height - chromeOffset - keyboardInsetPx).
- Prefer `clamp()` CSS function if all values are CSS-expressible: `min-height: clamp(240px, 35%, 600px)`.
- For dynamic keyboard inset, use inline styles or CSS variables set via JavaScript.
- Test on reference viewports: 1280×800 (desktop), 1024×768 (small laptop), 375×667 (mobile).

**References**:
- CSS min-height: https://developer.mozilla.org/en-US/docs/Web/CSS/min-height
- Responsive height calculations: https://web.dev/min-max-clamp/

---

## R3: Responsive Composer Height Management

**Decision**: Implement composer height cap at 50% of thread column on desktop, with conditional collapsing of non-essential chrome (care banners, template details) on short viewports or keyboard inset.

**Rationale**:
- Composer must remain usable (≥44px controls) but should not permanently dominate >50% of thread column per FR-004.
- On mobile with keyboard visible (`keyboardInsetPx` set), available shell height shrinks dramatically. Collapsing care banners, template preview, or reducing textarea rows preserves message transcript space.
- Use `max-height` CSS or conditional rendering based on `keyboardInsetPx` and viewport height to collapse optional UI.
- Template-heavy mode (multiple variable inputs, preview blocks) can trigger collapse earlier than default mode.

**Alternatives considered**:
- **No height cap**: Allows composer to dominate, violating FR-004 and user feedback about cramped messages.
- **Always collapsed composer**: Makes composer unusable; violates FR-004 minimum touch target requirement.
- **Modal composer (overlay)**: Changes UX too drastically; users expect inline composer for context.

**Best practices**:
- Track viewport height and keyboard inset via existing hooks (`useVisualViewportInset`).
- Use conditional rendering: if `keyboardInsetPx > threshold` or `shellHeight < threshold`, render compact composer.
- Collapse order: template details first, then care window info, then reduce textarea rows (but keep ≥2 rows).
- Provide visual affordances (expand icon, "Show more" link) if composer is collapsible.
- Test with iOS Safari keyboard (largest inset), Android Chrome keyboard, and desktop.

**References**:
- Visual Viewport API: https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API
- Mobile keyboard handling: https://web.dev/viewport-resize-behavior/

---

## R4: Scroll Position Restoration with sessionStorage

**Decision**: Continue using existing `LIST_SCROLL_KEY` mechanism with `sessionStorage` for persisting and restoring thread list scroll position across thread selections.

**Rationale**:
- `sessionStorage` is already used in the current implementation (per codebase context from `page.tsx`).
- Storing scroll position on thread selection and restoring on back navigation prevents jarring jumps and preserves user context.
- sessionStorage persists across page navigations within the same session but clears on tab close (appropriate for ephemeral scroll state).
- FR-003 and FR-007 require scroll restoration; existing mechanism should be preserved and tested.

**Alternatives considered**:
- **URL query parameter (`?scroll=1234`)**: Makes URLs less clean and harder to share; scroll state is ephemeral.
- **localStorage**: Persists across sessions unnecessarily; scroll position is session-specific.
- **No restoration**: Violates user expectations and FR-003/FR-007.

**Best practices**:
- Store scroll position in `sessionStorage` before navigating to thread: `sessionStorage.setItem(LIST_SCROLL_KEY, listScrollRef.current.scrollTop)`.
- Restore scroll position on mount or when returning to list view: `listScrollRef.current.scrollTop = parseInt(sessionStorage.getItem(LIST_SCROLL_KEY) || '0', 10)`.
- Use `scrollTo({ top, behavior: 'instant' })` for restoration to avoid animation jank.
- Clear scroll key on explicit user actions that reset context (e.g., search, filter change).
- Test restoration across phone (back button), tablet (side-by-side), and desktop (side-by-side) layouts.

**References**:
- sessionStorage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
- Scroll restoration patterns: https://www.smashingmagazine.com/2021/04/vanilla-javascript-scroll-restoration/

---

## R5: Chrome Offset Hook Refinement

**Decision**: Re-evaluate `useInboxChromeOffset` hook to ensure operations nav height is not double-counted when `.inbox-shell` is `position: fixed`.

**Rationale**:
- The `useInboxChromeOffset` hook provides the top offset for the fixed inbox shell, accounting for operations nav (staff UI) or other page chrome above the inbox.
- If operations nav height is double-counted, the inbox shell starts too low, reducing available height unnecessarily.
- Fixed positioning takes the element out of flow, so parent layout offsets may not apply. The hook should measure the actual rendered height of chrome elements above the inbox.
- FR-011 explicitly requires checking this hook to avoid double-counting.

**Alternatives considered**:
- **Remove chrome offset entirely**: Would cause inbox to overlap operations nav or app header.
- **Hardcode offset value**: Brittle; breaks if operations nav height changes or is absent.
- **Use IntersectionObserver**: Overkill for a simple height measurement; adds unnecessary complexity.

**Best practices**:
- Use `getBoundingClientRect()` or `offsetHeight` to measure chrome elements on mount and resize.
- Debounce resize listeners (100-200ms) to avoid excessive recalculations.
- Fallback to 0 if chrome element is not present (e.g., guest-facing vs staff-facing view).
- Return the measured height as `chromeOffset` for inline style: `style={{ top: chromeOffset }}`.
- Test with and without operations nav visible (staff login vs guest view).

**References**:
- getBoundingClientRect: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
- Debouncing resize events: https://davidwalsh.name/javascript-debounce-function

---

## R6: Layout Validation Testing

**Decision**: Add lightweight layout assertion tests (Vitest unit/e2e) that validate minimum message pane height on reference viewports.

**Rationale**:
- Automated tests prevent regressions and ensure acceptance criteria (SC-001, SC-004, SC-005) are met.
- Vitest is already configured (`package.json` test scripts).
- Layout tests can render components in JSDOM or use Playwright/Puppeteer for real browser validation.
- Key assertions: message transcript ≥240px, composer ≤50% thread column, list scroll position restored.

**Alternatives considered**:
- **Manual testing only**: Time-consuming, error-prone, no CI integration.
- **Visual regression testing (Percy, Chromatic)**: Useful but heavier; layout assertions are faster for height/scroll checks.
- **E2E only (Playwright)**: Slower feedback loop; unit tests for layout math are faster.

**Best practices**:
- Use Vitest + Testing Library for component-level layout tests.
- Mock viewport dimensions via `Object.defineProperty(window, 'innerHeight', { value: 800 })`.
- Assert computed styles or `getBoundingClientRect()` values: `expect(messageArea.clientHeight).toBeGreaterThanOrEqual(240)`.
- Test scroll restoration by simulating scroll and navigation events.
- For full E2E, use Playwright to test real scroll behavior on reference viewports (optional follow-up).

**References**:
- Vitest documentation: https://vitest.dev/
- Testing Library: https://testing-library.com/docs/react-testing-library/intro
- Layout testing patterns: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library

---

## Summary

All research items resolved. No additional clarifications needed. The technical approach is:

1. **Flexbox independent scrollers**: Use `flex-1 overflow-y-auto` for list and message transcript with `min-h-0` parents.
2. **Minimum height constraint**: Enforce `max(240px, 35% of shell height)` on message transcript.
3. **Composer height cap**: Max 50% thread column on desktop, collapse optional chrome on short viewports/keyboard inset.
4. **Scroll restoration**: Continue using `LIST_SCROLL_KEY` with sessionStorage.
5. **Chrome offset fix**: Re-measure operations nav height to avoid double-counting.
6. **Layout tests**: Add Vitest assertions for min heights, scroll restoration, and composer cap.

Ready for Phase 1 (Design & Contracts).
