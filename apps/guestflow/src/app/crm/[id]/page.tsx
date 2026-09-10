'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Copy, ExternalLink, MessageSquare, Check, Loader2, Save } from 'lucide-react'

interface Lead {
  id: number
  name: string
  email: string
  phone?: string
  property_name: string
  room_count: string
  current_system?: string
  notes?: string
  status: string
  check_in?: string
  check_out?: string
  subject?: string
  message?: string
  created_at: string
  tenant_name?: string
}

interface Note {
  id: number
  note_text: string
  created_at: string
}

const NIGHTSBRIDGE_BOOK_URL = 'https://book.nightsbridge.com/24299?promocode=WEBDIRECT'
const NIGHTSBRIDGE_PORTAL_URL = 'https://app.nightsbridge.com/property/24299'

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
  { value: 'won', label: 'Won', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'lost', label: 'Lost', color: 'bg-gray-100 text-gray-800' },
  { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-800' }
]

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string
  
  const [lead, setLead] = useState<Lead | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [whatsappDraft, setWhatsappDraft] = useState<string | null>(null)
  const [showWhatsappDraft, setShowWhatsappDraft] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    fetchLead()
    fetchNotes()
  }, [leadId])

  const fetchLead = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/leads?tenant_id=1`)
      if (response.ok) {
        const data = await response.json()
        const foundLead = data.leads.find((l: Lead) => l.id === parseInt(leadId))
        if (foundLead) {
          setLead(foundLead)
        } else {
          setError('Lead not found')
        }
      } else {
        setError('Failed to fetch lead')
      }
    } catch (err) {
      console.error('Error fetching lead:', err)
      setError('An error occurred while fetching lead')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/leads/notes?lead_id=${leadId}&tenant_id=1`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (err) {
      console.error('Error fetching notes:', err)
    }
  }

  const handleCopyWebdirectLink = async () => {
    try {
      await navigator.clipboard.writeText(NIGHTSBRIDGE_BOOK_URL)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return
    
    setUpdatingStatus(true)
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        setLead({ ...lead, status: newStatus })
      } else {
        alert('Failed to update status')
      }
    } catch (err) {
      console.error('Error updating status:', err)
      alert('An error occurred while updating status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleGenerateWhatsappDraft = async () => {
    if (!lead) return
    
    try {
      const response = await fetch(`/api/leads/${leadId}/whatsapp-draft`)
      if (response.ok) {
        const data = await response.json()
        setWhatsappDraft(data.draft)
        setShowWhatsappDraft(true)
      } else {
        alert('Failed to generate WhatsApp draft')
      }
    } catch (err) {
      console.error('Error generating WhatsApp draft:', err)
      alert('An error occurred while generating WhatsApp draft')
    }
  }

  const handleCopyWhatsappDraft = async () => {
    if (!whatsappDraft) return
    
    try {
      await navigator.clipboard.writeText(whatsappDraft)
      alert('WhatsApp draft copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy draft:', err)
    }
  }

  const handleSaveNote = async () => {
    if (!newNote.trim() || !lead) return
    
    setSavingNote(true)
    try {
      const response = await fetch('/api/leads/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          tenant_id: 1,
          note_text: newNote.trim()
        })
      })
      
      if (response.ok) {
        setNewNote('')
        await fetchNotes()
      } else {
        alert('Failed to save note')
      }
    } catch (err) {
      console.error('Error saving note:', err)
      alert('An error occurred while saving note')
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-600" />
          <p className="mt-4 text-gray-500">Loading lead details...</p>
        </div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-800 font-medium">{error || 'Lead not found'}</p>
          <Link
            href="/crm"
            className="mt-4 inline-block px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition"
          >
            Back to CRM
          </Link>
        </div>
      </div>
    )
  }

  const statusOption = STATUS_OPTIONS.find(opt => opt.value === lead.status) || STATUS_OPTIONS[0]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/crm" className="inline-flex items-center text-slate-600 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to CRM
      </Link>

      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          Lead Details: {lead.name}
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusOption.color}`}>
            {statusOption.label}
          </span>
        </h1>
        <p className="text-sm text-gray-700">
          Internal Browns lead management - actions to reduce enquiry-to-booking friction
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border-2 border-slate-200 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={handleCopyWebdirectLink}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copiedLink ? 'Copied!' : 'Copy WEBDIRECT Link'}
          </button>
          
          <a
            href={NIGHTSBRIDGE_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            <ExternalLink className="w-5 h-5" />
            Open Nightsbridge
          </a>
          
          <button
            onClick={handleGenerateWhatsappDraft}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
          >
            <MessageSquare className="w-5 h-5" />
            Draft WhatsApp
          </button>
          
          <div className="relative">
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg font-semibold text-gray-900 hover:border-slate-500 transition cursor-pointer disabled:opacity-50"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* WhatsApp Draft */}
      {showWhatsappDraft && whatsappDraft && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-green-900 mb-3">WhatsApp Draft (Human-Gated)</h3>
          <div className="bg-white border border-green-300 rounded-lg p-4 mb-4 font-mono text-sm whitespace-pre-wrap">
            {whatsappDraft}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCopyWhatsappDraft}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Draft
            </button>
            <button
              onClick={() => setShowWhatsappDraft(false)}
              className="px-4 py-2 bg-white border-2 border-green-300 text-green-900 rounded-lg font-semibold hover:bg-green-50 transition"
            >
              Close
            </button>
          </div>
          <p className="mt-3 text-xs text-green-800">
            ⚠️ This is a DRAFT only. Review and send manually via WhatsApp. Never auto-send.
          </p>
        </div>
      )}

      {/* Lead Information */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase">Name</dt>
              <dd className="text-sm text-gray-900">{lead.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase">Email</dt>
              <dd className="text-sm text-gray-900">
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                  {lead.email}
                </a>
              </dd>
            </div>
            {lead.phone && (
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Phone</dt>
                <dd className="text-sm text-gray-900">
                  <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                    {lead.phone}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase">Source</dt>
              <dd className="text-sm text-gray-900">{lead.current_system || 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase">Submitted</dt>
              <dd className="text-sm text-gray-900">
                {new Date(lead.created_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Inquiry Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase">Property</dt>
              <dd className="text-sm text-gray-900">{lead.property_name}</dd>
            </div>
            {lead.check_in && (
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Check-in</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(lead.check_in).toLocaleDateString()}
                </dd>
              </div>
            )}
            {lead.check_out && (
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Check-out</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(lead.check_out).toLocaleDateString()}
                </dd>
              </div>
            )}
            {lead.subject && (
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Subject</dt>
                <dd className="text-sm text-gray-900">{lead.subject}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Message */}
      {lead.message && (
        <div className="bg-white border-2 border-slate-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Message</h2>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap">
            {lead.message}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Notes</h2>
        
        {/* Add Note */}
        <div className="mb-6">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note about this lead..."
            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            rows={3}
          />
          <button
            onClick={handleSaveNote}
            disabled={!newNote.trim() || savingNote}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingNote ? 'Saving...' : 'Save Note'}
          </button>
        </div>

        {/* Notes List */}
        {notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map(note => (
              <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note_text}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No notes yet</p>
        )}
      </div>
    </div>
  )
}
