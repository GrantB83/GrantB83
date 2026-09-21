'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Copy, CheckCircle, ExternalLink, Plane, Home } from 'lucide-react'
import { useState, useEffect } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { useTenant } from '@/components/TenantContext'
import { getClientGuestPortalUrl } from '@/lib/portal-url'

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

export default function ArrivalsDeparturesPage() {
  const { selectedTenantId } = useTenant()
  const [arrivals, setArrivals] = useState<Booking[]>([])
  const [departures, setDepartures] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  
  // Default date range: today to +7 days (Africa/Johannesburg timezone handled by browser)
  const today = format(new Date(), 'yyyy-MM-dd')
  const defaultTo = format(addDays(new Date(), 7), 'yyyy-MM-dd')
  
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(defaultTo)
  const [includeCancelled, setIncludeCancelled] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedTenantId, fromDate, toDate, includeCancelled])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedTenantId) {
        params.set('tenant_id', selectedTenantId.toString())
      }
      params.set('from', fromDate)
      params.set('to', toDate)
      
      const res = await fetch(`/api/ops/arrivals-departures?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        let arrivalsData = data.arrivals || []
        let departuresData = data.departures || []
        
        // Client-side filter for cancelled if not included
        if (!includeCancelled) {
          arrivalsData = arrivalsData.filter((b: Booking) => b.status !== 'cancelled')
          departuresData = departuresData.filter((b: Booking) => b.status !== 'cancelled')
        }
        
        setArrivals(arrivalsData)
        setDepartures(departuresData)
      }
    } catch (err) {
      // Never log PII
      console.error('Failed to load arrivals/departures')
    } finally {
      setLoading(false)
    }
  }

  const copyPortalLink = async (bookingId: number) => {
    const portalUrl = getClientGuestPortalUrl(bookingId.toString())
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopiedId(bookingId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      alert('Failed to copy link')
    }
  }

  const renderBookingTable = (bookings: Booking[], type: 'arrival' | 'departure') => {
    if (bookings.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No {type}s found for this date range</p>
          <Link
            href="/ops/nightsbridge-import"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Import from Nightsbridge
          </Link>
        </div>
      )
    }

    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">
            {bookings.length} {type === 'arrival' ? 'Arrival' : 'Departure'}{bookings.length !== 1 ? 's' : ''}
          </h3>
          <p className="text-xs text-gray-600 mt-1">Scroll horizontally to view all columns</p>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suite/Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {type === 'arrival' && booking.checkInDate 
                          ? format(parseISO(booking.checkInDate), 'MMM d, yyyy')
                          : type === 'departure' && booking.checkOutDate
                          ? format(parseISO(booking.checkOutDate), 'MMM d, yyyy')
                          : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{booking.guestName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {booking.propertyName || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {booking.suiteOrUnit || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {booking.adults || 0}A / {booking.children || 0}C
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {booking.guestPhone || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          booking.status === 'arriving' ? 'bg-green-100 text-green-800' :
                          booking.status === 'departing' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'inhouse' ? 'bg-purple-100 text-purple-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status || 'pending'}
                        </span>
                        {booking.lateCheckIn && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                            LATE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
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
                        <a
                          href={getClientGuestPortalUrl(booking.id.toString())}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          title="Preview guest portal"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/ops" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Ops Hub
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium mb-3">
          Arrivals & Departures 🛬🛫
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Arrivals & Departures
        </h1>
        <p className="text-gray-600">
          View arrivals by check-in date and departures by check-out date
        </p>
      </div>

      {/* Date Range Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="from-date" className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              id="from-date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="to-date" className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              id="to-date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCancelled}
                onChange={(e) => setIncludeCancelled(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Include cancelled</span>
            </label>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Dates are interpreted in Africa/Johannesburg timezone
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading arrivals and departures...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Arrivals Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Plane className="w-5 h-5 text-green-600 transform -rotate-45" />
              <h2 className="text-xl font-bold text-gray-900">Arrivals</h2>
            </div>
            {renderBookingTable(arrivals, 'arrival')}
          </div>

          {/* Departures Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Departures</h2>
            </div>
            {renderBookingTable(departures, 'departure')}
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">About This Page</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>✅ Arrivals: Bookings where check-in date is within the selected range</li>
          <li>✅ Departures: Bookings where check-out date is within the selected range</li>
          <li>✅ NOT stay-overlap filtering (use Bookings page for that)</li>
          <li>✅ Cancelled bookings excluded by default</li>
          <li>✅ Phone numbers displayed but never logged to console</li>
        </ul>
      </div>
    </div>
  )
}
