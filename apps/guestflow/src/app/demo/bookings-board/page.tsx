'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Users, AlertTriangle, CheckCircle, Clock, BedDouble } from 'lucide-react'
import { useState, useEffect } from 'react'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { useTenant } from '@/components/TenantContext'

interface Booking {
  id: number
  guest_name: string
  suite_or_unit: string | null
  check_in: string
  check_out: string
  adults: number
  children: number
  notes: string | null
  late_check_in: boolean
  status: string
}

export default function BookingsBoardPage() {
  const { activeTenant } = useTenant()
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (activeTenant) {
      fetchBookings()
    }
  }, [selectedDay, activeTenant])

  const fetchBookings = async () => {
    if (!activeTenant) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/bookings?tenant_id=${activeTenant.id}&day=${selectedDay}`)
      const data = await res.json()

      if (res.ok) {
        setBookings(data.bookings || [])
      } else {
        setError(data.error || 'Failed to fetch bookings')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deriveStatus = (booking: Booking): 'arriving' | 'departing' | 'inhouse' | 'unknown' => {
    const checkIn = booking.check_in
    const checkOut = booking.check_out

    if (checkIn === selectedDay) return 'arriving'
    if (checkOut === selectedDay) return 'departing'
    if (checkIn < selectedDay && checkOut > selectedDay) return 'inhouse'
    return 'unknown'
  }

  const groupedBookings = {
    arriving: bookings.filter(b => deriveStatus(b) === 'arriving'),
    inhouse: bookings.filter(b => deriveStatus(b) === 'inhouse'),
    departing: bookings.filter(b => deriveStatus(b) === 'departing'),
  }

  const hasLateArrivals = groupedBookings.arriving.some(b => b.late_check_in)
  const hasMissingFields = bookings.some(b => !b.suite_or_unit || !b.guest_name)

  const navigateDay = (direction: 'prev' | 'next') => {
    const current = parseISO(selectedDay)
    const newDay = direction === 'prev' ? subDays(current, 1) : addDays(current, 1)
    setSelectedDay(format(newDay, 'yyyy-MM-dd'))
  }

  const BookingCard = ({ booking, statusLabel }: { booking: Booking; statusLabel: string }) => {
    const statusColors = {
      arriving: 'bg-green-100 text-green-800 border-green-200',
      inhouse: 'bg-purple-100 text-purple-800 border-purple-200',
      departing: 'bg-blue-100 text-blue-800 border-blue-200',
    }

    const colorClass = statusColors[statusLabel as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200'

    return (
      <div className={`border rounded-lg p-4 ${colorClass}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              {booking.guest_name || '[GUEST NAME MISSING]'}
              {!booking.guest_name && (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
            </h4>
            <div className="text-sm text-gray-700 mt-1 flex items-center gap-2">
              <BedDouble className="w-4 h-4" />
              {booking.suite_or_unit || '[SUITE NOT ASSIGNED]'}
              {!booking.suite_or_unit && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                  NO SUITE
                </span>
              )}
            </div>
          </div>
          {booking.late_check_in && (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              LATE
            </span>
          )}
        </div>

        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              {format(parseISO(booking.check_in), 'MMM d')} → {format(parseISO(booking.check_out), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>
              {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
              {booking.children > 0 && `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}`}
            </span>
          </div>
          {booking.notes && (
            <div className="mt-2 text-xs text-gray-700 bg-white bg-opacity-50 rounded p-2">
              {booking.notes}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo Hub
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium mb-3">
          Phase 16 🎯 DEMO BOOKINGS BOARD
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Same-Day Bookings Board
        </h1>
        <p className="text-gray-600">
          View arrivals, in-house, and departing guests for a selected day
        </p>
      </div>

      {activeTenant && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="text-sm text-primary-900">
            <strong>Active Tenant:</strong> {activeTenant.name}
          </div>
        </div>
      )}

      {/* Date Navigator */}
      <div className="mb-8 bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigateDay('prev')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
          >
            ← Previous Day
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => navigateDay('next')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
          >
            Next Day →
          </button>
        </div>
      </div>

      {/* Warnings */}
      {(hasLateArrivals || hasMissingFields) && (
        <div className="mb-8 space-y-3">
          {hasLateArrivals && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">Late Check-Ins Detected</h4>
                <p className="text-sm text-amber-800">
                  {groupedBookings.arriving.filter(b => b.late_check_in).length} guest(s) arriving late today
                </p>
              </div>
            </div>
          )}
          {hasMissingFields && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Missing Fields Detected</h4>
                <p className="text-sm text-red-800">
                  Some bookings are missing guest names or suite assignments. Never invent missing data.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-600">
          Loading bookings...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800">{error}</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-xl">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bookings for {format(parseISO(selectedDay), 'MMMM d, yyyy')}</p>
          <Link
            href="/demo/nightsbridge-import"
            className="inline-block mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            Import Bookings
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Arriving */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b border-green-200">
              <h3 className="font-semibold text-green-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Arriving ({groupedBookings.arriving.length})
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {groupedBookings.arriving.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No arrivals</p>
              ) : (
                groupedBookings.arriving.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} statusLabel="arriving" />
                ))
              )}
            </div>
          </div>

          {/* In-House */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
              <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                <BedDouble className="w-5 h-5" />
                In-House ({groupedBookings.inhouse.length})
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {groupedBookings.inhouse.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No in-house guests</p>
              ) : (
                groupedBookings.inhouse.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} statusLabel="inhouse" />
                ))
              )}
            </div>
          </div>

          {/* Departing */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Departing ({groupedBookings.departing.length})
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {groupedBookings.departing.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No departures</p>
              ) : (
                groupedBookings.departing.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} statusLabel="departing" />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">About This Demo Board</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Displays bookings imported from Nightsbridge-style CSV/TSV</li>
          <li>✅ Automatically categorizes by arrival/in-house/departure status</li>
          <li>⚠️ Flags missing fields (never invents guest names, suite assignments, or rates)</li>
          <li>⚠️ Late check-ins highlighted in amber</li>
          <li>🎯 Tenant-scoped: Only shows bookings for active demo tenant</li>
          <li>🔒 Fixtures only — no live OTA integrations</li>
        </ul>
      </div>
    </div>
  )
}
