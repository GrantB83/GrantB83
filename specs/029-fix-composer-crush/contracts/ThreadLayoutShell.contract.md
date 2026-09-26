# Component Contract: ThreadLayoutShell

**File**: `apps/guestflow/src/components/inbox/ThreadLayoutShell.tsx`

**Purpose**: 3-zone flex layout for inbox thread view (Chrome → Transcript → Composer)

## Interface

```typescript
interface ThreadLayoutShellProps {
  // Navigation
  showBack: boolean               // Show Back button (mobile only)
  onBack: () => void              // Back button callback

  // Header content (legacy props - prefer compactHeader)
  title?: ReactNode
  facts?: ReactNode
  channelLine?: ReactNode
  headerBadgeSlot?: ReactNode
  headerActionsSlot?: ReactNode
  extraHeader?: ReactNode

  // Header content (Sprint 4 pattern)
  compactHeader?: ReactNode       // Preferred: replaces legacy header props

  // Content zones
  messages: ReactNode             // Zone B: transcript content
  composer: ReactNode             // Zone C: composer content

  // Layout constraints (from useShellDimensions)
  minMessageHeight?: number       // Transcript min-height (≥240px or ≥35% shell)
  maxComposerHeight?: number      // Composer max-height (≤50% shell)
}

export function ThreadLayoutShell(props: ThreadLayoutShellProps): JSX.Element
export function ThreadBubbleStatusSlot({ children }: { children?: ReactNode }): JSX.Element
```

## Usage

### Basic (Matched Thread)

```tsx
<ThreadLayoutShell
  showBack={breakpoint === 'phone'}
  onBack={closeThread}
  compactHeader={
    <ThreadHeader
      guestName="John Doe"
      suiteName="Luxury Suites - Master"
      checkIn="2026-09-26"
      checkOut="2026-09-28"
      nbRef="NB-1234"
      lastChannel="whatsapp"
      badge={<span className="...">Arriving</span>}
    />
  }
  messages={
    <>
      <MessageBubble direction="inbound" text="Hello" />
      <MessageBubble direction="outbound" text="Welcome!" />
    </>
  }
  composer={
    <>
      <ChannelChips />
      <textarea />
      <ApproveAndSendButton />
    </>
  }
  minMessageHeight={240}
  maxComposerHeight={400}
/>
```

### Advanced (Unmatched Thread with Disclosure)

```tsx
const [unmatchedExpanded, setUnmatchedExpanded] = useState(false)

<ThreadLayoutShell
  showBack={breakpoint === 'phone'}
  onBack={closeThread}
  compactHeader={
    <>
      <ThreadHeader
        guestName="+27722219581"
        suiteName={null}
        checkIn={null}
        checkOut={null}
        nbRef={null}
        lastChannel="whatsapp_web"
        badge={<span className="...">Window closed</span>}
      />
      {!unmatchedExpanded && (
        <button 
          onClick={() => setUnmatchedExpanded(true)}
          className="text-base bg-amber-50 border border-amber-200 rounded-lg p-3 m-3"
        >
          Unmatched — Link to booking ▾
        </button>
      )}
      {unmatchedExpanded && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 m-3 max-h-24 overflow-y-auto">
          <select>{/* booking options */}</select>
          <button>Link to booking</button>
        </div>
      )}
    </>
  }
  messages={/* ... */}
  composer={/* ... */}
/>
```

## Layout Contract

### DOM Structure

```html
<div class="flex h-full min-h-0 flex-col overflow-hidden">
  <!-- Zone A: Chrome (flex: 0 0 auto) -->
  <header class="inbox-thread-header shrink-0 bg-white border-b ...">
    {compactHeader || legacyHeaderProps}
  </header>

  <!-- Zone B: Transcript (flex: 1 1 auto) -->
  <div class="inbox-thread-messages flex-1 overflow-y-auto ... min-h-0"
       style="minHeight: {minMessageHeight}px">
    {messages}
  </div>

  <!-- Zone C: Composer (flex: 0 0 auto) -->
  <footer class="inbox-composer shrink-0 min-h-[120px] bg-white border-t ..."
          style="maxHeight: {maxComposerHeight}px">
    {composer}
  </footer>
</div>
```

### CSS Classes (Tailwind)

**Parent Container**:
- `flex h-full min-h-0 flex-col overflow-hidden`
- Height: 100% of parent (InboxLayoutShell work column)
- Flex direction: column (Chrome → Transcript → Composer vertical stack)
- Overflow: hidden (zones manage own overflow)

**Zone A (Chrome)**:
- `shrink-0` (flex-shrink: 0) — **NEW**: prevents shrinking
- `bg-white border-b` — visual styling
- Max height: ~200px when unmatched panel expanded

**Zone B (Transcript)**:
- `flex-1` (flex: 1 1 auto) — grows to fill remaining space
- `overflow-y-auto` — scrolls independently
- `min-h-0` — allows flex shrinking below content height
- `style.minHeight` — dynamic min-height from useShellDimensions (≥240px or ≥35%)

**Zone C (Composer)**:
- `shrink-0` (flex-shrink: 0) — prevents shrinking
- `min-h-[120px]` — **NEW**: reserves minimum space (chips + textarea + button)
- `bg-white border-t` — visual styling
- `style.maxHeight` — dynamic max-height from useShellDimensions (≤50%)

## Constraints

1. **Chrome Height**: Must be capped to prevent composer push-off
   - Thread header: ≤2 lines (~64px)
   - Unmatched panel collapsed: 1 line (~48px)
   - Unmatched panel expanded: ≤96px (`max-h-24`)
   - Total chrome: ~100-200px

2. **Transcript Scroll**: ONLY zone with `overflow-y: auto`
   - Chrome and Composer: no scroll
   - Transcript: scroll independently

3. **Composer Visibility**: Always fully visible (min-height reserved)
   - Min-height: 120px (chips 32px + textarea 60px + button 28px)
   - Never scrolls off-screen
   - May have internal `maxHeight` for very long drafts

4. **Responsive**:
   - Desktop (~1280×800): All zones visible simultaneously
   - Mobile (~390px): Same layout, reduce textarea rows if keyboard open

## Validation

**Pass Criteria**:
- [ ] On desktop, composer min-height 120px always visible
- [ ] On desktop unmatched thread, chrome ≤200px (collapsed ≤150px)
- [ ] Transcript scrolls independently (other zones fixed)
- [ ] Mobile thread-only shows usable composer
- [ ] No layout shift when expanding unmatched panel

**Fail Scenarios**:
- ❌ Composer clipped off-screen (shrink-0 missing)
- ❌ Chrome grows >250px (unmatched panel not capped)
- ❌ Multiple scroll regions (transcript + chrome + composer)
- ❌ Composer shrinks below 120px (min-h missing)

## Migration Notes

**Sprint 4 Pattern**: `compactHeader` prop is preferred over legacy `title`/`facts`/`channelLine` props.

**Breaking Changes**: None (backward compatible)

**Deprecation**: Legacy header props will be removed in a future sprint once all call sites migrate to `compactHeader`.
