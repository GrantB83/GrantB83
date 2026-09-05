'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Users, Clock, CheckCircle2, Download, FileText, Mail, StickyNote, MessageSquare } from 'lucide-react'
import { useState, useEffect, Suspense } from 'react'
import { useTenant } from '@/components/TenantContext'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

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

function DailyBriefContent() {
  const searchParams = useSearchParams()
  const { selectedTenantId, tenants } = useTenant()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [targetDate, setTargetDate] = useState(
    searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  )
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const activeTenant = tenants.find(t => t.id === selectedTenantId)

  useEffect(() => {
    const urlDate = searchParams.get('date')
    if (urlDate) {
      setTargetDate(urlDate)
    }
  }, [searchParams])

  useEffect(() => {
    if (selectedTenantId) {
      fetchBookings()
    }
  }, [selectedTenantId, targetDate])

  const fetchBookings = async () => {
    if (!selectedTenantId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/bookings?tenant_id=${selectedTenantId}&date=${targetDate}`)
      const data = await response.json()
      
      if (data.success) {
        setBookings(data.bookings)
      }
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'markdown' | 'text') => {
    setExporting(true)
    try {
      const response = await fetch('/api/daily-brief/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: activeTenant?.name,
          targetDate,
          bookings: bookings.map(b => ({
            guestName: b.guest_name,
            propertyName: b.property_name,
            roomNumber: b.room_number,
            checkIn: b.check_in,
            checkOut: b.check_out,
            status: b.derivedStatus,
            lateCheckIn: b.lateCheckIn,
            missingFields: b.missingFields,
            adults: b.adults,
            children: b.children,
            pets: b.pets,
            specialRequests: b.special_requests
          })),
          format
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `daily-brief-${targetDate}.${format === 'markdown' ? 'md' : 'txt'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const arrivals = bookings.filter(b => b.derivedStatus === 'arriving')
  const inHouse = bookings.filter(b => b.derivedStatus === 'inhouse')
  const departures = bookings.filter(b => b.derivedStatus === 'departing')
  
  const redAlerts = bookings.filter(b => b.lateCheckIn && b.derivedStatus === 'arriving')
  const amberWarnings = bookings.filter(b => b.missingFields.length > 0 || (b.special_requests && !b.lateCheckIn))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo/bookings-board" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Bookings Board
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium mb-3">
              Phase 17 🎉
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Daily Operations Brief
            </h1>
            <p className="text-gray-600">
              Generated from {activeTenant?.name || 'demo tenant'} bookings
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-2">Brief Date</div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 mt-4">Loading brief...</p>
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={<Users className="w-6 h-6 text-blue-600" />}
              label="Arrivals"
              value={arrivals.length}
              color="blue"
            />
            <StatCard
              icon={<Calendar className="w-6 h-6 text-green-600" />}
              label="In-House"
              value={inHouse.length}
              color="green"
            />
            <StatCard
              icon={<Clock className="w-6 h-6 text-orange-600" />}
              label="Departures"
              value={departures.length}
              color="orange"
            />
          </div>

          <div className="mb-6 flex gap-3">
            <button
              onClick={() => handleExport('markdown')}
              disabled={exporting || bookings.length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download Markdown
            </button>
            <button
              onClick={() => handleExport('text')}
              disabled={exporting || bookings.length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Download Text
            </button>
          </div>

          <div className="space-y-6">
            {redAlerts.length > 0 && (
              <Section title="🔴 RED - Action Required" color="red">
                {redAlerts.map(booking => (
                  <AlertItem
                    key={booking.id}
                    title={`${booking.guest_name} - ${booking.property_name}`}
                    details={`Late check-in expected. Room: ${booking.room_number || 'TBD'}`}
                    action={`Confirm arrival time and after-hours access`}
                  />
                ))}
              </Section>
            )}

            {amberWarnings.length > 0 && (
              <Section title="🟡 AMBER - Today's Priorities" color="amber">
                {amberWarnings.map(booking => (
                  <BriefItem
                    key={booking.id}
                    title={`${booking.guest_name} - ${booking.property_name}`}
                    details={
                      booking.missingFields.length > 0
                        ? `Missing: ${booking.missingFields.join(', ')}`
                        : booking.special_requests || 'Special request noted'
                    }
                    time={`${booking.derivedStatus === 'arriving' ? 'Check-in' : 'In-house'}`}
                  />
                ))}
              </Section>
            )}

            {arrivals.length > 0 && (
              <Section title={`Arrivals Today (${arrivals.length})`} color="blue">
                {arrivals.map(booking => (
                  <GuestCard key={booking.id} booking={booking} />
                ))}
              </Section>
            )}

            {inHouse.length > 0 && (
              <Section title={`In-House Guests (${inHouse.length})`} color="green">
                {inHouse.map(booking => (
                  <GuestCard key={booking.id} booking={booking} />
                ))}
              </Section>
            )}

            {departures.length > 0 && (
              <Section title={`Departures Today (${departures.length})`} color="orange">
                {departures.map(booking => (
                  <div key={booking.id} className="text-sm text-gray-600">
                    • {booking.guest_name} - {booking.property_name} (Room {booking.room_number || 'TBD'}) - checkout {booking.check_out}
                  </div>
                ))}
              </Section>
            )}

            {bookings.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No bookings for {targetDate}</p>
                <p className="text-sm text-gray-500 mt-2">Try a different date or run demo seed</p>
              </div>
            )}

            {bookings.length > 0 && (
              <Section title="Housekeeping Schedule" color="gray">
                {departures.map((booking, idx) => (
                  <TaskItem
                    key={`depart-${idx}`}
                    task={`Morning: ${booking.property_name} Room ${booking.room_number || 'TBD'} (departure)`}
                    status="pending"
                  />
                ))}
                {arrivals.map((booking, idx) => (
                  <TaskItem
                    key={`arrive-${idx}`}
                    task={`Afternoon: ${booking.property_name} Room ${booking.room_number || 'TBD'} (arrival prep)`}
                    status="pending"
                  />
                ))}
              </Section>
            )}
          </div>
        </>
      )}

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Daily Brief Features (Phase 17)</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Generated from tenant bookings in SQLite fixtures</li>
          <li>✅ RED/AMBER/GREEN priority system for fast scanning</li>
          <li>✅ Late check-in badges and missing-fields warnings</li>
          <li>✅ Housekeeping task list per arrival/departure</li>
          <li>✅ Export as Markdown or plain text for leave-behind</li>
          <li>✅ Never invents guest data—blanks stay flagged</li>
          <li>⚠️ Draft-only: team WhatsApp send requires H11 approval</li>
        </ul>
      </div>

      <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">📦 Phase 20: Demo CT-Pack Assembly</h3>
        <p className="text-sm text-gray-700 mb-4">
          Assemble this daily brief + welcome stubs + late-checkin queue into one dated CT pack (timed checklist flavor with 20:00 / 09:00 / 21:00 CT demo copy).
        </p>
        <Link
          href="/demo/ct-pack"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          <StickyNote className="w-4 h-4" />
          Assemble CT Pack
        </Link>
      </div>

      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">🚨 Phase 19: Late / After-Hours Check-In Queue</h3>
        <p className="text-sm text-gray-700 mb-4">
          View late check-ins and after-hours arrivals from today's bookings board (mirrors tools/browns-late-checkin-queue).
        </p>
        <Link
          href="/demo/late-checkin-queue"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition"
        >
          <MessageSquare className="w-4 h-4" />
          View Late Check-In Queue
        </Link>
      </div>

      <div className="mt-6 bg-rose-50 border border-rose-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">🎯 Phase 18: Welcome Message Drafts</h3>
        <p className="text-sm text-gray-700 mb-4">
          Generate welcome message stubs for today's and upcoming arrivals from your bookings board.
        </p>
        <Link
          href="/demo/welcome-drafts"
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition"
        >
          <Mail className="w-4 h-4" />
          View Welcome Drafts
        </Link>
      </div>

      <div className="mt-8 flex gap-4 justify-center">
        <Link
          href="/demo/bookings-board"
          className="inline-block px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          Back to Bookings Board
        </Link>
        <Link
          href="/demo"
          className="inline-block px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
        >
          Demo Hub
        </Link>
      </div>
    </div>
  )
}

export default function DailyBriefPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 mt-4">Loading brief...</p>
        </div>
      </div>
    }>
      <DailyBriefContent />
    </Suspense>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
  const bgColor = color === 'blue' ? 'bg-blue-50' : color === 'green' ? 'bg-green-50' : 'bg-orange-50'
  return (
    <div className={`${bgColor} p-6 rounded-xl border border-gray-200`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-600">{label}</div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, color, children }: { title: string, color: string, children: React.ReactNode }) {
  const borderColor = 
    color === 'red' ? 'border-red-200' :
    color === 'amber' ? 'border-amber-200' :
    color === 'blue' ? 'border-blue-200' :
    color === 'green' ? 'border-green-200' :
    color === 'orange' ? 'border-orange-200' :
    'border-gray-200'
  
  return (
    <div className={`bg-white border-2 ${borderColor} rounded-xl p-6`}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

function AlertItem({ title, details, action }: { title: string, details: string, action: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="font-semibold text-red-900 mb-1">{title}</h3>
      <p className="text-sm text-red-800 mb-2">{details}</p>
      <p className="text-sm font-medium text-red-900">→ {action}</p>
    </div>
  )
}

function BriefItem({ title, details, time }: { title: string, details: string, time: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h3 className="font-semibold text-amber-900 mb-1">{title}</h3>
      <p className="text-sm text-amber-800 mb-1">{details}</p>
      <p className="text-xs text-amber-700">{time}</p>
    </div>
  )
}

function GuestCard({ booking }: { booking: Booking }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{booking.guest_name}</h3>
        <div className="flex gap-2">
          {booking.lateCheckIn && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">LATE</span>
          )}
          {booking.missingFields.length > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              MISSING: {booking.missingFields.join(', ')}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-700 mb-1">
        {booking.property_name} · Room {booking.room_number || 'TBD'}
      </p>
      <p className="text-sm text-gray-600 mb-2">
        {booking.adults || 0} adult{(booking.adults || 0) !== 1 ? 's' : ''}
        {booking.children ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}
        {booking.pets && ' 🐾'}
      </p>
      {booking.special_requests && (
        <p className="text-xs text-gray-500 italic">{booking.special_requests}</p>
      )}
    </div>
  )
}

function TaskItem({ task, status }: { task: string, status: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className={`w-5 h-5 ${status === 'complete' ? 'text-green-600' : 'text-gray-300'}`} />
      <span className="text-sm text-gray-700">{task}</span>
    </div>
  )
}

export default function DailyBriefPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">Loading...</div>}>
      <DailyBriefContent />
    </Suspense>
  )
}
