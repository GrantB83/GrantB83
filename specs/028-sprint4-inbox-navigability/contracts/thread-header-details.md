# Component Contract: ThreadHeaderDetails

**Feature**: 028-sprint4-inbox-navigability  
**Created**: 2026-09-26  
**Component**: `ThreadHeaderDetails`

## Purpose

Details sheet/modal for editing thread contact information (Staff phone, Staff email) and viewing extended booking details.

## Props Interface

```typescript
interface ThreadHeaderDetailsProps {
  /** Whether the sheet is visible */
  isOpen: boolean
  
  /** Callback when sheet should close */
  onClose: () => void
  
  /** Thread ID for save operations */
  threadId: string
  
  /** Current staff phone value */
  initialPhone?: string
  
  /** Current staff email value */
  initialEmail?: string
  
  /** Callback when contact saved successfully */
  onSaved?: () => void
  
  /** Breakpoint for responsive layout */
  breakpoint: 'phone' | 'tablet' | 'desktop'
}
```

## Behavior

1. **Display**:
   - Phone: Bottom sheet modal (slides up from bottom, max 90vh)
   - Desktop/Tablet: Fixed overlay with centered card (max-w-md)
   - Backdrop: Semi-transparent black (`bg-black/50`)
   - Sheet: White background, rounded top corners (phone) or all corners (desktop)

2. **Content**:
   - Header: "Booking & Contact Details" with close X button
   - Staff phone input: Text input, optional, label "Staff phone"
   - Staff email input: Email input, optional, label "Staff email"
   - Save button: Primary button (navy bg-[#0A3775]), disabled if no changes
   - Cancel button: Secondary button, or click backdrop to close

3. **Validation**:
   - Email: Basic format check if provided (@ symbol, domain)
   - Phone: No strict format (international numbers vary)
   - Both fields optional
   - Save button disabled if validation fails

4. **Save Flow**:
   - POST `/api/umi/threads/[threadId]/contacts` with `{ staffPhone, staffEmail }`
   - On success: Call `onSaved()`, close sheet
   - On error: Show inline error message, keep sheet open

5. **Close Behavior**:
   - Click Cancel button → call `onClose()`
   - Click backdrop overlay → call `onClose()`
   - Press Escape key → call `onClose()`
   - Click X button → call `onClose()`

## Accessibility

- Modal: `role="dialog"`, `aria-labelledby` for header, `aria-modal="true"`
- Focus trap: Focus stays within modal when open
- Escape key: Closes modal
- First focusable element: Staff phone input
- Close button: `aria-label="Close details"`

## Styling

- Phone bottom sheet: `fixed bottom-0 left-0 right-0 bg-white rounded-t-xl z-50 max-h-[90vh] overflow-y-auto`
- Desktop overlay: `fixed inset-0 bg-black/50 z-50 flex items-center justify-center`
- Desktop card: `bg-white rounded-xl shadow-xl max-w-md w-full p-6`
- Inputs: Standard GuestFlow form inputs with labels
- Buttons: Primary (navy) for Save, secondary (outline) for Cancel

## Example Usage

```tsx
<ThreadHeaderDetails
  isOpen={isDetailsOpen}
  onClose={() => setDetailsOpen(false)}
  threadId={thread.id}
  initialPhone={thread.contact?.staffPhone}
  initialEmail={thread.contact?.staffEmail}
  onSaved={() => {
    refetchThread()
    setDetailsOpen(false)
  }}
  breakpoint={breakpoint}
/>
```

## Testing

- Opens when `isOpen` is true
- Closes when `onClose` called
- Renders phone bottom sheet on phone breakpoint
- Renders centered card on desktop/tablet breakpoint
- Populates inputs with initial values
- Validates email format
- Disables Save button when no changes or validation fails
- POST request with correct payload on Save
- Calls `onSaved` on successful save
- Shows error message on save failure
- Closes on Escape key
- Closes on backdrop click
- Focus trap works correctly
