'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { 
  MessageCircle, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Filter,
  RefreshCw
} from 'lucide-react'

interface Thread {
  threadId: number
  fromNumber: string
  guestName: string | null
  source: string
  intent: string | null
  confidence: number
  status: string
  assignedTo: string | null
  firstMessageAt: string
  lastMessageAt: string
  messageCount: number
  latestMessage: {
    id: number
    text: string
    timestamp: string
    isClassified: boolean
    draftReply: string | null
  } | null
  classification: {
    intent: string
    confidence: number
    extractedData: Record<string, any>
    missingFields: string[]
  } | null
  metadata: Record<string, any>
}

interface Stats {
  total: number
  byStatus: Record<string, number>
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  classified: 'bg-purple-100 text-purple-800 border-purple-200',
  drafted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  sent: 'bg-gray-100 text-gray-800 border-gray-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200'
}

const INTENT_ICONS: Record<string, string> = {
  booking_inquiry: '📅',
  date_query: '🗓️',
  suite_preference: '🏡',
  existing_guest: '🔄',
  general_question: '❓',
  spam: '🚫',
  unknown: '❔',
  checkin_event: '✅',
  outlier_exception: '🎫'
}

const CATEGORY_ICONS: Record<string, string> = {
  lost_key: '🔑',
  gate_access: '🚪',
  cant_find_entrance: '📍',
  refrigerator_space: '❄️',
  restaurant_recs: '🍽️',
  special_event: '🎉',
  maintenance_other: '🔧',
  general_problem: '❓'
}

export default function InboundQueuePage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'messages' | 'tickets' | 'late_checkin'>('messages')

  const fetchQueue = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)

      const params = new URLSearchParams({ tenant_id: '1', limit: '100' })
      if (filterStatus) {
        params.append('status', filterStatus)
      }

      const response = await fetch(`/api/inbound/queue?${params}`)
      const data = await response.json()

      if (data.success) {
        setThreads(data.threads)
        setStats(data.stats)
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to load inbound queue')
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [filterStatus])

  const updateThreadStatus = async (threadId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/inbound/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, status: newStatus })
      })

      if (response.ok) {
        await fetchQueue(true)
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  if (loading && threads.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading inbound queue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-blue-600" />
                Inbound WhatsApp Queue
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Old number: +27836458313 • Review & approve replies
              </p>
            </div>
            <button
              onClick={() => fetchQueue(true)}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 mb-3 border-b pb-2">
            <button
              onClick={() => setViewMode('messages')}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
                viewMode === 'messages' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              💬 Messages
            </button>
            <button
              onClick={() => setViewMode('tickets')}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
                viewMode === 'tickets' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              🎫 Tickets
            </button>
            <button
              onClick={() => setViewMode('late_checkin')}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
                viewMode === 'late_checkin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              ⏰ Late Check-in
            </button>
          </div>

          {/* Stats */}
          {stats && viewMode === 'messages' && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setFilterStatus('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  filterStatus === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                All ({stats.total})
              </button>
              {Object.entries(stats.byStatus || {}).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize whitespace-nowrap ${
                    filterStatus === status 
                      ? 'bg-blue-600 text-white' 
                      : STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {status} ({count})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tickets View */}
        {viewMode === 'tickets' && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-600 mb-2">🎫 Guest Tickets (Outliers/Exceptions)</p>
            <p className="text-sm text-gray-500">Fetched from /api/tickets</p>
            <p className="text-sm text-gray-500 mt-2">
              Categories: Lost Key, Gate Access, Maintenance, Restaurant Recs, etc.
            </p>
            <p className="text-xs text-gray-400 mt-4">
              Full UI implementation: Ticket cards with guest draft + staff brief
            </p>
          </div>
        )}

        {/* Late Check-in View */}
        {viewMode === 'late_checkin' && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-600 mb-2">⏰ Late Check-in Queue</p>
            <p className="text-sm text-gray-500">Fetched from /api/checkin-status?needs_late_checkin=true</p>
            <p className="text-sm text-gray-500 mt-2">
              Shows guests who should have checked in but haven't (inferred from guests group)
            </p>
            <p className="text-xs text-gray-400 mt-4">
              Full UI implementation: Guest cards with late check-in instructions draft
            </p>
          </div>
        )}

        {/* Messages View */}
        {viewMode === 'messages' && threads.length === 0 && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No messages in queue</p>
            {filterStatus && (
              <button
                onClick={() => setFilterStatus('')}
                className="mt-3 text-blue-600 hover:underline text-sm"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
        {viewMode === 'messages' && threads.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {threads.map((thread) => (
              <div
                key={thread.threadId}
                className="bg-white rounded-lg border hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => setSelectedThread(thread)}
              >
                {/* Thread Header */}
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {thread.guestName || 'Unknown Guest'}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="truncate">{thread.fromNumber}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${STATUS_COLORS[thread.status]}`}>
                      {thread.status}
                    </span>
                  </div>

                  {/* Intent & Confidence */}
                  {thread.intent && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <span className="text-lg">{INTENT_ICONS[thread.intent] || '❔'}</span>
                      <span className="text-gray-700 capitalize">
                        {thread.intent.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(thread.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Latest Message Preview */}
                {thread.latestMessage && (
                  <div className="p-4">
                    <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                      {thread.latestMessage.text}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {format(parseISO(thread.latestMessage.timestamp), 'MMM d, h:mm a')}
                      {thread.messageCount > 1 && (
                        <span className="ml-auto">{thread.messageCount} messages</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="px-4 pb-4 flex gap-2">
                  {thread.status === 'drafted' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateThreadStatus(thread.threadId, 'approved')
                      }}
                      className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                    >
                      Approve
                    </button>
                  )}
                  {thread.status === 'new' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateThreadStatus(thread.threadId, 'classified')
                      }}
                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                    >
                      Review
                    </button>
                  )}
                  {thread.status !== 'closed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateThreadStatus(thread.threadId, 'closed')
                      }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Thread Detail Modal */}
      {selectedThread && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedThread(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedThread.guestName || 'Unknown Guest'}
                  </h2>
                  <p className="text-sm text-gray-600">{selectedThread.fromNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedThread(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Classification */}
              {selectedThread.classification && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">Classification</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Intent:</span>{' '}
                      <span className="font-medium capitalize">
                        {selectedThread.classification.intent.replace('_', ' ')}
                      </span>
                      <span className="text-gray-500 ml-2">
                        ({Math.round(selectedThread.classification.confidence * 100)}%)
                      </span>
                    </div>
                    {Object.keys(selectedThread.classification.extractedData).length > 0 && (
                      <div>
                        <span className="text-gray-600">Extracted:</span>
                        <pre className="mt-1 text-xs bg-white p-2 rounded border">
                          {JSON.stringify(selectedThread.classification.extractedData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedThread.classification.missingFields.length > 0 && (
                      <div>
                        <span className="text-gray-600">Missing:</span>{' '}
                        <span className="text-amber-600 font-medium">
                          {selectedThread.classification.missingFields.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Latest Message */}
              {selectedThread.latestMessage && (
                <div className="mb-4">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">Message</h3>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedThread.latestMessage.text}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {format(parseISO(selectedThread.latestMessage.timestamp), 'PPpp')}
                    </p>
                  </div>
                </div>
              )}

              {/* Draft Reply */}
              {selectedThread.latestMessage?.draftReply && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm text-gray-700">Draft Reply</h3>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      ⚠️ Requires Approval
                    </span>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedThread.latestMessage.draftReply}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Review this draft and approve before sending to guest via WhatsApp
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    updateThreadStatus(selectedThread.threadId, 'approved')
                    setSelectedThread(null)
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Approve & Mark Ready
                </button>
                <button
                  onClick={() => {
                    updateThreadStatus(selectedThread.threadId, 'closed')
                    setSelectedThread(null)
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
