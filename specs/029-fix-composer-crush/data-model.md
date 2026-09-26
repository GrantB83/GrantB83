# Data Model: Fix Composer Crush on Unmatched/Window-Closed Threads

**Date**: 2026-09-26  
**Feature**: [spec.md](./spec.md)

## Component State Model

### ThreadLayoutShell Component

**File**: `apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx`

**Props** (existing, no changes):
```typescript
interface ThreadLayoutShellProps {
  showBack: boolean
  onBack: () => void
  title?: ReactNode              // Legacy (deprecated, use compactHeader)
  facts?: ReactNode              // Legacy
  channelLine?: ReactNode        // Legacy
  headerBadgeSlot?: ReactNode    // Legacy
  headerActionsSlot?: ReactNode  // Legacy
  extraHeader?: ReactNode        // Legacy
  compactHeader?: ReactNode      // Sprint 4 pattern (used for unmatched panel)
  messages: ReactNode            // Transcript content
  composer: ReactNode            // Composer content
  minMessageHeight?: number      // US1: ≥240px or ≥35% shell (from useShellDimensions)
  maxComposerHeight?: number     // US4: ≤50% shell (from useShellDimensions)
}
```

**Layout Zones**:
- **Zone A (Chrome)**: `compactHeader` prop content (ThreadHeader + unmatched panel)
- **Zone B (Transcript)**: `messages` prop content
- **Zone C (Composer)**: `composer` prop content

**Flex Constraints** (changes):
- Header container: Add `shrink-0` class (flex-shrink: 0)
- Messages container: Existing `flex-1 min-h-0` (no change)
- Composer footer: Add `min-h-[120px]` class + existing `shrink-0`

---

### Inbox Page Component State

**File**: `apps/guestflow/src/app/page.tsx`

**New State** (add):
```typescript
const [unmatchedExpanded, setUnmatchedExpanded] = useState(false)
```

**Purpose**: Controls unmatched panel disclosure (collapsed by default, expand on user click)

**Lifecycle**:
- **Initialize**: `false` (collapsed) on thread load
- **Expand**: User clicks one-line strip → `setUnmatchedExpanded(true)`
- **Collapse**: User clicks collapse button (optional) → `setUnmatchedExpanded(false)`
- **Reset**: On thread change (`selectedId` changes), reset to `false`

**Validation Rules**: None (boolean flag)

---

### ThreadHeader Component

**File**: `apps/guestflow/src/components/inbox/ThreadHeader.tsx`

**Props** (existing, no changes):
```typescript
interface ThreadHeaderProps {
  guestName: string
  suiteName: string | null
  checkIn: string | null
  checkOut: string | null
  nbRef: string | null
  lastChannel: string | null
  badge?: ReactNode              // Care window chip + arrival stage
  showDetailsButton?: boolean
  onDetailsClick?: () => void
  showBack?: boolean
  onBack?: () => void
}
```

**Badge Content** (existing pattern, no state changes):
- Arrival stage chip (e.g., "Arriving")
- Care window chip (e.g., "Window closed", "WA closing")

**Height Constraint**: ≤1-2 lines (name + facts + lastChannel + badge row)

---

### ThreadDetail Entity

**File**: `apps/guestflow/src/components/inbox/inbox-types.ts`

**Interface** (existing, no changes):
```typescript
interface ThreadDetail {
  id: number
  bookerName: string
  suite: string | null
  checkIn: string | null
  checkOut: string | null
  nightsbridgeBookingId: string | null
  lastChannel: string | null
  threadKind: 'booking' | 'temp'        // 'temp' = unmatched
  bookingId: number | null
  fromNumber: string
  guestPhone: string | null
  guestEmail: string | null
  defaultOutboundChannel: string | null
  openDraft: { text: string; source: string } | null
  messages: Array<ThreadMessage>
  linkCandidates: Array<{             // Booking options for unmatched panel
    id: number
    guestName: string
    checkIn: string
    suite: string | null
  }>
  careWindow: {                       // Window status
    state: 'open' | 'closing_soon' | 'closed'
    label: string
  } | null
  arrivalStage: string | null
}
```

**Relevant Fields for Composer Crush Fix**:
- `threadKind`: Determines if unmatched panel is rendered
- `linkCandidates`: Populates unmatched panel dropdown
- `careWindow`: Determines care status badge (header only, no composer duplicate)

---

## State Transitions

### Unmatched Panel Disclosure

```
┌─────────────────────────────────────────────────┐
│ Thread Load (threadKind === 'temp')             │
└─────────────────┬───────────────────────────────┘
                  │
                  v
         ┌────────────────┐
         │ unmatchedExpanded │
         │ = false          │  (Initial: collapsed one-line strip)
         └────────┬─────────┘
                  │
         User clicks strip
                  │
                  v
         ┌────────────────┐
         │ unmatchedExpanded │
         │ = true           │  (Expanded: dropdown + button, max-h-24)
         └────────┬─────────┘
                  │
      Optional: User clicks collapse
                  │
                  v
         ┌────────────────┐
         │ unmatchedExpanded │
         │ = false          │  (Back to collapsed)
         └──────────────────┘
```

### Thread Selection

```
User selects thread
      │
      v
loadThread(id) → applyDetail()
      │
      v
Reset unmatchedExpanded = false
      │
      v
Render ThreadLayoutShell with compactHeader:
  - ThreadHeader (Zone A)
  - Unmatched panel if temp (Zone A, collapsed default)
  - Messages (Zone B)
  - Composer (Zone C)
```

---

## Validation Rules

### Layout Constraints

1. **Chrome Zone (A)**: 
   - Thread header ≤ 2 lines (name + facts + channel + badge)
   - Unmatched panel collapsed: 1 line (~48px)
   - Unmatched panel expanded: ≤96px (`max-h-24`)
   - Total chrome height: ~100-150px typical, max ~200px when expanded

2. **Transcript Zone (B)**:
   - Must have `min-h-0` to enable flex shrinking
   - Must be only zone with `overflow-y: auto`
   - Height: flexible (`flex-1`), fills remaining space between chrome and composer

3. **Composer Zone (C)**:
   - Min height: 120px (chips 32px + textarea 60px + button 28px)
   - Must always be fully visible in viewport
   - Must not scroll off-screen

### Responsive Behavior

- **Desktop (~1280×800)**: All 3 zones visible simultaneously
- **Mobile (~390px, keyboard open)**: Reduce textarea rows (2 instead of 4), but keep composer min-height
- **Mobile (~390px, thread-only)**: Hide list, show thread with Back button

---

## Data Flow

```
page.tsx (InboxHomePageInner)
  │
  ├─ State: unmatchedExpanded (new)
  │   └─ Controls unmatched panel disclosure
  │
  ├─ State: detail (ThreadDetail)
  │   └─ From API: /api/umi/threads/:id
  │
  └─ Render: ThreadLayoutShell
      ├─ compactHeader prop:
      │   ├─ ThreadHeader (props: guestName, badge, etc.)
      │   └─ Unmatched panel if detail.threadKind === 'temp'
      │       ├─ Collapsed: one-line strip button
      │       └─ Expanded: dropdown + link button (max-h-24)
      │
      ├─ messages prop:
      │   └─ detail.messages.map(...)
      │
      └─ composer prop:
          ├─ Care window notice (REMOVE if duplicate)
          ├─ Error/draft notices
          ├─ Channel chips
          ├─ Template disclosure (optional)
          ├─ Email input (if channel === 'email')
          ├─ Textarea (draft)
          └─ Save draft + Approve&Send buttons
```

---

## Edge Cases

1. **Long Booking List**: If `linkCandidates.length > 10`, expanded unmatched panel scrolls internally (`overflow-y-auto`, capped at 96px)
2. **No Link Candidates**: Show "No bookings found" message in expanded panel
3. **Matched Thread**: `threadKind === 'booking'` → no unmatched panel rendered
4. **Keyboard Open**: `keyboardInsetPx > 80` → reduce textarea rows, but min-h-[120px] still reserves space
5. **Care Window Closed + Unmatched**: Show care badge in header only, NOT in composer (deduplicate)
