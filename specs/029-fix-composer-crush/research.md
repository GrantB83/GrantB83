# Research: Fix Composer Crush on Unmatched/Window-Closed Threads

**Date**: 2026-09-26  
**Feature**: [spec.md](./spec.md)

## Problem Analysis

### Current Behavior (FAIL)

**Evidence**: Production thread 28 (+27722219581) at https://guestflow.thebrowns.co.za/?thread=28

**Layout Stack** (page.tsx lines 674-875):
1. ThreadLayoutShell receives `compactHeader` prop containing:
   - ThreadHeader (lines 639-672): identity + care window badge
   - Unmatched panel (lines 674-699): tall card with dropdown + button
2. ThreadLayoutShell renders (ThreadLayoutShell.tsx lines 77-95):
   - Parent: `<div className="flex h-full min-h-0 flex-col overflow-hidden">`
   - Header: `{headerContent}` — **no explicit flex constraint**
   - Messages: `<div className="... flex-1 overflow-y-auto ... min-h-0">` (flex: 1 1 auto)
   - Composer: `<footer className="... shrink-0 ...">` (flex: 0 0 auto)
3. Composer also contains duplicate care window notice (page.tsx lines 745-757) when `keyboardInsetPx < 100 && shellHeight >= 500`

**Root Cause**: Header zone lacks explicit `flex: 0 0 auto` constraint, allowing Chrome (ThreadHeader + unmatched panel + optional care notice) to grow unconstrained and push composer below viewport.

### Design Layout Rule (from LAYOUT-RULE-composer-unmatched.md)

**3-Zone Flex Column** (height 100%):

| Zone | Role | Flex | Overflow |
|------|------|------|----------|
| **A. Chrome** | Header + status + unmatched strip | `flex: 0 0 auto` (shrink-0) | No scroll |
| **B. Transcript** | Messages (including metadata-only) | `flex: 1 1 auto` (flex-1) | `overflow-y: auto` ONLY |
| **C. Composer** | Channel chips + textarea + Approve&Send | `flex: 0 0 auto` (shrink-0) + min-height | No scroll |

**Chrome Collapsing Rules**:
- Thread header: ≤1-2 lines (name + facts + last channel + ONE status chip)
- Unmatched panel: **default collapsed to one-line strip** ("Link to booking ▾"); expand ≤~96px with internal scroll
- Care window: **ONE instance only** (header badge OR composer tip, NOT BOTH)

## Technical Decisions

### Decision 1: Header Flex Constraint

**Decision**: Add `shrink-0` (flex-shrink: 0) to ThreadLayoutShell header container

**Rationale**: 
- Header must not shrink below content height, but also must not grow to consume flex-1 space from transcript
- Current code lacks explicit flex constraint, allowing header to grow unchecked
- Tailwind `shrink-0` = CSS `flex-shrink: 0` = equivalent to `flex: 0 0 auto`

**Implementation**: 
```tsx
// ThreadLayoutShell.tsx line ~44 (within headerContent)
<header className="inbox-thread-header shrink-0 bg-white border-b px-3 py-2 sm:px-5 sm:py-4">
```

**Alternatives Considered**:
- `flex-initial` (flex: 0 1 auto): Rejected — allows shrinking, which could clip header text
- `flex-none` (flex: none): Equivalent to `shrink-0 grow-0` — acceptable but verbose

### Decision 2: Unmatched Icon → Modal Pattern (REVISED per Grant 26 Sep)

**Decision**: Show simple icon or compact chip in thread chrome that opens Link-to-booking modal. Dropdown + CTA live inside modal only. ZERO vertical band when modal closed.

**Rationale**: 
- Eliminates ALL vertical space consumption for unmatched state in thread chrome (not even one-line strip)
- Modal contains booking link UI only when staff explicitly opens it
- Staff use cases: most threads are matched; unmatched linking is <5% of interactions
- Maximizes transcript + composer vertical space on 100% of threads

**Implementation**:
```tsx
// page.tsx: Add modal state
const [linkBookingModalOpen, setLinkBookingModalOpen] = useState(false)

// Compact icon/chip in header (ZERO vertical band)
{detail.threadKind === 'temp' && (
  <button 
    onClick={() => setLinkBookingModalOpen(true)}
    className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200"
    title="Link to booking"
  >
    <Link2 className="w-3 h-3" /> Link
  </button>
)}

// Modal dialog (only when open)
{linkBookingModalOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
      <h3>Link to Booking</h3>
      {/* Existing select + button */}
      <button onClick={() => setLinkBookingModalOpen(false)}>Close</button>
    </div>
  </div>
)}
```

**Alternatives Considered**:
- One-line strip disclosure: Rejected by Grant — still consumes ~48px vertical band
- Always expanded panel: Rejected — consumes ~140px
- Remove unmatched panel entirely: Rejected — staff need booking-link UX

### Decision 3: Deduplicate Care Window Notice

**Decision**: Remove duplicate care window notice from composer when already shown in header badge

**Rationale**:
- Design rule: ONE care window indicator only
- Current code shows care badge in ThreadHeader (page.tsx lines 653-666) AND composer notice (lines 745-757)
- Double notice consumes ~32px composer vertical space on unmatched + window-closed paths

**Implementation**:
```tsx
// page.tsx lines 745-757: Remove duplicate care notice
// Keep header badge only (lines 653-666)
{/* DELETE:
  {careWindow && keyboardInsetPx < 100 && shellHeight >= 500 && (
    <p className="...">
      {careWindow.label}
    </p>
  )}
*/}
```

**Alternatives Considered**:
- Keep both, hide header badge: Rejected — header is more visible, established pattern
- Keep composer only, remove header: Rejected — header badge is Sprint 4 design intent

### Decision 4: Composer Min-Height Reservation

**Decision**: Add `min-h-[120px]` to composer footer to reserve minimum space for chips + textarea + button

**Rationale**:
- Design rule: composer must remain fully visible (≥ channel chips + 2-3 line textarea + Approve&Send)
- Current `shrink-0` prevents shrinking but doesn't guarantee minimum visible space when keyboard or chrome expands
- 120px ≈ 32px chip row + 60px textarea (3 lines × ~20px) + 28px button

**Implementation**:
```tsx
// ThreadLayoutShell.tsx line ~89
<footer
  data-inbox-composer
  className="inbox-composer shrink-0 min-h-[120px] bg-white border-t p-3 sm:p-4 space-y-2 sm:space-y-3 min-h-0"
  style={...}
>
```

**Alternatives Considered**:
- Dynamic min-height via JS: Rejected — adds complexity, CSS sufficient
- Fixed height (no flex): Rejected — prevents textarea expansion for long drafts
- No min-height: Rejected — doesn't guarantee visibility per design rule

### Decision 5: Max-Height for Unmatched Panel Expanded State

**Decision**: Cap expanded unmatched panel at `max-h-24` (~96px) with `overflow-y-auto` for internal scroll

**Rationale**:
- Design rule: expanded panel ≤~96px
- Current panel has no height cap, can grow to ~140px+ with long booking list
- Tailwind `max-h-24` = 6rem = 96px

**Implementation**: See Decision 2 code snippet

**Alternatives Considered**:
- `max-h-20` (80px): Rejected — too tight for select + button + padding
- `max-h-32` (128px): Rejected — exceeds design rule cap
- No max-height: Rejected — violates design constraint

## Best Practices

### Flexbox Layout Anti-Patterns to Avoid

1. **Implicit Flex Sizing**: Never rely on default flex behavior for critical layout zones; always explicit `flex-1`, `shrink-0`, or `grow-0`
2. **Nested Flex Overflow**: When flex parent has `overflow: hidden`, children must have `min-height: 0` or `min-width: 0` to enable scrolling
3. **Height 100% Without Explicit Parent**: `h-full` requires parent with defined height; use `flex-1` in flex containers instead
4. **Multiple Overflow Regions**: Limit to ONE scrollable zone per column to avoid scroll wars (transcript only, not chrome + transcript + composer)

### Responsive Design Patterns

1. **Mobile Composer Visibility**: On phone viewports with keyboard shown (`keyboardInsetPx > 80`), reduce textarea rows but preserve composer visibility
2. **Disclosure Defaults**: Start collapsed for low-frequency features (<10% usage); expand on user action, not page load
3. **Fixed Footer Pattern**: For always-visible UI (composer, CTAs), use `shrink-0` + `min-h-*` + sticky/fixed positioning as needed

## Testing Strategy

### Manual Testing Scenarios

1. **Desktop Unmatched Thread** (~1280×800):
   - Navigate to thread 28 (unmatched + window closed)
   - Verify composer fully visible (chips + textarea ≥2 lines + Approve&Send)
   - Verify unmatched panel collapsed by default (one-line strip)
   - Click to expand unmatched panel
   - Verify panel capped at ~96px, internal scroll if needed
   - Verify ONE care window indicator (header badge only, no composer duplicate)

2. **Desktop Matched Thread** (~1280×800):
   - Navigate to any matched thread with draft
   - Verify no regression: composer fully visible
   - Verify transcript scrolls independently

3. **Mobile Thread-Only** (~390px):
   - Navigate to thread on phone viewport
   - Verify composer usable (chips + textarea + button)
   - Tap Back, verify list restored

4. **Keyboard Open** (mobile + desktop):
   - Focus textarea, trigger software keyboard
   - Verify composer remains visible (may reduce textarea rows, but button still accessible)

### Automated Testing (if time permits)

- Vitest component test: ThreadLayoutShell with tall header content → composer remains in DOM bounds
- Vitest component test: Unmatched panel disclosure toggle (collapsed ↔ expanded)
- Visual regression test: Compare thread 28 screenshot pre/post fix

## Implementation Checklist

- [ ] Add `shrink-0` to ThreadLayoutShell header container
- [ ] Add disclosure state for unmatched panel (collapsed by default)
- [ ] Render one-line strip default, full panel on expand
- [ ] Add `max-h-24 overflow-y-auto` to expanded unmatched panel
- [ ] Remove duplicate care window notice from composer
- [ ] Add `min-h-[120px]` to composer footer
- [ ] Test desktop unmatched thread (thread 28)
- [ ] Test desktop matched thread (no regression)
- [ ] Test mobile thread-only view
- [ ] Test keyboard open scenarios
- [ ] Verify Redirect behavior unchanged
- [ ] Verify no gold banner reintroduced
- [ ] Run `npm run build` and `npm run lint`
- [ ] Capture screenshots for walkthrough artifacts
