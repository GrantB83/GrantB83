'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { AlertTriangle, RefreshCw, CheckCircle, MessageSquare, FileText } from 'lucide-react'
import Link from 'next/link'

interface Exception {
  id: number
  category: string
  priority: 'high' | 'medium' | 'low'
  guest: string
  whatAsked: string
  whatAiFound: string
  whyStopped: string
  nextStep: string
  status: string
  createdAt: string
  metadata: Record<string, any>
}

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [selectedEx, setSelectedEx] = useState<Exception | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<string>('')

  const fetchExceptions = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)

      const params = new URLSearchParams({ tenant_id: '1' })
      if (filter) params.append('status', filter)

      const response = await fetch(`/api/exceptions?${params}`)
      const data = await response.json()

      if (data.success) {
        setExceptions(data.exceptions)
      }
    } catch (error) {
      console.error('Failed to fetch exceptions:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchExceptions()
  }, [filter])

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await fetch('/api/exceptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exceptionId: id, status: newStatus })
      })
      await fetchExceptions(true)
      setSelectedEx(null)
    } catch (error) {
      console.error('Failed to update exception:', error)
    }
  }

  const CATEGORY_COLORS: Record<string, string> = {
    lost_key: 'bg-red-100 text-red-800',
    gate_access: 'bg-red-100 text-red-800',
    maintenance: 'bg-amber-100 text-amber-800',
    missing_rate_card: 'bg-purple-100 text-purple-800',
    timeout: 'bg-orange-100 text-orange-800',
    general_problem: 'bg-gray-100 text-gray-800'
  }

  if (loading && exceptions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mb-4"></div>
          <p className="text-gray-600">Loading exceptions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                Exceptions
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {exceptions.length} active {exceptions.length === 1 ? 'exception' : 'exceptions'}
              </p>
            </div>
            <button
              onClick={() => fetchExceptions(true)}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === '' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('new')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === 'new' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              New
            </button>
            <button
              onClick={() => setFilter('triaged')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === 'triaged' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Triaged
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === 'in_progress' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              In Progress
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {exceptions.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl border p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No exceptions right now
            </h2>
            <p className="text-gray-600">
              All guest issues and missing-data cases have been resolved.
            </p>
          </div>
        </div>
      )}

      {/* Exceptions List */}
      {exceptions.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid gap-4">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                onClick={() => setSelectedEx(selectedEx?.id === ex.id ? null : ex)}
                className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition ${
                  selectedEx?.id === ex.id
                    ? 'border-amber-500 shadow-lg'
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      ex.priority === 'high' ? 'bg-red-100' :
                      ex.priority === 'medium' ? 'bg-amber-100' :
                      'bg-gray-100'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        ex.priority === 'high' ? 'text-red-600' :
                        ex.priority === 'medium' ? 'text-amber-600' :
                        'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {ex.guest}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[ex.category] || 'bg-gray-100 text-gray-800'}`}>
                          {ex.category.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 mb-2">
                        {ex.whatAsked}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(parseISO(ex.createdAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ex.priority === 'high' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                        HIGH
                      </span>
                    )}
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded capitalize">
                      {ex.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {selectedEx?.id === ex.id && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase mb-1">What asked</div>
                      <div className="text-sm text-gray-800">{ex.whatAsked}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase mb-1">What AI found</div>
                      <div className="text-sm text-gray-800">{ex.whatAiFound}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-amber-600 uppercase mb-1">Why stopped</div>
                      <div className="text-sm text-amber-800 font-medium">{ex.whyStopped}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-blue-600 uppercase mb-1">Next step</div>
                      <div className="text-sm text-blue-800">{ex.nextStep}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {ex.status === 'new' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(ex.id, 'triaged'); }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          Triage
                        </button>
                      )}
                      {ex.status === 'triaged' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(ex.id, 'in_progress'); }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          Start Work
                        </button>
                      )}
                      {ex.status === 'in_progress' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(ex.id, 'resolved'); }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                          Mark Resolved
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedEx(null); }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        Close
                      </button>
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
