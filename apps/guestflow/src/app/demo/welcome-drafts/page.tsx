'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Mail, Download, Printer, Calendar, AlertCircle, Package } from 'lucide-react'
import { useTenant } from '@/components/TenantContext'
import { format, parseISO } from 'date-fns'

interface WelcomeDraft {
  id: number
  guestName: string
  checkIn: string
  checkOut: string
  property: string
  roomNumber: string | null
  message: string
  missingFields: string[]
}

interface Stats {
  totalBookings: number
  draftCount: number
  skippedNoName: number
}

export default function WelcomeDraftsPage() {
  const { selectedTenantId, tenants } = useTenant()
  const [drafts, setDrafts] = useState<WelcomeDraft[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [skippedNoName, setSkippedNoName] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [windowDays, setWindowDays] = useState(1)
  const [exporting, setExporting] = useState(false)

  const activeTenant = tenants.find(t => t.id === selectedTenantId)

  const fetchDrafts = async () => {
    if (!selectedTenantId) return
    
    setLoading(true)
    try {
      const response = await fetch(
        `/api/welcome-drafts?tenant_id=${selectedTenantId}&as_of=${asOfDate}&window_days=${windowDays}`
      )
      const data = await response.json()
      
      if (data.success) {
        setDrafts(data.drafts)
        setStats(data.stats)
        setSkippedNoName(data.skippedNoName)
      }
    } catch (error) {
      console.error('Error fetching welcome drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrafts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, asOfDate, windowDays])

  const handleExport = async (exportFormat: 'markdown' | 'html') => {
    setExporting(true)
    try {
      const response = await fetch('/api/welcome-drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drafts,
          format: exportFormat
        })
      })

      if (exportFormat === 'html') {
        // Open in new window for print
        const html = await response.text()
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(html)
          newWindow.document.close()
        }
      } else {
        // Download markdown
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `guestflow-welcome-drafts-${asOfDate}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting drafts:', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome Message Drafts
              </h1>
              <span className="px-3 py-1 bg-rose-100 text-rose-700 text-sm font-medium rounded-full">
                Phase 18
              </span>
            </div>
            <p className="text-gray-600">
              Generate same-day/upcoming welcome stubs from tenant bookings (DRAFT/fixtures only)
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Options</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              As of Date
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Window Days
            </label>
            <input
              type="number"
              min="1"
              max="7"
              value={windowDays}
              onChange={(e) => setWindowDays(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Check-ins within N days of as-of date</p>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchDrafts}
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Drafts'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <div className="text-3xl font-bold text-blue-900">{stats.draftCount}</div>
            <div className="text-sm text-blue-700">Welcome Drafts Generated</div>
          </div>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="text-3xl font-bold text-gray-900">{stats.totalBookings}</div>
            <div className="text-sm text-gray-700">Total Bookings in Window</div>
          </div>
          <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
            <div className="text-3xl font-bold text-amber-900">{stats.skippedNoName}</div>
            <div className="text-sm text-amber-700">Skipped (No Guest Name)</div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      {drafts.length > 0 && (
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
              onClick={() => handleExport('html')}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download HTML
            </button>
            <button
              onClick={() => handleExport('html')}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print to PDF
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Export formats mirror Phase 8 quote export UX—local demo only, no external storage
          </p>
        </div>
      )}

      {/* Skipped Bookings Warning */}
      {skippedNoName.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">
                Missing Guest Names ({skippedNoName.length})
              </h3>
              <p className="text-sm text-amber-800 mb-3">
                The following bookings were skipped because they don't have a guest name:
              </p>
              <ul className="text-sm text-amber-700 space-y-1">
                {skippedNoName.map((booking) => (
                  <li key={booking.id}>
                    Booking #{booking.id} — Check-in: {booking.checkIn}
                    {booking.roomNumber && ` — Room: ${booking.roomNumber}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Drafts List */}
      {drafts.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Generated Welcome Stubs</h2>
          
          {drafts.map((draft, index) => (
            <div key={draft.id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="w-5 h-5 text-primary-600" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      {index + 1}. {draft.guestName}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>Check-in: {format(parseISO(draft.checkIn), 'EEE, d MMM yyyy')}</span>
                    <span>•</span>
                    <span>Property: {draft.property}</span>
                    {draft.roomNumber && (
                      <>
                        <span>•</span>
                        <span>Room: {draft.roomNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {draft.missingFields.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-amber-800 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Missing:</span>
                    <span>{draft.missingFields.map(f => `[${f.toUpperCase()}]`).join(', ')}</span>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {draft.message}
                </pre>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Bookings Found
            </h3>
            <p className="text-gray-600 mb-4">
              No bookings with check-ins in the selected date window for this tenant.
            </p>
            <p className="text-sm text-gray-500">
              Try adjusting the as-of date or window days, or run the demo seed to populate sample bookings.
            </p>
          </div>
        )
      )}

      {/* Hard Gates Warning */}
      <div className="mt-12 bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-indigo-900 mb-3">📦 Phase 20: Demo CT-Pack Assembly</h3>
        <p className="text-sm text-indigo-800 mb-4">
          Assemble these welcome drafts + daily ops brief + late-checkin queue into one dated CT pack (timed checklist flavor with 20:00 / 09:00 / 21:00 CT demo copy).
        </p>
        <Link
          href="/demo/ct-pack"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          <Package className="w-4 h-4" />
          Assemble CT Pack
        </Link>
      </div>

      <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="font-semibold text-red-900 mb-3">⚠️ Hard Gates (Phase 18)</h3>
        <ul className="space-y-2 text-sm text-red-800">
          <li>✅ <strong>DRAFT ONLY</strong> — Never sends WhatsApp or email automatically</li>
          <li>✅ <strong>Never invents guest phone</strong> — Uses <code>[GUEST_PHONE]</code> placeholder when missing</li>
          <li>✅ <strong>Never invents rates</strong> — Uses <code>[RATE CARD REQUIRED]</code> placeholder when missing</li>
          <li>✅ <strong>Skips missing names</strong> — Bookings without guest_name are filtered out and listed separately</li>
          <li>✅ <strong>Local demo only</strong> — Export operations are local-only with no external storage</li>
          <li>✅ <strong>Mirrors tools/browns-welcome-draft-pack semantics</strong> — Same filtering logic and tone</li>
        </ul>
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
