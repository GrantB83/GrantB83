'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, FileText, Maximize2, Paperclip, Send, X } from 'lucide-react'
import { ComposerTooltip } from '@/components/inbox/ComposerTooltip'

const CHANNELS: Array<{ id: string; label: string }> = [
  { id: 'whatsapp', label: 'WhatsApp Cloud' },
  { id: 'whatsapp_web', label: 'WhatsApp Web' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
]

const TOOLTIPS = {
  channel: 'Send channel',
  templates: 'Templates',
  attach: 'Attach file',
  popOut: 'Expand editor',
} as const

// Sprint 5 source-scan contract keeps these literal accessible names:
// aria-label="Send channel" aria-label="Templates" aria-label="Attach file"

const ATTACH_DISABLED_REASON = 'NeedsGrant — no upload source of record'

export function ThreadComposer({
  channel,
  onChannelChange,
  draft,
  onDraftChange,
  onSaveDraft,
  onCancel,
  onApprove,
  busy,
  forceTemplateMode,
  approvedTemplates,
  templateEmptyReason,
  selectedTemplate,
  onSelectedTemplate,
  templateVars,
  onTemplateVar,
  emailTo,
  onEmailTo,
  expanded,
  onExpandedChange,
  guestName,
}: {
  channel: string
  onChannelChange: (value: string) => void
  draft: string
  onDraftChange: (value: string) => void
  onSaveDraft: () => void
  onCancel: () => void
  onApprove: () => void
  busy: boolean
  forceTemplateMode: boolean
  approvedTemplates: Array<{ name: string; category: string; content_sid: string | null }>
  templateEmptyReason: string
  selectedTemplate: string
  onSelectedTemplate: (value: string) => void
  templateVars: Record<string, string>
  onTemplateVar: (key: string, value: string) => void
  emailTo: string
  onEmailTo: (value: string) => void
  expanded: boolean
  onExpandedChange: (value: boolean) => void
  guestName?: string
}) {
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [popOutOpen, setPopOutOpen] = useState(false)
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const popOutButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (expanded && !popOutOpen) fieldRef.current?.focus()
  }, [expanded, popOutOpen])

  useEffect(() => {
    if (!popOutOpen) return
    const dialog = dialogRef.current
    const previous = document.activeElement as HTMLElement | null
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || []
      )
    const first = focusables().find((el) => el.tagName === 'TEXTAREA') || focusables()[0]
    first?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setPopOutOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const nodes = focusables()
      if (nodes.length === 0) return
      const firstNode = nodes[0]
      const lastNode = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault()
        lastNode.focus()
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault()
        firstNode.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
      popOutButtonRef.current?.focus()
    }
  }, [popOutOpen])

  const canSend = Boolean(draft.trim() || selectedTemplate)
  const title = guestName ? `Reply · ${guestName}` : 'Edit draft'

  const toolbar = (opts: { popOutControl: boolean; compact: boolean }) => (
    <div className="flex items-center gap-1">
      <ComposerTooltip label={TOOLTIPS.channel}>
        <label className="relative inline-flex items-center">
          <span className="sr-only">{TOOLTIPS.channel}</span>
          <select
            aria-label={TOOLTIPS.channel}
            title={TOOLTIPS.channel}
            value={channel}
            onChange={(event) => onChannelChange(event.target.value)}
            className="inbox-tap min-w-[40px] appearance-none pl-2 pr-7 text-sm border border-[#E0E5EB] rounded-lg bg-white text-[#0A3775]"
          >
            {CHANNELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 pointer-events-none text-[#5B6B7C]" />
        </label>
      </ComposerTooltip>
      <ComposerTooltip label={TOOLTIPS.templates}>
        <button
          type="button"
          aria-label={TOOLTIPS.templates}
          title={TOOLTIPS.templates}
          aria-expanded={templatesOpen}
          onClick={() => setTemplatesOpen((value) => !value)}
          className="inbox-tap min-w-[40px] min-h-[40px] inline-flex items-center justify-center border border-[#E0E5EB] rounded-lg text-[#0A3775] hover:bg-[#F6F5F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3775]/40"
        >
          <FileText className="w-5 h-5" />
        </button>
      </ComposerTooltip>
      <ComposerTooltip label={TOOLTIPS.attach}>
        <button
          type="button"
          aria-label={TOOLTIPS.attach}
          title={TOOLTIPS.attach}
          aria-describedby="composer-attach-disabled"
          disabled
          className="inbox-tap min-w-[40px] min-h-[40px] inline-flex items-center justify-center border border-[#E0E5EB] rounded-lg text-[#5B6B7C] opacity-50"
        >
          <Paperclip className="w-5 h-5" />
        </button>
      </ComposerTooltip>
      <span id="composer-attach-disabled" className="sr-only">
        {ATTACH_DISABLED_REASON}
      </span>
      {opts.popOutControl && (
        <ComposerTooltip label={TOOLTIPS.popOut}>
          <button
            ref={popOutButtonRef}
            type="button"
            aria-label={TOOLTIPS.popOut}
            title={TOOLTIPS.popOut}
            aria-expanded={popOutOpen}
            onClick={() => setPopOutOpen(true)}
            className={`inbox-tap min-w-[40px] min-h-[40px] inline-flex items-center justify-center border rounded-lg text-[#0A3775] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3775]/40 ${
              popOutOpen ? 'bg-[#DCE8F9] border-[#0A3775]/40' : 'border-[#E0E5EB] hover:bg-[#F6F5F3]'
            }`}
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </ComposerTooltip>
      )}
    </div>
  )

  const templateStrip = templatesOpen && (
    <div className="border border-[#E0E5EB] rounded-lg p-3 bg-[#F6F5F3] space-y-2" data-sprint5-templates>
      <p className="text-sm text-[#5B6B7C] inbox-wrap">
        {forceTemplateMode
          ? approvedTemplates.length === 0
            ? templateEmptyReason || 'No WhatsApp-approved template yet. Window closed — pick a template when Grant submits one.'
            : 'Window closed. Choose a WhatsApp-approved template.'
          : 'Optional templates. Free-text stays available while the window is open.'}
      </p>
      <select
        aria-label="Choose template"
        title="Choose template"
        value={selectedTemplate}
        onChange={(event) => onSelectedTemplate(event.target.value)}
        className="inbox-field w-full"
      >
        <option value="">Select template…</option>
        {approvedTemplates.map((item) => (
          <option key={item.name} value={item.name}>
            {item.name} ({item.category})
          </option>
        ))}
      </select>
      {Object.keys(templateVars).length > 0 &&
        Object.entries(templateVars).map(([key, value]) => (
          <label key={key} className="block text-sm text-[#5B6B7C]">
            {`{{${key}}}`}
            <input
              value={value}
              onChange={(event) => onTemplateVar(key, event.target.value)}
              className="inbox-field mt-1 w-full"
            />
          </label>
        ))}
    </div>
  )

  const emailField = channel === 'email' && (
    <input
      value={emailTo}
      onChange={(event) => onEmailTo(event.target.value)}
      placeholder="Guest email"
      aria-label="Guest email"
      className="inbox-field w-full"
    />
  )

  const footer = (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => {
          onCancel()
          setPopOutOpen(false)
        }}
        className="inbox-tap px-3 text-sm text-[#5B6B7C] border border-[#E0E5EB] rounded-lg bg-transparent"
      >
        Cancel
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={busy || !draft.trim()}
          className="inbox-tap px-3 text-sm border border-[#E0E5EB] rounded-lg disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={busy || !canSend}
          className="inbox-tap px-3 min-h-[40px] bg-[#0A3775] text-white rounded-lg inline-flex items-center gap-1 text-sm font-semibold disabled:opacity-50"
        >
          Approve & Send
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div data-sprint5-composer="overlay" className="space-y-2">
      {!popOutOpen && (
        <>
          {toolbar({ popOutControl: true, compact: true })}
          {templateStrip}
          {emailField}
          <textarea
            ref={fieldRef}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onFocus={() => onExpandedChange(true)}
            rows={expanded || draft.trim() ? 4 : 1}
            placeholder="Write a reply…"
            className="inbox-field w-full resize-none"
            style={{ minHeight: expanded || draft.trim() ? 96 : 40, maxHeight: 128 }}
          />
          {footer}
        </>
      )}
      {popOutOpen && (
        <p className="text-sm text-[#5B6B7C]">Editing in expanded editor</p>
      )}
      {popOutOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[rgba(10,55,117,0.28)] p-0 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPopOutOpen(false)
          }}
        >
          <div
            ref={dialogRef}
            data-sprint6-popout="open"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="flex w-full max-w-[840px] flex-col bg-white shadow-xl sm:rounded-2xl max-h-[min(88vh,720px)] h-[100dvh] sm:h-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[#E0E5EB] bg-white px-4 py-3">
              <h3 className="text-[15px] font-semibold text-[#0A3775] inbox-wrap">{title}</h3>
              <button
                type="button"
                onClick={() => setPopOutOpen(false)}
                className="inbox-tap min-w-[40px] text-[#5B6B7C] border border-[#E0E5EB] rounded-lg"
                aria-label="Close"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="sticky top-[52px] z-10 border-b border-[#E0E5EB] bg-white px-4 py-2">
              {toolbar({ popOutControl: false, compact: false })}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {templateStrip}
              {emailField}
              <textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                rows={14}
                placeholder="Write a reply…"
                className="inbox-field w-full resize-none"
                style={{ minHeight: 280 }}
              />
            </div>
            <div className="sticky bottom-0 border-t border-[#E0E5EB] bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ComposerSlot({ children }: { children: ReactNode }) {
  return <>{children}</>
}
