# Component Contract: ThreadHeader

**Feature**: 028-sprint4-inbox-navigability  
**Created**: 2026-09-26  
**Component**: `ThreadHeader`

## Purpose

Compact thread header component displaying guest/booking identity with optional Details button to access contact editing.

## Props Interface

```typescript
interface ThreadHeaderProps {
  /** Guest display name */
  guestName: string
  
  /** Accommodation suite name */
  suiteName: string
  
  /** Check-in date */
  checkIn: Date
  
  /** Check-out date */
  checkOut: Date
  
  /** Nightsbridge booking reference (format: NB-XXXX) */
  nbRef: string
  
  /** Last communication channel used */
  lastChannel: string
  
  /** Optional badge (e.g., "Window closed") */
  badge?: React.ReactNode
  
  /** Whether to show Details button */
  showDetailsButton?: boolean
  
  /** Callback when Details button clicked */
  onDetailsClick?: () => void
  
  /** Whether to show Back button (phone only) */
  showBack?: boolean
  
  /** Callback when Back button clicked */
  onBack?: () => void
}
```

## Behavior

1. **Display**:
   - Line 1: `{guestName}` (text-lg font-semibold)
   - Line 2: `{suiteName} · {checkIn} → {checkOut} · {nbRef}` (text-base text-slate-600)
   - Line 3: `{lastChannel}` (text-base text-slate-500)
   - Optional badge displayed to the right (e.g., "Window closed")

2. **Height Target**: ≤96-120px total height (collapsed state)

3. **Back Button**: 
   - Only visible when `showBack` is true (phone breakpoint)
   - ArrowLeft icon, positioned left of guest name
   - Calls `onBack` when clicked

4. **Details Button**:
   - Only visible when `showDetailsButton` is true
   - Positioned to the right of the header facts
   - Label: "Details" or small info icon
   - Calls `onDetailsClick` when clicked

## Accessibility

- Back button: `aria-label="Back to inbox list"`
- Details button: `aria-label="View booking and contact details"`
- Header semantic: `<header>` tag with appropriate heading levels

## Styling

- Background: `bg-white`
- Border: `border-b` (bottom border)
- Padding: `px-3 py-2 sm:px-5 sm:py-4` (responsive)
- Text colors: slate-900 (name), slate-600 (facts), slate-500 (channel)
- Font: Existing GuestFlow typography (Montserrat)

## Example Usage

```tsx
<ThreadHeader
  guestName="Alex Guest"
  suiteName="Cottage A"
  checkIn={new Date('2026-10-01')}
  checkOut={new Date('2026-10-04')}
  nbRef="NB-4401"
  lastChannel="WhatsApp Web"
  badge={<span className="text-sm text-slate-500">Window closed</span>}
  showDetailsButton={true}
  onDetailsClick={() => setDetailsOpen(true)}
  showBack={isPhone}
  onBack={handleBack}
/>
```

## Testing

- Renders all required fields correctly
- Formats dates consistently (e.g., "2026-10-01 → 2026-10-04" or "Oct 1 → 4, 2026")
- Shows/hides Back button based on `showBack` prop
- Shows/hides Details button based on `showDetailsButton` prop
- Calls `onDetailsClick` when Details clicked
- Calls `onBack` when Back clicked
- Height ≤120px in standard layouts
