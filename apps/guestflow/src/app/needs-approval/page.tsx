'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { CheckCircle, X, Edit, AlertTriangle, MessageSquare, FileText, Calendar, RefreshCw } from 'lucide-react'

interface ApprovalItem {
  id: number
  type: 'inbound' | 'welcome' | 'quote' | 'ticket_guest' | 'ticket_staff' | 'staff_ops' | 'late_checkin'
  guest: string
  draftContent: string
  source: string
  metadata: Record<string, any>
  createdAt: string
  priority: 'high' | 'medium' | 'low'
}

function isCopyOnlyItem(item: ApprovalItem): boolean {
  return item.type === 'staff_ops' || Boolean(item.metadata?.copy_only)
}

export default function NeedsApprovalPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [approvedCopyContent, setApprovedCopyContent] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [guestChannel, setGuestChannel] = useState<'email' | 'whatsapp_web' | 'whatsapp'>('email')
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [waJobId, setWaJobId] = useState<number | null>(null)
  const [waJobStatus, setWaJobStatus] = useState<string | null>(null)
  const [waJobError, setWaJobError] = useState<string | null>(null)
  const [sendingGuest, setSendingGuest] = useState(false)

  const fetchApprovals = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)

      const response = await fetch('/api/approvals?tenant_id=1')
      const data = await response.json()

      if (data.success) {
        setItems(data.items)
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!waJobId) return
    let cancelled = false
    const poll = async () => {
      try {
        const response = await fetch(`/api/inbound/send-jobs/${waJobId}`)
        const data = await response.json()
        if (cancelled || !data.success) return
        setWaJobStatus(data.job.status)
        setWaJobError(data.job.errorCode || null)
      } catch {
        // keep last status
      }
    }
    poll()
    const timer = setInterval(poll, 4000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [waJobId])

  useEffect(() => {
    fetchApprovals()
    
    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedItem) return
      
      if (e.key === 'a' || e.key === 'A') {
        handleApprove()
      } else if (e.key === 'e' || e.key === 'E') {
        handleEditAndApprove()
      } else if (e.key === 'r' || e.key === 'R') {
        handleReject()
      } else if (e.key === 'x' || e.key === 'X') {
        handleEscalate()
      } else if (e.key === 'Escape') {
        setSelectedItem(null)
        setEditMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedItem])

  const handleAction = async (action: string, itemId: number, content?: string) => {
    if (!selectedItem) return null

    try {
      const response = await fetch('/api/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          type: selectedItem.type,
          action,
          content,
          actor: 'Grant',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (action === 'approve' && isCopyOnlyItem(selectedItem) && data.copyContent) {
          setApprovedCopyContent(data.copyContent)
        } else {
          await fetchApprovals(true)
          setSelectedItem(null)
          setEditMode(false)
          setApprovedCopyContent(null)
        }
        return data
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error)
    }

    return null
  }

  const handleApprove = () => {
    if (selectedItem) {
      handleAction('approve', selectedItem.id)
    }
  }

  const handleSend = async () => {
    if (!selectedItem || isCopyOnlyItem(selectedItem)) return

    const body = emailBody || (editMode ? editedContent : selectedItem.draftContent)

    if (guestChannel === 'email' || guestChannel === 'whatsapp_web') {
      const confirmed = confirm(
        guestChannel === 'email'
          ? `Send email now?\n\nTo: ${emailTo}\nSubject: ${emailSubject}\n\nThis uses the existing GuestFlow From address.`
          : `Queue Interim · WhatsApp Web send?\n\nThis does NOT mark the message sent until the CoS clicker completes the job.`
      )
      if (!confirmed) return

      const threadId = Number(selectedItem.metadata?.thread_id || selectedItem.id)
      setSendingGuest(true)
      try {
        if (selectedItem.type === 'inbound') {
          await handleAction('approve', selectedItem.id, editMode ? editedContent : undefined)
        }
        const tokenRes = await fetch('/api/inbound/confirm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadId }),
        })
        const tokenData = await tokenRes.json()
        if (!tokenData.success || !tokenData.confirmToken) {
          alert(`Could not confirm send: ${tokenData.error || 'not approved'}`)
          return
        }
        const response = await fetch('/api/inbound/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadId,
            confirmToken: tokenData.confirmToken,
            channel: guestChannel,
            to: guestChannel === 'email' ? emailTo : selectedItem.metadata?.guest_phone || selectedItem.metadata?.from_number,
            subject: emailSubject,
            body,
          }),
        })
        const data = await response.json()
        if (guestChannel === 'whatsapp_web') {
          if (data.success && data.queued && data.data?.jobId) {
            setWaJobId(data.data.jobId)
            setWaJobStatus(data.data.jobStatus || 'queued')
            setWaJobError(null)
          } else {
            alert(`Could not queue WhatsApp Web job: ${data.error || 'unknown error'}`)
          }
          return
        }
        if (data.success) {
          alert('Email sent')
          await fetchApprovals(true)
          setSelectedItem(null)
          setEditMode(false)
        } else {
          alert(`Send failed: ${data.error}${data.details ? `\n${data.details}` : ''}`)
        }
      } catch (error) {
        console.error('Send error:', error)
        alert('Failed to send')
      } finally {
        setSendingGuest(false)
      }
      return
    }

    const confirmed = confirm(
      `Send this message via WhatsApp?\n\n` +
      `To: ${selectedItem.guest}\n` +
      `Type: ${selectedItem.type}\n\n` +
      `Requires approve + one-time confirmToken. Never auto-sent.`
    )
    
    if (!confirmed) return

    const threadId = Number(selectedItem.metadata?.thread_id || selectedItem.id)
    setSendingGuest(true)
    try {
      if (selectedItem.type === 'inbound') {
        await handleAction('approve', selectedItem.id, editMode ? editedContent : undefined)
      }
      const tokenRes = await fetch('/api/inbound/confirm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId }),
      })
      const tokenData = await tokenRes.json()
      if (!tokenData.success || !tokenData.confirmToken) {
        alert(`Could not confirm send: ${tokenData.error || 'not approved'}`)
        return
      }
      const response = await fetch('/api/inbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          confirmToken: tokenData.confirmToken,
          channel: 'whatsapp',
          body,
        }),
      })
      const data = await response.json()
      if (data.success) {
        alert(data.message || 'Message sent successfully')
        await fetchApprovals(true)
        setSelectedItem(null)
        setEditMode(false)
      } else {
        alert(`Send failed: ${data.error}${data.details ? `\n${data.details}` : ''}`)
      }
    } catch (error) {
      console.error('Send error:', error)
      alert('Failed to send message')
    } finally {
      setSendingGuest(false)
    }
  }

  const handleEditAndApprove = () => {
    if (!editMode) {
      setEditMode(true)
      setEditedContent(selectedItem?.draftContent || '')
    } else {
      if (selectedItem) {
        handleAction('approve', selectedItem.id, editedContent)
      }
    }
  }

  const handleReject = () => {
    if (selectedItem) {
      const reason = prompt('Reason for rejection:')
      if (reason) {
        handleAction('reject', selectedItem.id, reason)
      }
    }
  }

  const handleCopyApprovedText = async () => {
    const text = approvedCopyContent || selectedItem?.draftContent
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      await fetchApprovals(true)
      setSelectedItem(null)
      setApprovedCopyContent(null)
    } catch (error) {
      console.error('Copy failed:', error)
      alert('Failed to copy text to clipboard')
    }
  }

  const handleEscalate = () => {
    if (selectedItem) {
      const note = prompt('Escalation note:')
      if (note) {
        handleAction('escalate', selectedItem.id, note)
      }
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading approvals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                Needs approval
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {items.length} {items.length === 1 ? 'item' : 'items'} waiting for review
              </p>
            </div>
            <button
              onClick={() => fetchApprovals(true)}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-accent disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl border p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Routine handled. Nothing needs you.
            </h2>
            <p className="text-gray-600">
              All drafts have been reviewed or no new items require approval.
            </p>
          </div>
        </div>
      )}

      {/* Items List */}
      {items.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid gap-4">
            {items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  setSelectedItem(item)
                  setApprovedCopyContent(null)
                  setCopySuccess(false)
                  setEditMode(false)
                  const phoneOrEmail = item.metadata?.guest_email || item.metadata?.from_number || ''
                  setGuestChannel(String(phoneOrEmail).includes('@') ? 'email' : 'whatsapp_web')
                  setEmailTo(String(phoneOrEmail).includes('@') ? String(phoneOrEmail) : '')
                  setEmailSubject(item.metadata?.subject ? `Re: ${item.metadata.subject}` : 'Message from The Browns')
                  setEmailBody(item.draftContent)
                  setWaJobId(null)
                  setWaJobStatus(null)
                  setWaJobError(null)
                }}
                className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition ${
                  selectedItem?.id === item.id && selectedItem?.type === item.type
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      item.type === 'inbound' ? 'bg-blue-100' :
                      item.type === 'welcome' ? 'bg-green-100' :
                      item.type === 'quote' ? 'bg-purple-100' :
                      item.type === 'staff_ops' ? 'bg-teal-100' :
                      'bg-amber-100'
                    }`}>
                      {item.type === 'inbound' && <MessageSquare className="w-5 h-5 text-blue-600" />}
                      {item.type === 'welcome' && <Calendar className="w-5 h-5 text-green-600" />}
                      {item.type === 'quote' && <FileText className="w-5 h-5 text-purple-600" />}
                      {item.type === 'staff_ops' && <FileText className="w-5 h-5 text-teal-600" />}
                      {(item.type === 'ticket_guest' || item.type === 'ticket_staff' || item.type === 'late_checkin') && (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {item.type === 'inbound' && 'Inbound Message'}
                        {item.type === 'welcome' && 'Welcome Draft'}
                        {item.type === 'quote' && 'Quote Draft'}
                        {item.type === 'ticket_guest' && 'Guest Exception'}
                        {item.type === 'ticket_staff' && 'Staff Brief'}
                        {item.type === 'staff_ops' && 'Staff Ops Brief'}
                        {item.type === 'late_checkin' && 'Late Check-in Draft'}
                      </div>
                      <div className="text-sm text-gray-600">{item.guest}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.priority === 'high' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                        High Priority
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {format(parseISO(item.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>

                {selectedItem?.id === item.id && selectedItem?.type === item.type && (
                  <div className="mt-4 pt-4 border-t">
                    {/* Source */}
                    <div className="mb-3 text-xs text-gray-500">
                      Source: {item.source}
                      {isCopyOnlyItem(item) && (
                        <span className="ml-2 text-teal-700 font-medium">Copy-only — no WhatsApp Send</span>
                      )}
                    </div>

                    {/* Draft Content */}
                    <div className="mb-4">
                      {editMode && selectedItem?.id === item.id ? (
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="w-full p-3 border rounded-lg text-sm"
                          rows={6}
                          autoFocus
                        />
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-4 border text-sm whitespace-pre-wrap">
                          {item.draftContent}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(); }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve (A)
                        </button>
                        {!isCopyOnlyItem(item) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditAndApprove(); }}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-700 transition flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            {editMode ? 'Save & Approve (E)' : 'Edit & approve (E)'}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(); }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject (R)
                        </button>
                        {!isCopyOnlyItem(item) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEscalate(); }}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition flex items-center gap-2"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Escalate (X)
                          </button>
                        )}
                      </div>

                      {isCopyOnlyItem(item) && (
                        <div className="pt-2 border-t">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyApprovedText(); }}
                            disabled={!approvedCopyContent}
                            className="w-full px-4 py-3 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <FileText className="w-5 h-5" />
                            {copySuccess ? 'Copied!' : 'Copy WhatsApp text'}
                          </button>
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            {approvedCopyContent
                              ? 'Approved — copy for manual H11 staff WhatsApp post. Never auto-sent.'
                              : 'Approve first, then copy for manual H11 staff WhatsApp post. Never auto-sent.'}
                          </p>
                        </div>
                      )}

                      {!isCopyOnlyItem(item) && (
                        <div className="pt-2 border-t space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setGuestChannel('email') }}
                              className={`px-3 py-1.5 rounded text-xs font-medium border ${
                                guestChannel === 'email' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
                              }`}
                            >
                              Email
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setGuestChannel('whatsapp_web') }}
                              className={`px-3 py-1.5 rounded text-xs font-medium border ${
                                guestChannel === 'whatsapp_web' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-700'
                              }`}
                            >
                              Interim · WhatsApp Web
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setGuestChannel('whatsapp') }}
                              className={`px-3 py-1.5 rounded text-xs font-medium border ${
                                guestChannel === 'whatsapp' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700'
                              }`}
                            >
                              WhatsApp
                            </button>
                          </div>
                          {guestChannel === 'email' && (
                            <div className="space-y-2">
                              <input
                                value={emailTo}
                                onChange={(e) => setEmailTo(e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                placeholder="To"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <input
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                placeholder="Subject"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <textarea
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                rows={4}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                          {guestChannel === 'whatsapp_web' && (
                            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                              Interim · WhatsApp Web — queued/claimed is not success.
                              {waJobStatus ? ` Status: ${waJobStatus}` : ''}
                              {waJobId ? ` (job ${waJobId})` : ''}
                              {(waJobStatus === 'blocked' || waJobStatus === 'failed') && (
                                <div className="text-red-700 font-medium mt-1">
                                  {waJobStatus === 'blocked' ? 'Blocked (QR / Aw Snap).' : 'Failed.'}
                                  {waJobError ? ` ${waJobError}` : ''}
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSend(); }}
                            disabled={sendingGuest}
                            className="w-full px-4 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <MessageSquare className="w-5 h-5" />
                            {guestChannel === 'email'
                              ? 'Approve & Send email'
                              : guestChannel === 'whatsapp_web'
                                ? 'Approve & Queue WhatsApp Web'
                                : 'Approve & Send WhatsApp'}
                          </button>
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            Confirm dialog issues a one-time token. Never auto-sent.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Keyboard: A=Approve, E=Edit, R=Reject, X=Escalate, Esc=Close
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
