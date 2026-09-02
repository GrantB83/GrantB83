'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, AlertTriangle, Download, FileText, Calendar, Phone, MapPin } from 'lucide-react'
import { useTenant } from '@/components/TenantContext'
import { format, parseISO } from 'date-fns'

interface LateBooking {
  id: number
  guest_name: string
  property_name: string
  check_in: string
  check_out: string
  room_number: string | null
  suite_or_unit: string | null
  adults: number
  children: number
  notes: string | null
  guest_phone: string | null
  estimated_arrival: string | null
  lateReason: 'after-hours' | 'note-keyword' | 'unknown-time'
  missingFields: string[]
}

interface QueueStats {
  totalLate: number
  afterHours: number
  unknownTime: number
  noteKeyword: number
  missingPhone: number
  missingETA: number
}

export default function LateCheckinQueuePage() {
  const { selectedTenantId, tenants } = useTenant()
  const [lateBookings, setLateBookings] = useState<LateBooking[]>([])
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [targetDate, setTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [afterHoursThreshold, setAfterHoursThreshold] = useState('15:00')
  const [exporting, setExporting] = useState(false)

  const activeTenant = tenants.find(t => t.id === selectedTenantId)

  const fetchLateBookings = async () => {
    if (!selectedTenantId) return
    
    setLoading(true)
    try {
      const response = await fetch(
        `/api/bookings?tenant_id=${selectedTenantId}&date=${targetDate}`
      )
      const data = await response.json()
      
      if (data.success && Array.isArray(data.bookings)) {
        // Filter and categorize late/after-hours check-ins
        const arriving = data.bookings.filter((b: any) => b.check_in === targetDate)
        const categorized: LateBooking[] = []
        
        const statsCounter = {
          totalLate: 0,
          afterHours: 0,
          unknownTime: 0,
          noteKeyword: 0,
          missingPhone: 0,
          missingETA: 0
        }

        arriving.forEach((booking: any) => {
          const notes = (booking.notes || '').toLowerCase()
          const lateCheckIn = booking.late_check_in === 1
          const hasLateKeyword = notes.includes('late') || notes.includes('after-hours') || notes.includes('after hours')
          const hasETAKeyword = notes.includes('eta') || notes.includes('arriving')
          const missingTime = !hasETAKeyword && !lateCheckIn
          
          let lateReason: 'after-hours' | 'note-keyword' | 'unknown-time' | null = null
          
          if (lateCheckIn) {
            lateReason = 'after-hours'
            statsCounter.afterHours++
          } else if (hasLateKeyword) {
            lateReason = 'note-keyword'
            statsCounter.noteKeyword++
          } else if (missingTime) {
            lateReason = 'unknown-time'
            statsCounter.unknownTime++
          }
          
          if (lateReason) {
            const missingFields: string[] = []
            const hasPhone = booking.guest_phone && booking.guest_phone.trim() !== ''
            const hasETA = hasETAKeyword || lateCheckIn
            
            if (!hasPhone) {
              missingFields.push('GUEST_PHONE')
              statsCounter.missingPhone++
            }
            if (!hasETA) {
              missingFields.push('ETA')
              statsCounter.missingETA++
            }
            
            categorized.push({
              id: booking.id,
              guest_name: booking.guest_name,
              property_name: booking.property_name || activeTenant?.name || 'Property',
              check_in: booking.check_in,
              check_out: booking.check_out,
              room_number: booking.room_number,
              suite_or_unit: booking.suite_or_unit,
              adults: booking.adults || 0,
              children: booking.children || 0,
              notes: booking.notes,
              guest_phone: booking.guest_phone,
              estimated_arrival: null,
              lateReason,
              missingFields
            })
            
            statsCounter.totalLate++
          }
        })
        
        setLateBookings(categorized)
        setStats(statsCounter)
      }
    } catch (error) {
      console.error('Error fetching late bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLateBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, targetDate, afterHoursThreshold])

  const handleExport = async (exportFormat: 'markdown' | 'text') => {
    setExporting(true)
    try {
      const exportData = {
        tenantName: activeTenant?.name || 'Demo Tenant',
        targetDate,
        afterHoursThreshold,
        lateBookings: lateBookings.map(b => ({
          guestName: b.guest_name,
          propertyName: b.property_name,
          checkIn: b.check_in,
          checkOut: b.check_out,
          roomNumber: b.room_number || '[NOT ASSIGNED]',
          adults: b.adults,
          children: b.children,
          notes: b.notes || '',
          guestPhone: b.guest_phone || '[GUEST_PHONE]',
          estimatedArrival: b.estimated_arrival || '[ETA UNKNOWN]',
          lateReason: b.lateReason,
          missingFields: b.missingFields
        })),
        stats,
        format: exportFormat
      }

      const response = await fetch('/api/late-checkin/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `late-checkin-queue-${targetDate}.${exportFormat === 'markdown' ? 'md' : 'txt'}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting:', error)
    } finally {
      setExporting(false)
    }
  }

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'after-hours':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">AFTER HOURS</span>
      case 'note-keyword':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">LATE (NOTE)</span>
      case 'unknown-time':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">TIME UNKNOWN</span>
      default:
        return null
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo Hub
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-8 h-8 text-orange-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Late / After-Hours Check-In Queue
              </h1>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full">
                Phase 19
              </span>
            </div>
            <p className="text-gray-600">
              Track arriving guests with late check-ins, after-hours arrivals, or unknown ETAs (DRAFT/fixtures only)
            </p>
          </div>
        </div>

        {activeTenant && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Active Tenant:</span>
              <span>{activeTenant.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Queue Settings</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Date (Arrivals)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              After-Hours Threshold
            </label>
            <input
              type="time"
              value={afterHoursThreshold}
              onChange={(e) => setAfterHoursThreshold(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Default: 15:00 (3 PM local)</p>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchLateBookings}
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Queue'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-xl border border-red-200">
            <div className="text-2xl font-bold text-red-900">{stats.totalLate}</div>
            <div className="text-xs text-red-700">Total Late</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
            <div className="text-2xl font-bold text-orange-900">{stats.afterHours}</div>
            <div className="text-xs text-orange-700">After Hours</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <div className="text-2xl font-bold text-amber-900">{stats.noteKeyword}</div>
            <div className="text-xs text-amber-700">Note Keyword</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.unknownTime}</div>
            <div className="text-xs text-gray-700">Unknown Time</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
            <div className="text-2xl font-bold text-purple-900">{stats.missingPhone}</div>
            <div className="text-xs text-purple-700">Missing Phone</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="text-2xl font-bold text-blue-900">{stats.missingETA}</div>
            <div className="text-xs text-blue-700">Missing ETA</div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      {lateBookings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExport('markdown')}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download Markdown
            </button>
            <button
              onClick={() => handleExport('text')}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Download Text
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Export for leave-behind or handoff notes—local demo only, never sends WhatsApp/email
          </p>
        </div>
      )}

      {/* Late Bookings List */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">
          Loading late check-ins...
        </div>
      ) : lateBookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-xl">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No late check-ins for {format(parseISO(targetDate), 'MMMM d, yyyy')}</p>
          <p className="text-sm text-gray-500 mt-2">All arriving guests have standard check-in times</p>
          <Link
            href="/demo/bookings-board"
            className="inline-block mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            View All Bookings
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Late Check-In Queue ({lateBookings.length})</h2>
          
          {lateBookings.map((booking) => (
            <div key={booking.id} className="bg-white border-2 border-orange-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{booking.guest_name}</h3>
                    {getReasonBadge(booking.lateReason)}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {booking.property_name}
                    </span>
                    <span>•</span>
                    <span>Room: {booking.room_number || '[NOT ASSIGNED]'}</span>
                    <span>•</span>
                    <span>{booking.adults} adult{booking.adults !== 1 ? 's' : ''}</span>
                    {booking.children > 0 && (
                      <>
                        <span>, {booking.children} child{booking.children !== 1 ? 'ren' : ''}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Check-In Date</div>
                  <div className="font-medium text-gray-900">{format(parseISO(booking.check_in), 'EEE, d MMM yyyy')}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Check-Out Date</div>
                  <div className="font-medium text-gray-900">{format(parseISO(booking.check_out), 'EEE, d MMM yyyy')}</div>
                </div>
              </div>

              {booking.missingFields.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900 mb-1">Missing Information</h4>
                      <div className="text-sm text-amber-800 space-y-1">
                        {booking.missingFields.includes('GUEST_PHONE') && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>Guest Phone: <code className="bg-amber-100 px-1 rounded">[GUEST_PHONE]</code> — Never invented</span>
                          </div>
                        )}
                        {booking.missingFields.includes('ETA') && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Estimated Arrival: <code className="bg-amber-100 px-1 rounded">[ETA UNKNOWN]</code> — Confirm with guest</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {booking.notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-xs text-blue-700 font-medium mb-1">Booking Notes</div>
                  <div className="text-sm text-blue-900">{booking.notes}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hard Gates */}
      <div className="mt-12 bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="font-semibold text-red-900 mb-3">⚠️ Hard Gates (Phase 19)</h3>
        <ul className="space-y-2 text-sm text-red-800">
          <li>✅ <strong>DRAFT ONLY</strong> — Never sends WhatsApp or email automatically</li>
          <li>✅ <strong>Never invents guest phone</strong> — Uses <code>[GUEST_PHONE]</code> placeholder when missing</li>
          <li>✅ <strong>Never invents ETA</strong> — Uses <code>[ETA UNKNOWN]</code> placeholder when check-in time not specified</li>
          <li>✅ <strong>Mirrors tools/browns-late-checkin-queue semantics</strong> — Same filtering logic for late/after-hours/unknown-time</li>
          <li>✅ <strong>Local demo only</strong> — Export operations are local-only with no external storage or auto-sends</li>
          <li>✅ <strong>Fixtures only</strong> — Uses tenant bookings from SQLite, no live OTA integrations</li>
        </ul>
      </div>

      {/* Info Card */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">About Late Check-In Queue (Phase 19)</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Mirrors <code>tools/browns-late-checkin-queue</code> semantics</li>
          <li>✅ Pulls arriving bookings from tenant-scoped SQLite via existing API</li>
          <li>✅ Categorizes by: after-hours flag, late/after-hours keywords in notes, or missing check-in time</li>
          <li>✅ Surfaces missing phone and ETA with placeholders—never invents contact info or arrival times</li>
          <li>✅ Optional markdown/text export for leave-behind or handoff notes (no send)</li>
          <li>✅ Configurable after-hours threshold (default: 15:00 local demo)</li>
          <li>🔒 DRAFT/fixtures only — no live payments, ads, public signup, NB API, or WhatsApp/email auto-send</li>
        </ul>
      </div>

      {/* Quick Nav */}
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <Link
          href="/demo/bookings-board"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-600 hover:shadow-lg transition text-center"
        >
          <Calendar className="w-8 h-8 text-primary-600 mx-auto mb-2" />
          <div className="font-medium text-gray-900">Bookings Board</div>
          <div className="text-sm text-gray-600">View all arrivals</div>
        </Link>
        <Link
          href="/demo/daily-brief"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-600 hover:shadow-lg transition text-center"
        >
          <FileText className="w-8 h-8 text-primary-600 mx-auto mb-2" />
          <div className="font-medium text-gray-900">Daily Brief</div>
          <div className="text-sm text-gray-600">Operations summary</div>
        </Link>
        <Link
          href="/demo/welcome-drafts"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-600 hover:shadow-lg transition text-center"
        >
          <FileText className="w-8 h-8 text-primary-600 mx-auto mb-2" />
          <div className="font-medium text-gray-900">Welcome Drafts</div>
          <div className="text-sm text-gray-600">Guest messages</div>
        </Link>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/demo"
          className="inline-block px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          Back to Demo Hub
        </Link>
      </div>
    </div>
  )
}
