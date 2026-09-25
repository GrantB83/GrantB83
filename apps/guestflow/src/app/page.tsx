'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CheckCircle,
  Link2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react'
import { CHANNEL_BADGES, type UmiChannel } from '@/lib/umi-channels'

interface InboxThread {
  id: number
  threadKind: 'booking' | 'temp'
  bookingId: number | null
  bookerName: string
  suite: string | null
  checkIn: string | null
  checkOut: string | null
  nightsbridgeBookingId: string | null
  lastChannel: string | null
  lastInboundChannel: string | null
  lastMessageAt: string | null
  preview: string
  pendingReply: boolean
  hasOpenDraft: boolean
  needsAttention: boolean
  sortBucket: 0 | 1 | 2
  hygieneStatus: string | null
  fromNumber: string
  careWindow?: {
    state: 'open' | 'closing_soon' | 'closed'
    label: string
    closingSoon: boolean
  }
}

interface ThreadDetail {
  id: number
  threadKind: 'booking' | 'temp'
  bookingId: number | null
  bookerName: string
  suite: string | null
  checkIn: string | null
  checkOut: string | null
  nightsbridgeBookingId: string | null
  lastChannel: string | null
  lastInboundChannel: string | null
  defaultOutboundChannel: string
  fromNumber: string
  guestPhone?: string | null
  guestEmail?: string | null
  guestPhoneSource?: string | null
  guestEmailSource?: string | null
  guestEmailKind?: string | null
  status: string
  hygieneStatus: string | null
  openDraft: { text: string; source: string; kind: string } | null
  linkCandidates: Array<{
    id: number
    guestName: string
    checkIn: string
    checkOut: string
    suite: string | null
  }>
  messages: Array<{
    id: number
    direction: 'inbound' | 'outbound'
    channel: UmiChannel | string
    sourceTag?: string | null
    senderAddress?: string | null
    body: string
    timestamp: string
    isSpam: boolean
  }>
  careWindow?: {
    state: 'open' | 'closing_soon' | 'closed'
    label: string
    closingSoon: boolean
    windowExpiresAt: string | null
  }
}

const CHANNELS: Array<{ id: string; label: string }> = [
  { id: 'whatsapp', label: 'WhatsApp Cloud' },
  { id: 'whatsapp_web', label: 'WhatsApp Web' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
]

function badge(channel?: string | null): string {
  if (channel && channel in CHANNEL_BADGES) return CHANNEL_BADGES[channel as UmiChannel]
  if (channel === 'whatsapp') return 'WhatsApp Cloud'
  return channel || 'Unknown'
}

function sendChannel(value?: string | null): string {
  if (value === 'whatsapp_cloud' || value === 'whatsapp') return 'whatsapp'
  if (value === 'whatsapp_web') return 'whatsapp_web'
  if (value === 'email') return 'email'
  if (value === 'sms') return 'sms'
  return 'whatsapp'
}

export default function InboxHomePage() {
  const [threads, setThreads] = useState<InboxThread[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ThreadDetail | null>(null)
  const [filter, setFilter] = useState<'all' | 'needs-attention'>('all')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [emailTo, setEmailTo] = useState('')
  const [linkBookingId, setLinkBookingId] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactNote, setContactNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approvedTemplates, setApprovedTemplates] = useState<
    Array<{ name: string; category: string; content_sid: string | null }>
  >([])
  const [templateEmptyReason, setTemplateEmptyReason] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})
  const [templateSid, setTemplateSid] = useState('')
  const [templateRendered, setTemplateRendered] = useState('')

  const loadInbox = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ filter })
      if (q.trim()) params.set('q', q.trim())
      const response = await fetch(`/api/umi/inbox?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setThreads(data.threads)
        if (!selectedId && data.threads[0]) setSelectedId(data.threads[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadThread = async (id: number) => {
    const response = await fetch(`/api/umi/threads/${id}`)
    const data = await response.json()
    if (data.success) {
      setDetail(data.thread)
      setDraft(data.thread.openDraft?.text || '')
      setChannel(sendChannel(data.thread.defaultOutboundChannel))
      setEmailTo(
        data.thread.guestEmail ||
          (data.thread.fromNumber?.includes('@') ? data.thread.fromNumber : '')
      )
      setContactPhone(data.thread.guestPhone || '')
      setContactEmail(data.thread.guestEmail || '')
      setContactNote(null)
      setLinkBookingId('')
      setSelectedTemplate('')
      setTemplateVars({})
      setTemplateSid('')
      setTemplateRendered('')
    }
  }

  useEffect(() => {
    loadInbox()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useEffect(() => {
    if (selectedId) loadThread(selectedId)
  }, [selectedId])

  const selected = useMemo(
    () => threads.find((thread) => thread.id === selectedId) || null,
    [threads, selectedId]
  )

  const careWindow = detail?.careWindow
  const forceTemplateMode =
    channel === 'whatsapp' &&
    (careWindow?.state === 'closed' || careWindow?.state === 'closing_soon')

  useEffect(() => {
    if (!forceTemplateMode) return
    fetch('/api/ops/wa-templates?picker=1')
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) return
        setApprovedTemplates(data.templates || [])
        setTemplateEmptyReason(data.emptyReason || '')
      })
      .catch(() => {})
  }, [forceTemplateMode, selectedId])

  useEffect(() => {
    if (!selectedTemplate || !selectedId) return
    fetch(`/api/ops/wa-templates/fill?threadId=${selectedId}&name=${encodeURIComponent(selectedTemplate)}`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) return
        setTemplateVars(data.variables || {})
        setTemplateSid(data.template?.content_sid || '')
        setTemplateRendered(data.rendered || '')
      })
      .catch(() => {})
  }, [selectedTemplate, selectedId])

  const saveDraft = async () => {
    if (!selectedId || !draft.trim()) return
    setBusy(true)
    setError(null)
    try {
      await fetch(`/api/umi/threads/${selectedId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft }),
      })
    } finally {
      setBusy(false)
    }
  }

  const approveAndSend = async () => {
    const usingTemplate = forceTemplateMode && Boolean(selectedTemplate)
    if (!selectedId) return
    if (!usingTemplate && !draft.trim()) return
    if (forceTemplateMode && careWindow?.state === 'closed' && !selectedTemplate) {
      setError('Window closed. Pick a WhatsApp-approved template (none until Grant submits).')
      return
    }
    const windowNote =
      channel === 'whatsapp' && careWindow
        ? careWindow.state === 'closed'
          ? '\n\nWARNING: WhatsApp window is closed. Free-text will be refused (409). Use an approved template.'
          : careWindow.state === 'closing_soon'
            ? '\n\nWARNING: WhatsApp window closes in about 5 minutes. Switch to a template if this send might miss the window.'
            : ''
        : ''
    const confirmed = window.confirm(
      `Approve & Send on ${CHANNELS.find((item) => item.id === channel)?.label || channel}?\n\nRedirect sinks stay on until a separate go-live CLEAR. No auto-send.${windowNote}`
    )
    if (!confirmed) return
    setBusy(true)
    setError(null)
    try {
      await saveDraft()
      await fetch(`/api/umi/threads/${selectedId}/approve`, { method: 'POST' })
      const tokenRes = await fetch('/api/inbound/confirm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: selectedId }),
      })
      const tokenData = await tokenRes.json()
      if (!tokenData.success || !tokenData.confirmToken) {
        setError(tokenData.error || 'Could not issue confirmToken. Approve first.')
        return
      }
      const sendRes = await fetch('/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: selectedId,
          confirmToken: tokenData.confirmToken,
          channel,
          body: usingTemplate ? templateRendered || draft : draft,
          to: channel === 'email' ? emailTo : detail?.fromNumber,
          subject: 'Message from The Browns',
          ...(usingTemplate && templateSid
            ? { contentSid: templateSid, contentVariables: templateVars }
            : {}),
        }),
      })
      const sendData = await sendRes.json()
      if (!sendData.success) {
        setError(sendData.details || sendData.error || 'Send failed')
        return
      }
      await loadInbox()
      await loadThread(selectedId)
    } finally {
      setBusy(false)
    }
  }

  const saveContacts = async () => {
    if (!selectedId) return
    setBusy(true)
    setError(null)
    setContactNote(null)
    try {
      const response = await fetch(`/api/umi/threads/${selectedId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: contactPhone, email: contactEmail }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Could not save contact')
        return
      }
      setContactNote(
        data.phoneApplied || data.emailApplied
          ? 'Saved staff contact (not sent)'
          : 'No change — a higher-rank source already holds this field'
      )
      await loadThread(selectedId)
    } finally {
      setBusy(false)
    }
  }

  const linkBooking = async () => {
    if (!selectedId || !linkBookingId) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/umi/threads/${selectedId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: Number(linkBookingId) }),
      })
      const data = await response.json()
      if (!data.success) {
        setError(data.error || 'Link failed')
        return
      }
      setSelectedId(data.threadId)
      await loadInbox()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-full max-w-md border-r bg-white flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Inbox
            </h1>
            <button
              onClick={() => loadInbox()}
              className="p-2 rounded hover:bg-slate-100"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && loadInbox()}
              placeholder="Search booker, suite, booking…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={filter === 'needs-attention'}
              onChange={(event) =>
                setFilter(event.target.checked ? 'needs-attention' : 'all')
              }
            />
            Needs attention
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && !loading && (
            <p className="p-6 text-sm text-slate-500">
              {filter === 'needs-attention'
                ? 'Nothing needs attention.'
                : 'No threads yet. Arrivals today/tomorrow SAST appear here once bookings exist.'}
            </p>
          )}
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setSelectedId(thread.id)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 ${
                selectedId === thread.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900 truncate">{thread.bookerName}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                  {thread.sortBucket === 0
                    ? 'Arriving'
                    : thread.sortBucket === 1
                      ? 'Pending'
                      : 'Recent'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {thread.threadKind === 'temp' ? 'Temp · ' : ''}
                {thread.suite || 'No suite'}
                {thread.checkIn ? ` · ${thread.checkIn}` : ''}
              </div>
              <div className="text-sm text-slate-700 mt-1 line-clamp-2">{thread.preview || '—'}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {thread.lastChannel && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {badge(thread.lastChannel)}
                  </span>
                )}
                {thread.hasOpenDraft && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                    Draft
                  </span>
                )}
                {thread.hygieneStatus === 'nudged' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                    Stale temp
                  </span>
                )}
                {thread.careWindow?.state === 'closed' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    WA closed
                  </span>
                )}
                {thread.careWindow?.state === 'closing_soon' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                    WA closing
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        {!detail ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select a conversation
          </div>
        ) : (
          <>
            <header className="bg-white border-b px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{detail.bookerName}</h2>
                  <p className="text-sm text-slate-600">
                    {detail.suite || 'Suite unknown'} · {detail.checkIn || '—'} → {detail.checkOut || '—'}
                    {detail.nightsbridgeBookingId ? ` · ${detail.nightsbridgeBookingId}` : ''}
                    {detail.bookingId ? ` · booking ${detail.bookingId}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Last channel: {badge(detail.lastChannel)} · Default reply: {badge(detail.defaultOutboundChannel)}
                  </p>
                  {detail.careWindow && (
                    <p
                      className={`text-xs mt-2 inline-flex px-2 py-1 rounded ${
                        detail.careWindow.state === 'closed'
                          ? 'bg-slate-200 text-slate-800'
                          : detail.careWindow.state === 'closing_soon'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {detail.careWindow.label}
                    </p>
                  )}
                  {detail.bookingId ? (
                    <div className="mt-3 text-xs text-slate-600 space-y-2 max-w-md">
                      <p>
                        Phone {detail.guestPhone || '—'}
                        {detail.guestPhoneSource ? ` · ${detail.guestPhoneSource}` : ''}
                        {' · '}
                        Email {detail.guestEmail || '—'}
                        {detail.guestEmailKind === 'relay' ? ' (relay)' : ''}
                        {detail.guestEmailSource ? ` · ${detail.guestEmailSource}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <input
                          value={contactPhone}
                          onChange={(event) => setContactPhone(event.target.value)}
                          placeholder="Staff phone"
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <input
                          value={contactEmail}
                          onChange={(event) => setContactEmail(event.target.value)}
                          placeholder="Staff email"
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={saveContacts}
                          disabled={busy}
                          className="px-2 py-1 bg-slate-800 text-white rounded disabled:opacity-50"
                        >
                          Save contact
                        </button>
                      </div>
                      {contactNote && <p className="text-emerald-700">{contactNote}</p>}
                    </div>
                  ) : null}
                </div>
                {detail.threadKind === 'temp' && (
                  <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-sm">
                    <div className="font-semibold text-amber-900 flex items-center gap-1 mb-2">
                      <Link2 className="w-3 h-3" /> Unmatched temp
                    </div>
                    <select
                      value={linkBookingId}
                      onChange={(event) => setLinkBookingId(event.target.value)}
                      className="w-full border rounded px-2 py-1 mb-2"
                    >
                      <option value="">Link to booking…</option>
                      {detail.linkCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.guestName} · {candidate.checkIn} · {candidate.suite || 'suite?'}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={linkBooking}
                      disabled={!linkBookingId || busy}
                      className="w-full bg-amber-700 text-white rounded px-2 py-1 disabled:opacity-50"
                    >
                      Link to booking
                    </button>
                  </div>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {detail.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${
                      message.direction === 'outbound'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          message.direction === 'outbound'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {badge(message.channel)}
                      </span>
                      {message.isSpam && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          Filtered
                        </span>
                      )}
                    </div>
                    {message.channel === 'email' && (
                      <p className="text-xs opacity-80 mb-1">
                        source=email · sender={message.senderAddress || detail.fromNumber}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <p className="text-[10px] opacity-70 mt-2">
                      {message.timestamp ? format(parseISO(message.timestamp), 'dd MMM HH:mm') : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <footer className="bg-white border-t p-4 space-y-3">
              {careWindow && (
                <p
                  className={`text-xs px-2 py-1 rounded ${
                    careWindow.state === 'closed'
                      ? 'bg-slate-200 text-slate-800'
                      : careWindow.state === 'closing_soon'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {careWindow.label}
                </p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {selected?.hasOpenDraft || detail.openDraft ? (
                <p className="text-xs text-amber-700">
                  In-thread draft ({detail.openDraft?.source || 'heuristic'}). Approve&Send required — never auto-sent.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setChannel(item.id)}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      channel === item.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {forceTemplateMode && (
                <div className="border rounded-lg p-3 bg-slate-50 space-y-2">
                  <p className="text-xs font-medium text-slate-800">Template mode</p>
                  <p className="text-xs text-slate-600">
                    {approvedTemplates.length === 0
                      ? templateEmptyReason ||
                        'Picker shows only templates APPROVED by WhatsApp. Grant-approved copy is stored but unsubmitted — none appear until Grant’s submit go-ahead.'
                      : 'Choose a WhatsApp-approved template. Variables are pre-filled; you can edit them.'}
                  </p>
                  <select
                    value={selectedTemplate}
                    onChange={(event) => setSelectedTemplate(event.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="">Select template…</option>
                    {approvedTemplates.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} ({item.category})
                      </option>
                    ))}
                  </select>
                  {Object.keys(templateVars).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(templateVars).map(([key, value]) => (
                        <label key={key} className="block text-xs text-slate-600">
                          {`{{${key}}}`}
                          <input
                            value={value}
                            onChange={(event) =>
                              setTemplateVars((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            className="mt-1 w-full border rounded px-2 py-1 text-sm"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {channel === 'email' && (
                <input
                  value={emailTo}
                  onChange={(event) => setEmailTo(event.target.value)}
                  placeholder="Guest email"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              )}
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                placeholder="Draft reply — edit before Approve&Send"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveDraft}
                  disabled={busy || !draft.trim()}
                  className="px-3 py-2 text-sm border rounded-lg disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  onClick={approveAndSend}
                  disabled={busy || (!draft.trim() && !selectedTemplate)}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}
