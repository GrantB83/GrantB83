'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
import { InboxConfirmDialog } from '@/components/inbox/InboxConfirmDialog'
import { InboxLayoutShell } from '@/components/inbox/InboxLayoutShell'
import { OutboundDeliveryBubble } from '@/components/inbox/OutboundDeliveryBubble'
import { ThreadLayoutShell } from '@/components/inbox/ThreadLayoutShell'
import { FIXTURE_DETAILS, FIXTURE_THREADS } from '@/components/inbox/inbox-fixture'
import type { InboxThread, ThreadDetail } from '@/components/inbox/inbox-types'
import { useInboxBreakpoint } from '@/components/inbox/useInboxBreakpoint'
import { useInboxChromeOffset } from '@/components/inbox/useInboxChromeOffset'
import { useVisualViewportInset } from '@/components/inbox/useVisualViewportInset'

const CHANNELS: Array<{ id: string; label: string }> = [
  { id: 'whatsapp', label: 'WhatsApp Cloud' },
  { id: 'whatsapp_web', label: 'WhatsApp Web' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
]

const LIST_SCROLL_KEY = 'inbox-list-scroll'

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

function InboxHomePageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { breakpoint, ready } = useInboxBreakpoint()
  const chromeOffset = useInboxChromeOffset()
  const useFixture = searchParams.get('fixture') === '1'
  const keyboardSim = searchParams.get('keyboard') === '1'
  const threadParam = searchParams.get('thread')
  const keyboardInsetPx = useVisualViewportInset(keyboardSim)

  const [threads, setThreads] = useState<InboxThread[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ThreadDetail | null>(null)
  const [filter, setFilter] = useState<'all' | 'needs-attention'>('all')
  const [q, setQ] = useState(searchParams.get('q') || '')
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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resendConfirm, setResendConfirm] = useState<{ messageId: number; stuck: boolean } | null>(
    null
  )
  const [listCollapsed, setListCollapsed] = useState(false)
  const listScrollRef = useRef<HTMLDivElement>(null)
  const pushedThreadRef = useRef(false)

  const writeQuery = (id: number | null, mode: 'push' | 'replace') => {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set('thread', String(id))
    else params.delete('thread')
    const query = params.toString()
    const url = query ? `${pathname}?${query}` : pathname
    if (mode === 'push') router.push(url)
    else router.replace(url, { scroll: false })
  }

  const syncSearchParam = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) params.set('q', value.trim())
    else params.delete('q')
    const query = params.toString()
    const url = query ? `${pathname}?${query}` : pathname
    router.replace(url, { scroll: false })
  }

  const rememberListScroll = () => {
    if (listScrollRef.current) {
      sessionStorage.setItem(LIST_SCROLL_KEY, String(listScrollRef.current.scrollTop))
    }
  }

  const restoreListScroll = () => {
    const stored = Number(sessionStorage.getItem(LIST_SCROLL_KEY) || '0')
    requestAnimationFrame(() => {
      if (listScrollRef.current) listScrollRef.current.scrollTop = stored
    })
  }

  const loadInbox = async () => {
    setLoading(true)
    try {
      if (useFixture) {
        const rows =
          filter === 'needs-attention'
            ? FIXTURE_THREADS.filter((thread) => thread.needsAttention)
            : FIXTURE_THREADS
        const query = q.trim().toLowerCase()
        setThreads(
          query
            ? rows.filter((thread) =>
                `${thread.bookerName} ${thread.suite || ''} ${thread.nightsbridgeBookingId || ''}`
                  .toLowerCase()
                  .includes(query)
              )
            : rows
        )
        return
      }
      const params = new URLSearchParams({ filter })
      if (q.trim()) params.set('q', q.trim())
      const response = await fetch(`/api/umi/inbox?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setThreads(data.threads)
      }
    } finally {
      setLoading(false)
    }
  }

  const applyDetail = (thread: ThreadDetail) => {
    setDetail(thread)
    setDraft(thread.openDraft?.text || '')
    setChannel(sendChannel(thread.defaultOutboundChannel))
    setEmailTo(
      thread.guestEmail || (thread.fromNumber?.includes('@') ? thread.fromNumber : '')
    )
    setContactPhone(thread.guestPhone || '')
    setContactEmail(thread.guestEmail || '')
    setContactNote(null)
    setLinkBookingId('')
    setSelectedTemplate('')
    setTemplateVars({})
    setTemplateSid('')
    setTemplateRendered('')
  }

  const loadThread = async (id: number) => {
    if (useFixture) {
      const fixture = FIXTURE_DETAILS[id]
      if (fixture) applyDetail(fixture)
      return
    }
    const response = await fetch(`/api/umi/threads/${id}`)
    const data = await response.json()
    if (data.success) {
      applyDetail(data.thread)
    }
  }

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    loadInbox()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, useFixture])

  useEffect(() => {
    const urlQ = searchParams.get('q') || ''
    if (urlQ !== q) {
      loadInbox()
      return
    }
    const timer = setTimeout(() => {
      syncSearchParam(q)
      loadInbox()
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => {
    if (!ready) return
    if (threadParam) {
      const fromQuery = Number(threadParam)
      if (!Number.isNaN(fromQuery)) setSelectedId(fromQuery)
      return
    }
    if (breakpoint === 'phone') {
      pushedThreadRef.current = false
      setSelectedId(null)
      restoreListScroll()
    }
  }, [ready, breakpoint, threadParam])

  useEffect(() => {
    if (!ready || breakpoint === 'phone' || threadParam || selectedId || !threads[0]) return
    setSelectedId(threads[0].id)
  }, [ready, breakpoint, threadParam, threads, selectedId])

  useEffect(() => {
    if (selectedId) loadThread(selectedId)
    else setDetail(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, useFixture])

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
    fetch(
      `/api/ops/wa-templates/fill?threadId=${selectedId}&name=${encodeURIComponent(selectedTemplate)}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) return
        setTemplateVars(data.variables || {})
        setTemplateSid(data.template?.content_sid || '')
        setTemplateRendered(data.rendered || '')
      })
      .catch(() => {})
  }, [selectedTemplate, selectedId])

  const confirmWindowWarning =
    channel === 'whatsapp' && careWindow
      ? careWindow.state === 'closed'
        ? 'WARNING: WhatsApp window is closed. Free-text will be refused (409). Use an approved template.'
        : careWindow.state === 'closing_soon'
          ? 'WARNING: WhatsApp window closes in about 5 minutes. Switch to a template if this send might miss the window.'
          : null
      : null

  const saveDraft = async () => {
    if (!selectedId || !draft.trim()) return
    setBusy(true)
    setError(null)
    try {
      if (useFixture) return
      await fetch(`/api/umi/threads/${selectedId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft }),
      })
    } finally {
      setBusy(false)
    }
  }

  const usingTemplate = forceTemplateMode && Boolean(selectedTemplate)

  const requestApproveAndSend = () => {
    if (!selectedId) return
    if (!usingTemplate && !draft.trim()) return
    if (forceTemplateMode && careWindow?.state === 'closed' && !selectedTemplate) {
      setError('Window closed. Pick a WhatsApp-approved template (none until Grant submits).')
      return
    }
    setConfirmOpen(true)
  }

  const runApproveAndSend = async () => {
    if (!selectedId) return
    if (!usingTemplate && !draft.trim()) return
    setBusy(true)
    setError(null)
    try {
      if (useFixture) {
        setConfirmOpen(false)
        return
      }
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
      setConfirmOpen(false)
      await loadInbox()
      await loadThread(selectedId)
    } finally {
      setBusy(false)
    }
  }

  const requestResend = (messageId: number, stuck: boolean) => {
    setResendConfirm({ messageId, stuck })
  }

  const runResend = async () => {
    if (!selectedId || !resendConfirm) return
    const { messageId, stuck } = resendConfirm
    setBusy(true)
    setError(null)
    try {
      if (useFixture) {
        setResendConfirm(null)
        return
      }
      const tokenRes = await fetch('/api/inbound/confirm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: selectedId, purpose: 'resend', messageId }),
      })
      const tokenData = await tokenRes.json()
      if (!tokenData.success || !tokenData.confirmToken) {
        setError(tokenData.error || 'Could not issue confirmToken for resend.')
        return
      }
      const sendRes = await fetch('/api/inbound/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          confirmToken: tokenData.confirmToken,
          acknowledgeDuplicate: stuck,
        }),
      })
      const sendData = await sendRes.json()
      if (sendData.windowClosed) {
        setError(
          sendData.template?.name
            ? `WhatsApp 24h window is closed. Offer approved template: ${sendData.template.name}`
            : 'WhatsApp 24h window is closed. No WhatsApp-approved template is available.'
        )
        return
      }
      if (!sendData.success) {
        setError(sendData.details || sendData.error || 'Resend failed')
        return
      }
      setResendConfirm(null)
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
      if (useFixture) return
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
      if (useFixture) return
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

  const openThread = (id: number) => {
    rememberListScroll()
    setSelectedId(id)
    if (breakpoint === 'phone') {
      pushedThreadRef.current = true
      writeQuery(id, 'push')
    } else {
      writeQuery(id, 'replace')
    }
  }

  const closeThread = () => {
    rememberListScroll()
    if (pushedThreadRef.current) {
      pushedThreadRef.current = false
      router.back()
      return
    }
    setSelectedId(null)
    writeQuery(null, 'replace')
    restoreListScroll()
  }

  const pane = breakpoint === 'phone' && selectedId ? 'thread' : 'list'
  const channelLabel = CHANNELS.find((item) => item.id === channel)?.label || channel

  const listPane = (
    <>
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Inbox
          </h1>
          <button
            type="button"
            onClick={() => loadInbox()}
            className="inbox-tap"
            title="Refresh"
            aria-label="Refresh inbox"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && loadInbox()}
            placeholder="Search booker, suite, booking…"
            className="inbox-field w-full pl-9 pr-3"
          />
        </div>
        <label className="flex items-center gap-2 text-base text-slate-700 min-h-[44px]">
          <input
            type="checkbox"
            checked={filter === 'needs-attention'}
            onChange={(event) =>
              setFilter(event.target.checked ? 'needs-attention' : 'all')
            }
            className="h-5 w-5"
          />
          Needs attention
        </label>
      </div>
      <div ref={listScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {threads.length === 0 && !loading && (
          <p className="p-6 text-base text-slate-500 inbox-wrap">
            {filter === 'needs-attention'
              ? 'Nothing needs attention.'
              : 'No threads yet. Arrivals today/tomorrow SAST appear here once bookings exist.'}
          </p>
        )}
        {threads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => openThread(thread.id)}
            className={`w-full text-left px-4 py-3 min-h-[44px] border-b hover:bg-slate-50 ${
              selectedId === thread.id ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-base text-slate-900 inbox-wrap">{thread.bookerName}</span>
              <span className="text-xs uppercase tracking-wide text-slate-500 shrink-0">
                {thread.sortBucket === 0
                  ? 'Arriving'
                  : thread.sortBucket === 1
                    ? 'Pending'
                    : 'Recent'}
              </span>
            </div>
            <div className="text-base text-slate-500 mt-0.5 inbox-wrap">
              {thread.threadKind === 'temp' ? 'Temp · ' : ''}
              {thread.suite || 'No suite'}
              {thread.checkIn ? ` · ${thread.checkIn}` : ''}
            </div>
            <div className="text-base text-slate-700 mt-1 line-clamp-2 inbox-wrap">{thread.preview || '—'}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {thread.lastChannel && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                  {badge(thread.lastChannel)}
                </span>
              )}
              {thread.hasOpenDraft && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  Draft
                </span>
              )}
              {thread.arrivalStage && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  {thread.arrivalStage}
                </span>
              )}
              {thread.needsAttention && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                  Needs attention
                </span>
              )}
              {thread.attentionReason && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                  {thread.attentionReason}
                </span>
              )}
              {thread.hygieneStatus === 'nudged' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                  Stale temp
                </span>
              )}
              {thread.careWindow?.state === 'closed' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                  WA closed
                </span>
              )}
              {thread.careWindow?.state === 'closing_soon' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                  WA closing
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </>
  )

  const threadPane = !detail ? (
    <div className="flex-1 flex items-center justify-center text-slate-500 text-base p-6">
      Select a conversation
    </div>
  ) : (
    <ThreadLayoutShell
      showBack={breakpoint === 'phone'}
      onBack={closeThread}
      title={detail.bookerName}
      facts={
        <>
          {detail.suite || 'Suite unknown'} · {detail.checkIn || '—'} → {detail.checkOut || '—'}
          {detail.nightsbridgeBookingId ? ` · ${detail.nightsbridgeBookingId}` : ''}
          {detail.bookingId ? ` · booking ${detail.bookingId}` : ''}
        </>
      }
      channelLine={
        <>
          Last channel: {badge(detail.lastChannel)} · Default reply:{' '}
          {badge(detail.defaultOutboundChannel)}
        </>
      }
      headerBadgeSlot={
        <>
          {detail.arrivalStage ? (
            <span className="text-xs inline-flex px-2 py-1 rounded bg-blue-100 text-blue-800 inbox-wrap">
              {detail.arrivalStage}
            </span>
          ) : null}
          {detail.careWindow ? (
            <span
              className={`text-xs inline-flex px-2 py-1 rounded inbox-wrap ${
                detail.careWindow.state === 'closed'
                  ? 'bg-slate-200 text-slate-800'
                  : detail.careWindow.state === 'closing_soon'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {detail.careWindow.label}
            </span>
          ) : null}
        </>
      }
      extraHeader={
        <>
          {detail.bookingId ? (
            <div className="mt-3 text-base text-slate-600 space-y-2 inbox-wrap">
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
                  className="inbox-field flex-1 min-w-[10rem]"
                />
                <input
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="Staff email"
                  className="inbox-field flex-1 min-w-[10rem]"
                />
                <button
                  type="button"
                  onClick={saveContacts}
                  disabled={busy}
                  className="inbox-tap px-3 bg-slate-800 text-white rounded-lg disabled:opacity-50"
                >
                  Save contact
                </button>
              </div>
              {contactNote && <p className="text-emerald-700">{contactNote}</p>}
            </div>
          ) : null}
          {detail.threadKind === 'temp' ? (
            <div className="text-base bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
              <div className="font-semibold text-amber-900 flex items-center gap-1 mb-2">
                <Link2 className="w-4 h-4" /> Unmatched temp
              </div>
              <select
                value={linkBookingId}
                onChange={(event) => setLinkBookingId(event.target.value)}
                className="inbox-field w-full mb-2"
              >
                <option value="">Link to booking…</option>
                {detail.linkCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.guestName} · {candidate.checkIn} · {candidate.suite || 'suite?'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={linkBooking}
                disabled={!linkBookingId || busy}
                className="inbox-tap w-full bg-amber-700 text-white rounded-lg disabled:opacity-50"
              >
                Link to booking
              </button>
            </div>
          ) : null}
        </>
      }
      messages={detail.messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-full sm:max-w-xl rounded-2xl px-4 py-3 text-base inbox-wrap ${
              message.direction === 'outbound'
                ? 'bg-blue-600 text-white'
                : 'bg-white border text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`text-xs uppercase tracking-wide px-1.5 py-0.5 rounded ${
                  message.direction === 'outbound'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {badge(message.channel)}
              </span>
              {message.isSpam && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                  Filtered
                </span>
              )}
              <OutboundDeliveryBubble message={message} busy={busy} onResend={requestResend} />
            </div>
            {message.channel === 'email' && (
              <p className="text-base opacity-80 mb-1 inbox-wrap">
                source=email · sender={message.senderAddress || detail.fromNumber}
              </p>
            )}
            <p className="whitespace-pre-wrap inbox-wrap">{message.body}</p>
            <p className="text-xs opacity-70 mt-2">
              {message.timestamp ? format(parseISO(message.timestamp), 'dd MMM HH:mm') : ''}
            </p>
          </div>
        </div>
      ))}
      composer={
        <>
          {careWindow && (
            <p
              className={`text-base px-2 py-1 rounded inbox-wrap ${
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
          {error && <p className="text-base text-red-600 inbox-wrap">{error}</p>}
          {(selected?.hasOpenDraft || detail.openDraft) && keyboardInsetPx < 80 ? (
            <p className="text-base text-amber-700 inbox-wrap">
              In-thread draft ({detail.openDraft?.source || 'heuristic'}). Approve&Send required — never auto-sent.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setChannel(item.id)}
                className={`inbox-tap px-3 rounded-full border text-base ${
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
              <p className="text-base font-medium text-slate-800">Template mode</p>
              <p className="text-base text-slate-600 inbox-wrap">
                {approvedTemplates.length === 0
                  ? templateEmptyReason ||
                    'Picker shows only templates APPROVED by WhatsApp. Grant-approved copy is stored but unsubmitted — none appear until Grant’s submit go-ahead.'
                  : 'Choose a WhatsApp-approved template. Variables are pre-filled; you can edit them.'}
              </p>
              <select
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value)}
                className="inbox-field w-full"
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
                    <label key={key} className="block text-base text-slate-600">
                      {`{{${key}}}`}
                      <input
                        value={value}
                        onChange={(event) =>
                          setTemplateVars((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        className="inbox-field mt-1 w-full"
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
              className="inbox-field w-full"
            />
          )}
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={keyboardInsetPx > 80 ? 2 : 4}
            placeholder="Draft reply — edit before Approve&Send"
            className="inbox-field w-full"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={busy || !draft.trim()}
              className="inbox-tap px-3 border rounded-lg text-base disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={requestApproveAndSend}
              disabled={busy || (!draft.trim() && !selectedTemplate)}
              className="inbox-tap px-3 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-1 text-base disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </>
      }
    />
  )

  return (
    <>
      <InboxLayoutShell
        breakpoint={ready ? breakpoint : 'desktop'}
        pane={pane}
        list={listPane}
        thread={threadPane}
        listCollapsed={listCollapsed}
        onToggleList={() => setListCollapsed((value) => !value)}
        chromeOffset={chromeOffset}
        keyboardInsetPx={keyboardInsetPx}
      />
      <InboxConfirmDialog
        open={confirmOpen}
        channelLabel={channelLabel}
        windowWarning={confirmWindowWarning}
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={runApproveAndSend}
      />
      {resendConfirm && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 bg-slate-900/50">
          <div
            data-inbox-resend-confirm
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-white rounded-xl shadow-xl p-4 space-y-4"
          >
            <h3 className="text-lg font-semibold text-slate-900 inbox-wrap">Resend this message?</h3>
            <p className="text-base text-slate-700 inbox-wrap">
              Same content, fresh confirmToken. Approve&amp;Send rules still apply. No auto-send.
            </p>
            {resendConfirm.stuck ? (
              <p className="text-base text-amber-800 inbox-wrap">
                This message is still pending — a duplicate delivery may reach the guest.
              </p>
            ) : null}
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setResendConfirm(null)}
                disabled={busy}
                className="inbox-tap flex-1 border rounded-lg text-base disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runResend}
                disabled={busy}
                className="inbox-tap flex-1 bg-blue-600 text-white rounded-lg text-base disabled:opacity-50"
              >
                Confirm resend
              </button>
            </div>
          </div>
        </div>
      )}
      {keyboardSim && keyboardInsetPx > 0 && (
        <div
          data-inbox-keyboard-sim
          aria-hidden
          className="fixed left-0 right-0 bottom-0 z-[70] bg-slate-300 border-t border-slate-400 text-center text-base text-slate-700 pt-3"
          style={{ height: keyboardInsetPx }}
        >
          On-screen keyboard (simulated)
        </div>
      )}
    </>
  )
}

export default function InboxHomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">Loading inbox…</div>
      }
    >
      <InboxHomePageInner />
    </Suspense>
  )
}
