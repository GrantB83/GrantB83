'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, FileText, Paperclip, Send } from 'lucide-react'

const CHANNELS: Array<{ id: string; label: string }> = [
  { id: 'whatsapp', label: 'WhatsApp Cloud' },
  { id: 'whatsapp_web', label: 'WhatsApp Web' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
]

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
}) {
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const fieldRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (expanded) fieldRef.current?.focus()
  }, [expanded])

  const canSend = Boolean(draft.trim() || selectedTemplate)

  return (
    <div data-sprint5-composer="overlay" className="space-y-2">
      <div className="flex items-center gap-1">
        <label className="relative inline-flex items-center">
          <span className="sr-only">Channel</span>
          <select
            aria-label="Channel"
            value={channel}
            onChange={(event) => onChannelChange(event.target.value)}
            className="inbox-tap min-w-[40px] appearance-none pl-2 pr-7 text-sm border rounded-lg bg-white text-[#0A3775]"
          >
            {CHANNELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 pointer-events-none text-[#5B6B7C]" />
        </label>
        <button
          type="button"
          aria-label="Templates"
          aria-expanded={templatesOpen}
          onClick={() => setTemplatesOpen((value) => !value)}
          className="inbox-tap min-w-[40px] min-h-[40px] inline-flex items-center justify-center border rounded-lg text-[#0A3775]"
        >
          <FileText className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Attach"
          title="Attach (NeedsGrant — no upload source of record)"
          disabled
          className="inbox-tap min-w-[40px] min-h-[40px] inline-flex items-center justify-center border rounded-lg text-[#5B6B7C] opacity-50"
        >
          <Paperclip className="w-5 h-5" />
        </button>
      </div>

      {templatesOpen && (
        <div className="border rounded-lg p-3 bg-[#F6F5F3] space-y-2" data-sprint5-templates>
          <p className="text-sm text-[#5B6B7C] inbox-wrap">
            {forceTemplateMode
              ? approvedTemplates.length === 0
                ? templateEmptyReason || 'No WhatsApp-approved template yet. Window closed — pick a template when Grant submits one.'
                : 'Window closed. Choose a WhatsApp-approved template.'
              : 'Optional templates. Free-text stays available while the window is open.'}
          </p>
          <select
            aria-label="Message template"
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
      )}

      {channel === 'email' && (
        <input
          value={emailTo}
          onChange={(event) => onEmailTo(event.target.value)}
          placeholder="Guest email"
          aria-label="Guest email"
          className="inbox-field w-full"
        />
      )}

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

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inbox-tap px-3 text-sm text-[#5B6B7C] border border-[#E0E5EB] rounded-lg bg-transparent"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={busy || !draft.trim()}
            className="inbox-tap px-3 text-sm border rounded-lg disabled:opacity-50"
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
    </div>
  )
}

export function ComposerSlot({ children }: { children: ReactNode }) {
  return <>{children}</>
}
