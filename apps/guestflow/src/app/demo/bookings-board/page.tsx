'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Users, AlertCircle, ClipboardList } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTenant } from '@/components/TenantContext'
import { format } from 'date-fns'

interface Booking {
  id: number
  guest_name: string
  property_name: string
  check_in: string
  check_out: string
  room_number: string
  derivedStatus: string
  lateCheckIn: boolean
  missingFields: string[]
  adults?: number
  children?: number
  pets?: boolean
  special_requests?: string
}

export default function BookingsBoardPage() {
  const { selectedTenantId, tenants } = useTenant()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [targetDate, setTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeTenant = tenants.find(t => t.id === selectedTenantId)

  useEffect(() => {
    if (selectedTenantId) {
      fetchBookings()
    }
  }, [selectedTenantId, targetDate])

  const fetchBookings = async () => {
    if (!selectedTenantId) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/bookings?tenant_id=${selectedTenantId}&date=${targetDate}`)
      const data = await response.json()
      
      if (data.success) {
        setBookings(data.bookings)
      } else {
        setError(data.error || 'Failed to fetch bookings')
      }
    } catch (err) {
      setError('Network error fetching bookings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const arrivingToday = bookings.filter(b => b.derivedStatus === 'arriving')
  const departingToday = bookings.filter(b => b.derivedStatus === 'departing')
  const inHouse = bookings.filter(b => b.derivedStatus === 'inhouse')
  const upcoming = bookings.filter(b => b.check_in > targetDate)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo Hub
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium mb-3">
          Phase 16 → 17
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bookings Board
        </h1>
        <p className="text-gray-600">
          View and manage tenant bookings • Generate daily ops brief from fixtures
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Active Tenant</h3>
            <p className="text-sm text-gray-600">
              {activeTenant?.name || 'No tenant selected'}
            </p>
          </div>
          <div className="text-right">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              View Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Arriving" value={arrivingToday.length} color="green" />
          <StatCard label="In-House" value={inHouse.length} color="blue" />
          <StatCard label="Departing" value={departingToday.length} color="orange" />
          <StatCard label="Upcoming" value={upcoming.length} color="gray" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">Error</h4>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-3">
        <Link
          href={`/demo/daily-brief?tenant_id=${selectedTenantId}&date=${targetDate}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          <ClipboardList className="w-5 h-5" />
          Generate Daily Ops Brief
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 mt-4">Loading bookings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {arrivingToday.length > 0 && (
            <BookingSection title="🟢 Arriving Today" bookings={arrivingToday} color="green" />
          )}

          {inHouse.length > 0 && (
            <BookingSection title="🔵 In-House" bookings={inHouse} color="blue" />
          )}

          {departingToday.length > 0 && (
            <BookingSection title="🟠 Departing Today" bookings={departingToday} color="orange" />
          )}

          {upcoming.length > 0 && (
            <BookingSection title="📅 Upcoming Bookings" bookings={upcoming.slice(0, 5)} color="gray" />
          )}

          {bookings.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No bookings found for {activeTenant?.name}</p>
              <p className="text-sm text-gray-500 mt-2">Run demo seed to populate fixtures</p>
              <Link
                href="/demo/seed"
                className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Go to Demo Seed
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Phase 16 → 17 Features</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Bookings board shows tenant bookings from fixtures/database</li>
          <li>✅ Status derived from selected date (arriving/in-house/departing)</li>
          <li>✅ Late check-in badges and missing-fields warnings</li>
          <li>✅ "Generate Daily Ops Brief" button links to dynamic brief</li>
          <li>✅ Never invents guest data—only displays what's in fixtures</li>
          <li>⚠️ DEMO ONLY—no live OTA API, no NightsBridge sync, no auto-send</li>
        </ul>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
  const bgColor = 
    color === 'green' ? 'bg-green-50 border-green-200' :
    color === 'blue' ? 'bg-blue-50 border-blue-200' :
    color === 'orange' ? 'bg-orange-50 border-orange-200' :
    'bg-gray-50 border-gray-200'

  return (
    <div className={`${bgColor} border rounded-lg p-4 text-center`}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}

function BookingSection({ title, bookings, color }: { title: string, bookings: Booking[], color: string }) {
  const borderColor =
    color === 'green' ? 'border-green-200' :
    color === 'blue' ? 'border-blue-200' :
    color === 'orange' ? 'border-orange-200' :
    'border-gray-200'

  return (
    <div className={`bg-white border-2 ${borderColor} rounded-xl p-6`}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-3">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
    </div>
  )
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{booking.guest_name}</h3>
          <p className="text-sm text-gray-600">
            {booking.property_name} • Room: {booking.room_number || 'TBD'}
          </p>
        </div>
        <div className="flex gap-2">
          {booking.lateCheckIn && (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
              LATE
            </span>
          )}
          {booking.missingFields.length > 0 && (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
              MISSING: {booking.missingFields.join(', ')}
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center text-sm">
        <div className="text-gray-700">
          <span className="font-medium">In:</span> {booking.check_in} • 
          <span className="font-medium ml-2">Out:</span> {booking.check_out}
        </div>
        <div className="text-gray-600">
          {booking.adults || 0}A {booking.children ? `${booking.children}C` : ''}
          {booking.pets && ' 🐾'}
        </div>
      </div>
      {booking.special_requests && (
        <p className="text-xs text-gray-500 italic mt-2">{booking.special_requests}</p>
      )}
    </div>
  )
}
