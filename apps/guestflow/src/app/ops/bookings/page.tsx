'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Copy, CheckCircle, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { useTenant } from '@/components/TenantContext'

interface Booking {
  id: number
  guestName: string
  checkInDate: string
  checkOutDate: string
  suiteOrUnit: string
  propertyName: string
  adults: number
  children: number
  notes: string
  lateCheckIn: boolean
  guestPhone: string
  guestEmail?: string
  guestEmailKind?: string
  guestPhoneSource?: string
  guestEmailSource?: string
  status: string
}

export default function BookingsPage() {
  const { selectedTenantId } = useTenant()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editNote, setEditNote] = useState('')

  useEffect(() => {
    loadBookings()
  }, [selectedTenantId])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedTenantId) {
        params.set('tenant_id', selectedTenantId.toString())
      }
      
      const res = await fetch(`/api/bookings?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        setBookings(data.bookings || [])
      }
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyPortalLink = async (bookingId: number) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/generate-link`, {
        method: 'POST'
      })
      const data = await res.json()
      
      if (!res.ok || !data.magicLink) {
        alert('Failed to generate portal link')
        return
      }
      
      await navigator.clipboard.writeText(data.magicLink)
      setCopiedId(bookingId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      alert('Failed to copy link')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/ops" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Ops Hub
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium mb-3">
          Bookings Management 📅
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          All Bookings
        </h1>
        <p className="text-gray-600">
          View bookings, copy guest portal links, and manage reservations
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No bookings found</p>
          <Link
            href="/ops/nightsbridge-import"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Import from Nightsbridge
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">
              {bookings.length} Booking{bookings.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-xs text-gray-600 mt-1">Scroll horizontally to view all columns</p>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suite</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{booking.guestName}</div>
                        {booking.guestPhone && (
                          <div className="text-xs text-gray-500">{booking.guestPhone}</div>
                        )}
                        {booking.guestEmail && (
                          <div className="text-xs text-gray-500">
                            {booking.guestEmail}
                            {booking.guestEmailKind === 'relay' ? ' · relay' : ''}
                          </div>
                        )}
                        {(booking.guestPhoneSource || booking.guestEmailSource) && (
                          <div className="text-[10px] text-gray-400">
                            {booking.guestPhoneSource || '—'} / {booking.guestEmailSource || '—'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {booking.suiteOrUnit || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {booking.checkInDate ? format(parseISO(booking.checkInDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {booking.checkOutDate ? format(parseISO(booking.checkOutDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        booking.status === 'arriving' ? 'bg-green-100 text-green-800' :
                        booking.status === 'departing' ? 'bg-blue-100 text-blue-800' :
                        booking.status === 'inhouse' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status || 'pending'}
                      </span>
                      {booking.lateCheckIn && (
                        <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                          LATE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingId(booking.id)
                            setEditPhone(booking.guestPhone || '')
                            setEditEmail(booking.guestEmail || '')
                            setEditNote('')
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition whitespace-nowrap"
                        >
                          Contact
                        </button>
                        <button
                          onClick={() => copyPortalLink(booking.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition whitespace-nowrap"
                          title="Copy guest portal link"
                        >
                          {copiedId === booking.id ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Link
                            </>
                          )}
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/bookings/${booking.id}/generate-link`, {
                                method: 'POST'
                              })
                              const data = await res.json()
                              
                              if (res.ok && data.magicLink) {
                                window.open(data.magicLink, '_blank', 'noopener,noreferrer')
                              } else {
                                alert('Failed to generate portal link')
                              }
                            } catch (err) {
                              alert('Failed to preview portal')
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          title="Preview guest portal"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editingId && (
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Staff contact entry</h3>
          <p className="text-sm text-gray-600 mb-3">
            Saves phone/email on this booking only. Does not send. Cannot overwrite A&amp;D values.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={editPhone}
              onChange={(event) => setEditPhone(event.target.value)}
              placeholder="Phone"
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={editEmail}
              onChange={(event) => setEditEmail(event.target.value)}
              placeholder="Email"
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={async () => {
                setEditNote('')
                const res = await fetch(`/api/ops/bookings/${editingId}/contacts`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ phone: editPhone, email: editEmail }),
                })
                const data = await res.json()
                if (!res.ok) {
                  setEditNote(data.error || 'Save failed')
                  return
                }
                setEditNote('Saved (not sent)')
                setEditingId(null)
                loadBookings()
              }}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"
            >
              Save contact
            </button>
          </div>
          {editNote && <p className="text-sm text-slate-600 mt-2">{editNote}</p>}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Guest Portal Links</h3>
        <p className="text-sm text-gray-700 mb-3">
          Each booking gets a unique magic link token for secure guest portal access
        </p>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>✅ Magic tokens generated via <code className="bg-blue-100 px-1 rounded">/api/bookings/[id]/generate-link</code></li>
          <li>✅ Portal shows standardized stay packet (WiFi, check-in times, house rules, directions)</li>
          <li>✅ Never invents WiFi passwords, phone numbers, or contact details</li>
          <li>✅ Missing data displays as [PLACEHOLDER] — never fabricated</li>
        </ul>
      </div>
    </div>
  )
}
