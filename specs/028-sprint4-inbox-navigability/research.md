# Research: Sprint 4 Inbox Navigability and Redirect Banner Removal

**Feature**: 028-sprint4-inbox-navigability  
**Created**: 2026-09-26  
**Phase**: 0 (Outline & Research)

## Purpose

This document resolves technical unknowns and documents design decisions for compacting the GuestFlow inbox thread layout and removing the Redirect banner visual chrome.

## Research Tasks

### R1: Compact Thread Header Strategy

**Question**: How to move Staff phone/email Save out of the default thread header while maintaining accessibility?

**Decision**: Implement a collapsible Details sheet (desktop) or bottom sheet modal (phone) triggered by a "Details" or "Edit contact" button in the thread header.

**Rationale**:
- Industry pattern from Front, Intercom, HubSpot, Zendesk: context details are toggleable, not always-on
- Matches existing GuestFlow modal patterns (InboxConfirmDialog for Approve&Send)
- Desktop: Can use fixed-position overlay or slide-in panel from right
- Phone: Bottom sheet fits iOS/Android patterns; takes over viewport when open
- Preserves one-tap/click access (≤2 interactions from thread view per SC-007)

**Alternatives considered**:
- Inline accordion in header: Still consumes vertical space when expanded; creates nested collapsible confusion
- Separate contact edit page: Breaks flow; requires navigation away from thread
- Always-on third column: Out of scope for Sprint 4 navigability (gap M7); adds desktop complexity

**Implementation notes**:
- Details sheet contains: Staff phone input, Staff email input, Save contact button
- Header shows only: Guest name, suite, date range, NB ref, channel line, optional Window closed badge, Details button
- Header target height: ≤96-120px collapsed (currently ~150-200px with inline contact editors)
- Use existing Tailwind utilities for fixed overlay (`fixed inset-0 bg-black/50 z-50`) and sheet (`fixed bottom-0 left-0 right-0 bg-white rounded-t-xl z-50` for phone)

---

### R2: Composer Disclosure Pattern

**Question**: How to collapse template selector and care notes behind disclosure without breaking workflow?

**Decision**: Use a "Template & Care" toggle button that expands/collapses the template selector dropdown and care/window notes textarea.

**Rationale**:
- Matches progressive disclosure pattern: common controls visible, advanced controls behind toggle
- Template selection is not needed for every reply (many replies are simple text responses)
- Care notes are staff-only context, not required for guest send
- Existing composer has clear vertical structure: channels → draft → Approve&Send; template/care can slot as optional expanded section
- Toggle state can be client-side only (no server state needed)

**Alternatives considered**:
- Separate template tab/screen: Too heavy; breaks inline flow
- Always-collapsed with no disclosure: Hides important template feature; harder to discover
- Keep template always visible, hide only care notes: Template dropdown alone is tall (~40-60px); collapsing both saves more space

**Implementation notes**:
- Default state: collapsed (template & care hidden)
- Toggle button shows: "Template & Care" with down chevron (collapsed) or up chevron (expanded)
- Expanded section shows: Template selector (existing dropdown) + Care notes textarea (existing)
- Total composer default height target: ≤35% of thread column (currently can reach 50%)
- Expanded max remains ≤50% per existing #235 floor

---

### R3: Message Transcript Scroll Ownership

**Question**: How to ensure message transcript is the primary scroll surface without nested scroll conflicts?

**Decision**: Maintain existing `ThreadLayoutShell` structure with `flex-1 overflow-y-auto` on messages div; header and composer are `shrink-0`.

**Rationale**:
- Current implementation already correct: messages div has `flex-1` (grows to fill) + `overflow-y-auto` (scrollable)
- Issue is not scroll ownership but vertical space allocation (header + composer too tall)
- By compacting header and composer, messages automatically get more space
- No nested scroll containers: list has own scroll, messages have own scroll, composer has max-height but scrolls only when >50%
- Existing useShellDimensions hook calculates floors correctly; just need tighter header/composer sizes

**Alternatives considered**:
- Fixed header/composer heights: Too rigid; doesn't adapt to content or viewport changes
- CSS Grid instead of Flexbox: More complex; flexbox with shrink-0 and flex-1 is well-understood pattern
- Virtualized scroll: Overkill for typical thread sizes (~100-200 messages); adds library dependency

**Implementation notes**:
- No changes to scroll mechanics in ThreadLayoutShell
- Focus on reducing header height (via compact component) and composer default height (via disclosure)
- Maintain minMessageHeight and maxComposerHeight props from existing #235 implementation

---

### R4: Redirect Banner Removal Strategy

**Question**: Where is the Redirect banner rendered and how to remove it without affecting redirect behavior?

**Decision**: Identify and remove the JSX rendering the gold/yellow banner in OpsHeader.tsx or similar chrome component; verify OUTBOUND_MODE and redirect sink config are untouched.

**Rationale**:
- Banner is visual chrome only (not functional logic)
- Redirect behavior is controlled by OUTBOUND_MODE env var and database sink config
- Banner likely rendered in ops chrome header (sticky header from Sprint 3 T)
- useInboxChromeOffset hook may track banner height for layout calculations; update to remove banner height from offset

**Alternatives considered**:
- Hide banner with CSS display:none: Leaves DOM element and offset calculation; not clean removal
- Add "hide banner" feature flag: Unnecessary complexity for one-time removal
- Remove redirect entirely: Out of scope; redirect stays ON until separate go-live CLEAR

**Implementation notes**:
- Search for "Redirect ON" or "OUTBOUND" text in OpsHeader.tsx or chrome components
- Remove banner JSX (likely a div with gold/yellow bg-yellow-400 or bg-amber-400)
- Update useInboxChromeOffset to calculate offset without banner height
- Verify navy sticky ops header (from Sprint 3 T / PR #242) remains intact
- Test: gold banner not visible; navy header present; health check confirms OUTBOUND_MODE still "redirect"

---

### R5: Responsive Breakpoint Strategy

**Question**: How to ensure compact layout works across desktop (≥1200), tablet (768-1199), and phone (<768)?

**Decision**: Use existing breakpoint system from InboxLayoutShell and useInboxBreakpoint; apply compact header/composer at all breakpoints with phone-specific adaptations.

**Rationale**:
- Existing breakpoint hook (`useInboxBreakpoint`) already detects phone/tablet/desktop
- Phone: Single-pane stack (list OR thread) with Back already working (spec 022, PR #235)
- Tablet: Collapsible list + thread; compact header/composer benefit tablet even more (limited horizontal space)
- Desktop: Two-pane; compact header/composer maximize message reading area
- Compact header (≤120px) and collapsed composer (≤35% default) improve UX at all breakpoints

**Alternatives considered**:
- Desktop-only compact layout: Leaves tablet/phone with cramped UI; inconsistent UX
- Phone-specific different layout: Breaks cross-device familiarity; more code paths to test
- CSS-only responsive: Breakpoint hook needed for logic (show Back button on phone, toggle list on tablet)

**Implementation notes**:
- Details sheet: Desktop = fixed overlay, Phone = bottom sheet (both use same component with breakpoint-specific styles)
- Composer disclosure: Same toggle UI at all breakpoints; phone may auto-collapse when keyboard visible (existing keyboardInset logic)
- Header height target: ~96px desktop, ~80-96px phone (smaller font sizes, tighter spacing)
- Test at standard sizes: 390×844 (phone), 768×1024 (tablet portrait), 1280×800 (laptop), 1920×1080 (desktop)

---

## Summary

All technical unknowns resolved. No new libraries or dependencies needed. Implementation is primarily component refactoring (split ThreadHeader, add Details modal, add composer disclosure toggle) and JSX removal (Redirect banner). Existing hooks, types, and test infrastructure sufficient. Ready for Phase 1 (data model, contracts, quickstart).
