'use client'

import Link from 'next/link'
import { ArrowLeft, Upload, Calendar, CheckCircle, AlertCircle, FileSpreadsheet, Save } from 'lucide-react'
import { useState } from 'react'
import { format, parseISO, differenceInDays, addDays } from 'date-fns'
import { useTenant } from '@/components/TenantContext'

interface ParsedBooking {
  guestName: string
  suiteOrUnit: string
  status: string
  checkInDate: string
  checkOutDate: string
  lateCheckIn: boolean
  adults?: number
  children?: number
  notes?: string
}

interface Gap {
  date: string
  nights: number
}

export default function NightsbridgeImportPage() {
  const { activeTenant } = useTenant()
  const [csvText, setCsvText] = useState('')
  const [targetDate, setTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [bookings, setBookings] = useState<ParsedBooking[]>([])
  const [gaps, setGaps] = useState<Gap[]>([])
  const [parsed, setParsed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [missingFields, setMissingFields] = useState<Array<{guest: string, field: string}>>([])

  const handleParseCsv = () => {
    setError('')
    setParsed(false)
    setBookings([])
    setGaps([])
    setMissingFields([])
    setSaved(false)

    try {
      if (!csvText.trim()) {
        setError('Please paste CSV data')
        return
      }

      const lines = csvText.trim().split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        setError('CSV must have at least a header and one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
      const rows = lines.slice(1)

      const parsedBookings: ParsedBooking[] = []
      const missing: Array<{guest: string, field: string}> = []

      rows.forEach((row) => {
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''))
        const booking: any = {}

        headers.forEach((header, index) => {
          const value = values[index] || ''
          
          if (header.includes('guest') || header.includes('name')) {
            booking.guestName = value
          } else if (header.includes('suite') || header.includes('room') || header.includes('unit')) {
            booking.suiteOrUnit = value
          } else if (header.includes('checkin') || header.includes('check-in') || header.includes('arrive') || header.includes('arrival')) {
            booking.checkInDate = value
          } else if (header.includes('checkout') || header.includes('check-out') || header.includes('depart') || header.includes('departure')) {
            booking.checkOutDate = value
          } else if (header.includes('adult')) {
            booking.adults = parseInt(value) || 2
          } else if (header.includes('child') || header.includes('kid')) {
            booking.children = parseInt(value) || 0
          } else if (header.includes('note') || header.includes('comment') || header.includes('request')) {
            booking.notes = value
          } else if (header.includes('late')) {
            booking.lateCheckIn = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes'
          } else if (header.includes('status')) {
            booking.status = value
          }
        })

        // Track missing required fields
        if (!booking.guestName) {
          missing.push({ guest: 'Row ' + (rows.indexOf(row) + 2), field: 'guestName' })
        }
        if (!booking.checkInDate) {
          missing.push({ guest: booking.guestName || 'Row ' + (rows.indexOf(row) + 2), field: 'checkInDate' })
        }
        if (!booking.checkOutDate) {
          missing.push({ guest: booking.guestName || 'Row ' + (rows.indexOf(row) + 2), field: 'checkOutDate' })
        }

        if (!booking.status && booking.checkInDate && booking.checkOutDate) {
          const checkIn = parseISO(booking.checkInDate)
          const checkOut = parseISO(booking.checkOutDate)
          const target = parseISO(targetDate)

          if (format(checkIn, 'yyyy-MM-dd') === targetDate) {
            booking.status = 'arriving'
          } else if (format(checkOut, 'yyyy-MM-dd') === targetDate) {
            booking.status = 'departing'
          } else if (target > checkIn && target < checkOut) {
            booking.status = 'inhouse'
          } else {
            booking.status = ''
          }
        }

        if (booking.notes && booking.notes.toLowerCase().includes('late')) {
          booking.lateCheckIn = true
        }

        parsedBookings.push(booking as ParsedBooking)
      })

      setBookings(parsedBookings)
      setMissingFields(missing)
      
      const detectedGaps = findGaps(parsedBookings, targetDate)
      setGaps(detectedGaps)
      
      setParsed(true)
    } catch (err: any) {
      setError(`Parsing error: ${err.message}`)
    }
  }

  const findGaps = (bookingList: ParsedBooking[], fromDate: string): Gap[] => {
    const suites = new Set(bookingList.map(b => b.suiteOrUnit).filter(Boolean))
    const gapList: Gap[] = []

    suites.forEach(suite => {
      const suiteBookings = bookingList
        .filter(b => b.suiteOrUnit === suite && b.checkInDate && b.checkOutDate)
        .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))

      const targetDateObj = parseISO(fromDate)
      
      for (let i = 0; i < suiteBookings.length - 1; i++) {
        const currentCheckOut = parseISO(suiteBookings[i].checkOutDate)
        const nextCheckIn = parseISO(suiteBookings[i + 1].checkInDate)
        const gapNights = differenceInDays(nextCheckIn, currentCheckOut)

        if (gapNights > 0 && currentCheckOut >= targetDateObj) {
          gapList.push({
            date: format(currentCheckOut, 'yyyy-MM-dd'),
            nights: gapNights
          })
        }
      }
    })

    return gapList
  }

  const handleSaveBookings = async () => {
    if (!activeTenant) {
      setSaveError('No active tenant selected')
      return
    }

    setSaving(true)
    setSaveError('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: activeTenant.id,
          bookings: bookings,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSaved(true)
        if (data.errors && data.errors.length > 0) {
          setSaveError(`Saved ${data.inserted} booking(s), but ${data.errors.length} had errors`)
        }
      } else {
        setSaveError(data.error || 'Failed to save bookings')
      }
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setCsvText('')
    setBookings([])
    setGaps([])
    setParsed(false)
    setSaved(false)
    setError('')
    setSaveError('')
    setMissingFields([])
  }

  const sampleCsv = `Guest Name,Suite,Check-in,Check-out,Adults,Children,Notes
Sarah & Tom Henderson,Luxury Suite 1,${format(new Date(), 'yyyy-MM-dd')},${format(addDays(new Date(), 2), 'yyyy-MM-dd')},2,0,Anniversary
The Mbeki Family,Family Suite 3,${format(new Date(), 'yyyy-MM-dd')},${format(addDays(new Date(), 4), 'yyyy-MM-dd')},2,2,Late arrival ~19:00
Emma Thompson,Garden Suite 2,${format(addDays(new Date(), -1), 'yyyy-MM-dd')},${format(addDays(new Date(), 1), 'yyyy-MM-dd')},1,0,Vegetarian breakfast`

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo Hub
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium mb-3">
          Phase 16 🎯 DEMO / NO LIVE OTA CALLS
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          NightsBridge CSV Import
        </h1>
        <p className="text-gray-600">
          Upload NightsBridge-style CSV to parse bookings and detect availability gaps
        </p>
      </div>

      {activeTenant && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="text-sm text-primary-900">
            <strong>Active Tenant:</strong> {activeTenant.name}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-amber-900 mb-2">⚠️ Draft Mode Only</h3>
        <ul className="space-y-1 text-sm text-amber-800">
          <li>✅ Parses CSV and shows structured booking data</li>
          <li>✅ Detects availability gaps between bookings</li>
          <li>⚠️ <strong>No live OTA API calls</strong> (NightsBridge, Booking.com, Airbnb)</li>
          <li>⚠️ Drafts only — no automatic booking creation</li>
          <li>⚠️ Uses tools/browns-nightsbridge-bookings-adapter format if available</li>
        </ul>
      </div>

      {!parsed ? (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <label className="block mb-2 font-semibold text-gray-900">
              Target Date (for status derivation)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Status (arriving/inhouse/departing) will be derived relative to this date
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <label className="block mb-2 font-semibold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Paste CSV Data
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={sampleCsv}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleParseCsv}
                disabled={!csvText.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Parse CSV
              </button>
              <button
                onClick={() => setCsvText(sampleCsv)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Load Sample
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Parsing Error</h4>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Expected CSV Format</h3>
            <p className="text-sm text-gray-700 mb-3">
              Flexible header aliases supported (case-insensitive):
            </p>
            <ul className="space-y-1 text-sm text-gray-700">
              <li><code className="px-2 py-1 bg-white rounded">guest, name, guestName</code> → Guest name</li>
              <li><code className="px-2 py-1 bg-white rounded">suite, room, unit</code> → Suite/Unit</li>
              <li><code className="px-2 py-1 bg-white rounded">checkin, check-in, arrive, arrival</code> → Check-in date (YYYY-MM-DD)</li>
              <li><code className="px-2 py-1 bg-white rounded">checkout, check-out, depart, departure</code> → Check-out date (YYYY-MM-DD)</li>
              <li><code className="px-2 py-1 bg-white rounded">adults, adult</code> → Number of adults</li>
              <li><code className="px-2 py-1 bg-white rounded">children, child, kids</code> → Number of children</li>
              <li><code className="px-2 py-1 bg-white rounded">notes, comments, special requests</code> → Notes/requests</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900">CSV Parsed Successfully</h4>
              <p className="text-sm text-green-800">
                Found {bookings.length} booking(s) and {gaps.length} availability gap(s)
              </p>
            </div>
          </div>

          {missingFields.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900">Missing Fields Detected</h4>
                  <p className="text-sm text-red-800 mb-3">
                    ⚠️ {missingFields.length} field(s) missing. Never invent guest names, dates, or suite assignments.
                  </p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-red-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-red-900">Guest/Row</th>
                    <th className="px-3 py-2 text-left text-red-900">Missing Field</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-200">
                  {missingFields.slice(0, 10).map((mf, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-3 py-2 text-gray-900">{mf.guest}</td>
                      <td className="px-3 py-2 text-gray-700">{mf.field}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {missingFields.length > 10 && (
                <p className="text-xs text-red-700 mt-2">
                  Showing first 10 of {missingFields.length} missing fields
                </p>
              )}
            </div>
          )}

          {saved && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Bookings Saved to Database</h4>
                <p className="text-sm text-blue-800">
                  View them on the <Link href="/demo/bookings-board" className="underline font-semibold">Bookings Board</Link>
                </p>
              </div>
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800">{saveError}</p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Parsed Bookings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suite/Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guests</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{booking.guestName || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{booking.suiteOrUnit || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          booking.status === 'arriving' ? 'bg-green-100 text-green-800' :
                          booking.status === 'departing' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'inhouse' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status || 'unknown'}
                        </span>
                        {booking.lateCheckIn && (
                          <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                            LATE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{booking.checkInDate || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{booking.checkOutDate || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {booking.adults || 0}A {booking.children ? `${booking.children}C` : ''}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                        {booking.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {gaps.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Availability Gaps Detected
                </h3>
              </div>
              <div className="p-6">
                <ul className="space-y-2">
                  {gaps.map((gap, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm">
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded font-medium">
                        {gap.nights} night{gap.nights > 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-700">
                        from <strong>{gap.date}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!saved && activeTenant && (
              <button
                onClick={handleSaveBookings}
                disabled={saving || bookings.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : `Save ${bookings.length} Booking(s) to Database`}
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              {saved ? 'Import Another CSV' : 'Upload Another CSV'}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">What Happens Next (Production)</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ Bookings would be saved as draft booking objects</li>
              <li>✅ Gaps would trigger availability alerts</li>
              <li>✅ Operator reviews and approves before syncing back to OTA</li>
              <li>⚠️ No automatic OTA writes without explicit approval gate</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
