'use client'

import Link from 'next/link'
import { ArrowLeft, Upload, Calendar, CheckCircle, AlertCircle, FileSpreadsheet, Save, Copy } from 'lucide-react'
import { useState } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { useTenant } from '@/components/TenantContext'
import * as XLSX from 'xlsx'

interface ParsedBooking {
  guestName: string
  guest2?: string
  suiteOrUnit: string
  status: string
  checkInDate: string
  checkOutDate: string
  lateCheckIn: boolean
  adults?: number
  children?: number
  notes?: string
  bookingId?: string
  guestPhone?: string
  guestEmail?: string
  guestPhone2?: string
  guestEmail2?: string
  nights?: number
}

interface Gap {
  date: string
  nights: number
}

export default function NightsbridgeImportPage() {
  const { selectedTenantId, tenants } = useTenant()
  const activeTenant = tenants.find(t => t.id === selectedTenantId)
  const [file, setFile] = useState<File | null>(null)
  const [targetDate, setTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [bookings, setBookings] = useState<ParsedBooking[]>([])
  const [gaps, setGaps] = useState<Gap[]>([])
  const [parsed, setParsed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [missingFields, setMissingFields] = useState<Array<{guest: string, field: string}>>([])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
      setParsed(false)
      setBookings([])
      setGaps([])
      setMissingFields([])
      setSaved(false)
    }
  }

  const handleParseFile = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setError('')
    setParsed(false)
    setBookings([])
    setGaps([])
    setMissingFields([])
    setSaved(false)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      if (jsonData.length < 2) {
        setError('File must have at least a header row and one data row')
        return
      }

      // Find header row (first non-empty row)
      let headerRowIndex = 0
      for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i] && jsonData[i].some(cell => cell !== null && cell !== undefined && cell !== '')) {
          headerRowIndex = i
          break
        }
      }

      const headers = jsonData[headerRowIndex].map((h: any) => 
        String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
      )

      const rows = jsonData.slice(headerRowIndex + 1).filter(row => 
        row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
      )

      const parsedBookings: ParsedBooking[] = []
      const missing: Array<{guest: string, field: string}> = []

      rows.forEach((row, rowIndex) => {
        const booking: any = {}

        headers.forEach((header, index) => {
          const value = row[index] ? String(row[index]).trim() : ''
          
          // Map Nightsbridge "Arrivals & Departures" report columns
          if (header.includes('room') || header.includes('roomname')) {
            booking.suiteOrUnit = value
          } else if (header.includes('guestname') || (header.includes('guest') && !header.includes('2') && !header.includes('number'))) {
            booking.guestName = value
          } else if (header.includes('guest2')) {
            booking.guest2 = value
          } else if (header.includes('numberofguests')) {
            const num = parseInt(value) || 0
            booking.adults = Math.max(1, num) // At least 1 adult
            booking.children = 0
          } else if (header.includes('bookingid') || header.includes('booking')) {
            booking.bookingId = value
          } else if (header.includes('note')) {
            booking.notes = value
          } else if (header.includes('night')) {
            booking.nights = parseInt(value) || 0
          } else if (header.includes('phonenumber') && !header.includes('2')) {
            booking.guestPhone = value
          } else if (header.includes('email') && !header.includes('2')) {
            booking.guestEmail = value
          } else if (header.includes('phonenumber2')) {
            booking.guestPhone2 = value
          } else if (header.includes('email2')) {
            booking.guestEmail2 = value
          } else if (header.includes('checkin') || header.includes('arrive') || header.includes('arrival')) {
            // Try to parse Excel date number or string
            if (typeof row[index] === 'number') {
              const date = XLSX.SSF.parse_date_code(row[index])
              booking.checkInDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
            } else {
              booking.checkInDate = value
            }
          } else if (header.includes('checkout') || header.includes('depart') || header.includes('departure')) {
            // Try to parse Excel date number or string
            if (typeof row[index] === 'number') {
              const date = XLSX.SSF.parse_date_code(row[index])
              booking.checkOutDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
            } else {
              booking.checkOutDate = value
            }
          }
        })

        // Track missing required fields
        if (!booking.guestName) {
          missing.push({ guest: 'Row ' + (rowIndex + headerRowIndex + 2), field: 'guestName' })
        }
        if (!booking.suiteOrUnit) {
          missing.push({ guest: booking.guestName || 'Row ' + (rowIndex + headerRowIndex + 2), field: 'suiteOrUnit (Room Name)' })
        }
        if (!booking.checkInDate) {
          missing.push({ guest: booking.guestName || 'Row ' + (rowIndex + headerRowIndex + 2), field: 'checkInDate' })
        }
        if (!booking.checkOutDate) {
          missing.push({ guest: booking.guestName || 'Row ' + (rowIndex + headerRowIndex + 2), field: 'checkOutDate' })
        }

        // Derive status from dates
        if (booking.checkInDate && booking.checkOutDate) {
          try {
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
          } catch {
            booking.status = ''
          }
        } else {
          booking.status = ''
        }

        // Detect late check-in from notes
        if (booking.notes && booking.notes.toLowerCase().includes('late')) {
          booking.lateCheckIn = true
        } else {
          booking.lateCheckIn = false
        }

        // Default adults if not set
        if (!booking.adults) {
          booking.adults = 2
        }
        if (!booking.children) {
          booking.children = 0
        }

        parsedBookings.push(booking as ParsedBooking)
      })

      setBookings(parsedBookings)
      setMissingFields(missing)
      
      const detectedGaps = findGaps(parsedBookings, targetDate)
      setGaps(detectedGaps)
      
      setParsed(true)
    } catch (err: any) {
      setError(`Parsing error: ${err.message}. Ensure file is a valid Excel (.xlsx) or CSV file.`)
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
          bookings: bookings.map(b => ({
            guest_name: b.guestName,
            suite_or_unit: b.suiteOrUnit,
            check_in: b.checkInDate,
            check_out: b.checkOutDate,
            adults: b.adults,
            children: b.children,
            notes: b.notes,
            late_check_in: b.lateCheckIn,
            guest_phone: b.guestPhone || b.guestPhone2 || '',
            status: b.status
          }))
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
    setFile(null)
    setBookings([])
    setGaps([])
    setParsed(false)
    setSaved(false)
    setError('')
    setSaveError('')
    setMissingFields([])
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/ops" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Ops Hub
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium mb-3">
          Nightsbridge Arrivals & Departures Import 🎯
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          NightsBridge Import (Property 24299)
        </h1>
        <p className="text-gray-600">
          Upload Nightsbridge "Arrivals & Departures" report (.xlsx) to import bookings
        </p>
      </div>

      {activeTenant && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="text-sm text-primary-900">
            <strong>Active Tenant:</strong> {activeTenant.name}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-blue-900 mb-2">📊 Nightsbridge Data Path</h3>
        <ol className="space-y-1 text-sm text-blue-800 list-decimal list-inside">
          <li>Open Nightsbridge → Calendar → Reports</li>
          <li>Report Type: <strong>Arrivals & Departures</strong></li>
          <li>Run Reports → Download <code className="bg-blue-100 px-1 rounded">arr_and_dep.xlsx</code></li>
          <li>Upload here → Parse → Upsert bookings to GuestFlow DB</li>
        </ol>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-amber-900 mb-2">⚠️ Draft Mode Only</h3>
        <ul className="space-y-1 text-sm text-amber-800">
          <li>✅ Parses .xlsx files (Room Name, Guest Name, Booking ID, Phone, Email, etc.)</li>
          <li>✅ Detects availability gaps between bookings</li>
          <li>✅ Saves bookings to GuestFlow for portal + packs</li>
          <li>⚠️ <strong>No OTA writes</strong> — bookings are imported locally only</li>
          <li>⚠️ Never invents guest names, dates, or contact details</li>
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
              Upload Nightsbridge File (.xlsx or .csv)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleParseFile}
                disabled={!file}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Parse File
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
            <h3 className="font-semibold text-gray-900 mb-2">Expected Columns (Case-Insensitive)</h3>
            <p className="text-sm text-gray-700 mb-3">
              From Nightsbridge "Arrivals & Departures" report:
            </p>
            <ul className="space-y-1 text-sm text-gray-700">
              <li><code className="px-2 py-1 bg-white rounded">Room Name</code> → Suite/Unit</li>
              <li><code className="px-2 py-1 bg-white rounded">Guest Name</code> → Primary guest</li>
              <li><code className="px-2 py-1 bg-white rounded">Guest 2</code> → Secondary guest (optional)</li>
              <li><code className="px-2 py-1 bg-white rounded">Number of Guests</code> → Total guests</li>
              <li><code className="px-2 py-1 bg-white rounded">Booking ID</code> → Reference number</li>
              <li><code className="px-2 py-1 bg-white rounded">Notes</code> → Special requests</li>
              <li><code className="px-2 py-1 bg-white rounded">Phone Number, Email</code> → Contact details</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              Check-in and check-out dates are typically in grouped date blocks in the export
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900">File Parsed Successfully</h4>
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
                  Bookings are now available for guest portal + packs. View in Ops Hub.
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
              <h3 className="font-semibold text-gray-900">Parsed Bookings ({bookings.length})</h3>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.slice(0, 20).map((booking, idx) => (
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
                      <td className="px-6 py-4 text-xs text-gray-500">{booking.bookingId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length > 20 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                  Showing first 20 of {bookings.length} bookings
                </div>
              )}
            </div>
          </div>

          {gaps.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Availability Gaps Detected ({gaps.length})
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
              {saved ? 'Import Another File' : 'Upload Another File'}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">What Happens Next</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ Bookings saved to GuestFlow local database</li>
              <li>✅ Available for guest portal access (via /guest/[bookingId])</li>
              <li>✅ Can be used in welcome packs, daily brief, CT pack</li>
              <li>⚠️ No automatic sync back to Nightsbridge — import is one-way</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
