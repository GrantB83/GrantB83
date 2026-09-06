'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { CheckCircle, X, Edit, AlertTriangle, MessageSquare, FileText, Calendar, RefreshCw } from 'lucide-react'

interface ApprovalItem {
  id: number
  type: 'inbound' | 'welcome' | 'quote' | 'ticket_guest' | 'ticket_staff'
  guest: string
  draftContent: string
  source: string
  metadata: Record<string, any>
  createdAt: string
  priority: 'high' | 'medium' | 'low'
}

export default function NeedsApprovalPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState('')

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
    try {
      const response = await fetch('/api/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemId, 
          action,
          content,
          actor: 'Grant' // TODO: Get from session
        })
      })

      if (response.ok) {
        await fetchApprovals(true)
        setSelectedItem(null)
        setEditMode(false)
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error)
    }
  }

  const handleApprove = () => {
    if (selectedItem) {
      handleAction('approve', selectedItem.id)
    }
  }

  const handleSend = async () => {
    if (!selectedItem) return
    
    const confirmed = confirm(
      `Send this message via WhatsApp?\n\n` +
      `To: ${selectedItem.guest}\n` +
      `Type: ${selectedItem.type}\n\n` +
      `Sandbox mode: Message will be logged but not sent to guest.`
    )
    
    if (confirmed) {
      try {
        // Extract phone from metadata
        const phone = selectedItem.metadata?.guest_phone || selectedItem.metadata?.from_number
        if (!phone) {
          alert('Error: Guest phone number not found')
          return
        }

        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: selectedItem.id,
            guestPhone: phone,
            message: editMode ? editedContent : selectedItem.draftContent
          })
        })

        const data = await response.json()

        if (data.success) {
          alert(data.message || 'Message sent successfully')
          await fetchApprovals(true)
          setSelectedItem(null)
          setEditMode(false)
        } else {
          alert(`Send failed: ${data.error}`)
        }
      } catch (error) {
        console.error('Send error:', error)
        alert('Failed to send message')
      }
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
    <div className="min-h-screen bg-gray-50">
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
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
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
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition ${
                  selectedItem?.id === item.id
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
                      'bg-amber-100'
                    }`}>
                      {item.type === 'inbound' && <MessageSquare className="w-5 h-5 text-blue-600" />}
                      {item.type === 'welcome' && <Calendar className="w-5 h-5 text-green-600" />}
                      {item.type === 'quote' && <FileText className="w-5 h-5 text-purple-600" />}
                      {(item.type === 'ticket_guest' || item.type === 'ticket_staff') && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {item.type === 'inbound' && 'Inbound Message'}
                        {item.type === 'welcome' && 'Welcome Draft'}
                        {item.type === 'quote' && 'Quote Draft'}
                        {item.type === 'ticket_guest' && 'Guest Exception'}
                        {item.type === 'ticket_staff' && 'Staff Brief'}
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

                {selectedItem?.id === item.id && (
                  <div className="mt-4 pt-4 border-t">
                    {/* Source */}
                    <div className="mb-3 text-xs text-gray-500">
                      Source: {item.source}
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
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditAndApprove(); }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          {editMode ? 'Save & Approve (E)' : 'Edit & approve (E)'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(); }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject (R)
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEscalate(); }}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition flex items-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Escalate (X)
                        </button>
                      </div>

                      {/* Send Button (after approval) */}
                      <div className="pt-2 border-t">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSend(); }}
                          className="w-full px-4 py-3 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 transition flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-5 h-5" />
                          Send via WhatsApp (Human-Gated)
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          ⚠️ Sandbox mode: Logs send without calling Meta API until WABA live
                        </p>
                      </div>
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
