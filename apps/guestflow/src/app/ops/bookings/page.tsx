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
  status: string
}

export default function BookingsPage() {
  const { selectedTenantId } = useTenant()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<number | null>(null)

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
    const portalUrl = `${window.location.origin}/guest/${bookingId}`
    try {
      await navigator.clipboard.writeText(portalUrl)
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
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">
              {bookings.length} Booking{bookings.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div className="overflow-x-auto">
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
                          onClick={() => copyPortalLink(booking.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition"
                          title="Copy guest portal link"
                        >
                          {copiedId === booking.id ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Portal Link
                            </>
                          )}
                        </button>
                        <a
                          href={`/guest/${booking.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          title="Preview guest portal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Guest Portal Links</h3>
        <p className="text-sm text-gray-700 mb-3">
          Each booking gets a unique portal link: <code className="bg-blue-100 px-1 rounded">/guest/[bookingId]</code>
        </p>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>✅ Guests authenticate with booking ref + last name</li>
          <li>✅ Portal shows standardized stay packet (WiFi, check-in times, house rules, directions)</li>
          <li>✅ Never invents WiFi passwords, phone numbers, or contact details</li>
          <li>✅ Missing data displays as [PLACEHOLDER] — never fabricated</li>
        </ul>
      </div>
    </div>
  )
}
