# Component Contract: ThreadComposer (Updated)

**Feature**: 028-sprint4-inbox-navigability  
**Created**: 2026-09-26  
**Component**: `ThreadComposer` (existing, with disclosure addition)

## Purpose

Message composer with channel selection, draft text, Approve&Send, and collapsible template/care section.

## Props Interface (Updated)

```typescript
interface ThreadComposerProps {
  /** Thread ID for draft/send operations */
  threadId: string
  
  /** Current draft text */
  draft: string
  
  /** Callback when draft changes */
  onDraftChange: (text: string) => void
  
  /** Available channels */
  channels: Array<{ id: string; label: string; enabled: boolean }>
  
  /** Selected channel ID */
  selectedChannel: string
  
  /** Callback when channel changes */
  onChannelChange: (channelId: string) => void
  
  /** Available templates */
  templates?: Array<{ id: string; name: string; body: string }>
  
  /** Callback when template selected */
  onTemplateSelect?: (templateId: string) => void
  
  /** Care notes value */
  careNotes?: string
  
  /** Callback when care notes change */
  onCareNotesChange?: (notes: string) => void
  
  /** Whether Approve&Send is enabled */
  canSend: boolean
  
  /** Callback when Approve&Send clicked */
  onApproveAndSend: () => void
  
  /** Loading state during send */
  isSending?: boolean
  
  /** NEW: Initial disclosure state (default collapsed) */
  defaultDisclosureExpanded?: boolean
}
```

## Behavior (Updated)

1. **Default Layout (Collapsed)**:
   - Channel chips: Horizontal radio group, all channels visible
   - Draft textarea: Multi-line, auto-grow up to max height
   - Approve & Send button: Primary button (navy), disabled when `!canSend`
   - Template & Care toggle: Button with chevron icon, shows "Template & Care ▼"

2. **Expanded Layout**:
   - Toggle button shows "Template & Care ▲"
   - Template selector: Dropdown or select, appears above draft textarea
   - Care notes: Textarea below template selector, smaller than draft
   - Channel chips, draft, and Approve&Send remain visible

3. **Height Constraints**:
   - Default (collapsed): Target ≤35% of thread column height
   - Maximum (expanded or keyboard visible): ≤50% of thread column height (existing #235 floor)
   - Scrollable if content exceeds max height

4. **Disclosure State**:
   - Client-side React state (useState)
   - Optional: Persist to localStorage (`guestflow-composer-disclosure-expanded`)
   - Default: collapsed (`defaultDisclosureExpanded` defaults to false)

5. **Existing Behavior (Unchanged)**:
   - Channel selection updates `selectedChannel`
   - Draft auto-saves on change (debounced)
   - Approve&Send shows confirmation dialog (InboxConfirmDialog)
   - Keyboard inset handling for phone (visualViewport)

## Accessibility

- Channel chips: `role="radiogroup"`, each chip `role="radio"`
- Template selector: Standard `<select>` with label
- Draft textarea: `aria-label="Message draft"`
- Care textarea: `aria-label="Care notes (staff only)"`
- Approve & Send button: `aria-label="Approve and send message"`
- Template & Care toggle: `aria-expanded={isExpanded}`, `aria-controls="template-care-section"`

## Styling

- Container: `bg-white border-t p-3 sm:p-4 space-y-2 sm:space-y-3`
- Channel chips: Inline pills, selected has navy bg, unselected has border
- Draft textarea: `min-h-[80px]` with auto-grow
- Approve & Send: Navy bg `bg-[#0A3775]`, white text, disabled state grayed
- Template & Care toggle: Secondary button style with chevron icon
- Expanded section: `space-y-2` stack, subtle border-t to separate from main controls

## Example Usage

```tsx
<ThreadComposer
  threadId={thread.id}
  draft={draft}
  onDraftChange={setDraft}
  channels={[
    { id: 'wa-cloud', label: 'WhatsApp Cloud', enabled: true },
    { id: 'wa-web', label: 'WhatsApp Web', enabled: true },
    { id: 'email', label: 'Email', enabled: false },
    { id: 'sms', label: 'SMS', enabled: false },
  ]}
  selectedChannel={selectedChannel}
  onChannelChange={setSelectedChannel}
  templates={templates}
  onTemplateSelect={handleTemplateSelect}
  careNotes={careNotes}
  onCareNotesChange={setCareNotes}
  canSend={draft.trim().length > 0}
  onApproveAndSend={handleApproveAndSend}
  isSending={isSending}
  defaultDisclosureExpanded={false}
/>
```

## Testing

- Renders collapsed by default
- Toggle button expands/collapses template & care section
- Collapsed height ≤35% of available space
- Expanded height ≤50% of available space (respects #235 floor)
- Channel selection works
- Draft text updates on input
- Template selection inserts template body into draft
- Care notes saved independently
- Approve & Send disabled when `!canSend`
- Approve & Send shows confirmation dialog
- Disclosure state persists to localStorage (optional)
- Keyboard inset handling on phone (existing behavior maintained)
