'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, ChevronDown, ChevronRight, MessageSquarePlus, Clock } from 'lucide-react'

const STATUS_COLORS = {
  new: 'bg-gray-100 text-gray-800',
  contacted: 'bg-blue-100 text-blue-800',
  qualified: 'bg-purple-100 text-purple-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  converted: 'bg-teal-100 text-teal-800',
}

const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
  converted: 'Converted',
}

type Lead = {
  id: number
  name: string
  email: string
  property_name: string
  room_count: string
  current_system: string | null
  phone: string | null
  notes: string | null
  status: string
  created_at: string
  tenant_name: string | null
  invite_code: string | null // Phase 31: invite code attribution
}

type LeadNote = {
  id: number
  lead_id: number
  tenant_id: number
  note_text: string
  created_at: string
}

type CRMTableProps = {
  initialLeads: Lead[]
  tenant: any
  defaultTenantId: number
}

export default function CRMTable({ initialLeads, tenant, defaultTenantId }: CRMTableProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [updating, setUpdating] = useState<number | null>(null)
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null)
  const [leadNotes, setLeadNotes] = useState<Record<number, LeadNote[]>>({})
  const [loadingNotes, setLoadingNotes] = useState<number | null>(null)
  const [newNoteText, setNewNoteText] = useState<Record<number, string>>({})
  const [addingNote, setAddingNote] = useState<number | null>(null)

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setUpdating(leadId)
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setLeads(leads.map(lead => 
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        ))
      } else {
        alert('Failed to update status')
      }
    } catch (error) {
      alert('Network error')
    } finally {
      setUpdating(null)
    }
  }

  const handleExportCSV = () => {
    window.location.href = `/api/leads/export?tenant_id=${defaultTenantId}`
  }

  const toggleExpand = async (leadId: number) => {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null)
    } else {
      setExpandedLeadId(leadId)
      if (!leadNotes[leadId]) {
        await fetchLeadNotes(leadId)
      }
    }
  }

  const fetchLeadNotes = async (leadId: number) => {
    setLoadingNotes(leadId)
    try {
      const response = await fetch(`/api/leads/notes?lead_id=${leadId}&tenant_id=${defaultTenantId}`)
      if (response.ok) {
        const data = await response.json()
        setLeadNotes(prev => ({ ...prev, [leadId]: data.notes || [] }))
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoadingNotes(null)
    }
  }

  const handleAddNote = async (leadId: number) => {
    const noteText = newNoteText[leadId]?.trim()
    if (!noteText) return

    setAddingNote(leadId)
    try {
      const response = await fetch('/api/leads/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          tenant_id: defaultTenantId,
          note_text: noteText,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setLeadNotes(prev => ({
          ...prev,
          [leadId]: [data.note, ...(prev[leadId] || [])]
        }))
        setNewNoteText(prev => ({ ...prev, [leadId]: '' }))
      } else {
        alert('Failed to add note')
      }
    } catch (error) {
      alert('Network error')
    } finally {
      setAddingNote(null)
    }
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium mb-3">
              🎭 DEMO CRM
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Operator Lead Management
            </h1>
            <p className="text-gray-600 mt-2">
              View and manage guesthouse operator waitlist submissions
            </p>
            {tenant && (
              <p className="text-sm text-gray-500 mt-1">
                Filtered to: <span className="font-semibold">{tenant.name}</span>
              </p>
            )}
          </div>
          <div className="text-right space-y-2">
            <div className="text-3xl font-bold text-primary-600">{leads.length}</div>
            <div className="text-sm text-gray-600">Total Leads</div>
            {leads.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-4">No waitlist leads yet</p>
          <Link
            href="/waitlist"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Submit Test Lead
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rooms
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invite Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <>
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleExpand(lead.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedLeadId === lead.id ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500">{lead.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{lead.property_name}</div>
                        {lead.notes && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={lead.notes}>
                            {lead.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {lead.room_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={lead.status || 'new'}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          disabled={updating === lead.id}
                          className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer ${STATUS_COLORS[lead.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.new} ${updating === lead.id ? 'opacity-50' : ''}`}
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lead.current_system || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.invite_code ? (
                          <span className="px-2 py-1 text-xs font-mono font-semibold bg-teal-100 text-teal-800 rounded">
                            {lead.invite_code}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.phone ? (
                          <div className="text-sm text-gray-900">{lead.phone}</div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                    {expandedLeadId === lead.id && (
                      <tr key={`${lead.id}-notes`}>
                        <td colSpan={9} className="px-6 py-4 bg-gray-50">
                          <div className="max-w-4xl">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <MessageSquarePlus className="w-4 h-4" />
                                Lead Notes
                              </h4>
                            </div>

                            {/* Add Note Form */}
                            <div className="mb-4">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newNoteText[lead.id] || ''}
                                  onChange={(e) => setNewNoteText(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !addingNote) {
                                      handleAddNote(lead.id)
                                    }
                                  }}
                                  placeholder="Add a note about this lead..."
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  disabled={addingNote === lead.id}
                                />
                                <button
                                  onClick={() => handleAddNote(lead.id)}
                                  disabled={!newNoteText[lead.id]?.trim() || addingNote === lead.id}
                                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {addingNote === lead.id ? 'Adding...' : 'Add Note'}
                                </button>
                              </div>
                            </div>

                            {/* Notes List */}
                            {loadingNotes === lead.id ? (
                              <p className="text-sm text-gray-500">Loading notes...</p>
                            ) : leadNotes[lead.id] && leadNotes[lead.id].length > 0 ? (
                              <div className="space-y-3">
                                {leadNotes[lead.id].map((note) => (
                                  <div key={note.id} className="bg-white p-3 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-900">{note.note_text}</p>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(note.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No notes yet. Add the first note above.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
