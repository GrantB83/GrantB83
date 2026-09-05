'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, Download, Printer, FileText, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTenant } from '@/components/TenantContext'
import { format } from 'date-fns'
import { PackGenerator } from '@/components/PackGenerator'

interface PackData {
  dailyBrief: any | null
  welcomeDrafts: any[]
  lateCheckinQueue: any[]
}

export default function CTPackPage() {
  const { selectedTenantId, tenants } = useTenant()
  const [targetDate, setTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [packData, setPackData] = useState<PackData>({
    dailyBrief: null,
    welcomeDrafts: [],
    lateCheckinQueue: []
  })
  const [exporting, setExporting] = useState(false)

  const activeTenant = tenants.find(t => t.id === selectedTenantId)

  useEffect(() => {
    if (selectedTenantId) {
      fetchPackData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, targetDate])

  const fetchPackData = async () => {
    if (!selectedTenantId) return

    setLoading(true)
    try {
      // Fetch daily brief data
      const briefResponse = await fetch(
        `/api/bookings?tenant_id=${selectedTenantId}&date=${targetDate}`
      )
      const briefData = await briefResponse.json()

      // Fetch welcome drafts
      const welcomeResponse = await fetch(
        `/api/welcome-drafts?tenant_id=${selectedTenantId}&as_of=${targetDate}&window_days=1`
      )
      const welcomeData = await welcomeResponse.json()

      // Late check-in queue (we'll derive from bookings with late check-in flag)
      const lateCheckins = briefData.success
        ? briefData.bookings.filter((b: any) => b.lateCheckIn && b.derivedStatus === 'arriving')
        : []

      setPackData({
        dailyBrief: briefData.success
          ? {
              arrivals: briefData.bookings.filter((b: any) => b.derivedStatus === 'arriving'),
              departures: briefData.bookings.filter((b: any) => b.derivedStatus === 'departing'),
              inHouse: briefData.bookings.filter((b: any) => b.derivedStatus === 'inhouse'),
              redAlerts: briefData.bookings
                .filter((b: any) => b.lateCheckIn && b.derivedStatus === 'arriving')
                .map((b: any) => `${b.guest_name} - Late check-in expected`)
            }
          : null,
        welcomeDrafts: welcomeData.success ? welcomeData.drafts : [],
        lateCheckinQueue: lateCheckins.map((b: any) => ({
          guestName: b.guest_name,
          property: b.property_name,
          roomNumber: b.room_number,
          expectedArrival: '[UNKNOWN TIME]'
        }))
      })
    } catch (error) {
      console.error('Error fetching pack data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (exportFormat: 'markdown' | 'html') => {
    if (!activeTenant) return

    setExporting(true)
    try {
      const response = await fetch('/api/ct-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantName: activeTenant.name,
          targetDate,
          dailyBrief: packData.dailyBrief,
          welcomeDrafts: packData.welcomeDrafts,
          lateCheckinQueue: packData.lateCheckinQueue,
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
        a.download = `guestflow-ct-pack-${targetDate}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting CT pack:', error)
    } finally {
      setExporting(false)
    }
  }

  const totalSections = [
    packData.dailyBrief,
    packData.welcomeDrafts.length > 0,
    packData.lateCheckinQueue.length > 0
  ].filter(Boolean).length

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
              <h1 className="text-3xl font-bold text-gray-900">
                Demo CT-Pack Assembly
              </h1>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                Phase 20
              </span>
            </div>
            <p className="text-gray-600">
              Assemble dated pack for active demo tenant (DRAFT/fixtures only)
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

      {/* Date Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pack Date</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchPackData}
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Pack Data'}
          </button>
        </div>
      </div>

      {/* Pack Summary */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className={`${packData.dailyBrief ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} border-2 p-6 rounded-xl`}>
          <div className="flex items-center gap-3 mb-2">
            {packData.dailyBrief ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">Daily Brief</h3>
          </div>
          <p className="text-sm text-gray-700">
            {packData.dailyBrief
              ? `${packData.dailyBrief.arrivals.length} arrivals, ${packData.dailyBrief.departures.length} departures`
              : 'No bookings for this date'}
          </p>
        </div>

        <div className={`${packData.welcomeDrafts.length > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} border-2 p-6 rounded-xl`}>
          <div className="flex items-center gap-3 mb-2">
            {packData.welcomeDrafts.length > 0 ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">Welcome Drafts</h3>
          </div>
          <p className="text-sm text-gray-700">
            {packData.welcomeDrafts.length > 0
              ? `${packData.welcomeDrafts.length} draft(s) ready`
              : 'No welcome drafts for this window'}
          </p>
        </div>

        <div className={`${packData.lateCheckinQueue.length > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border-2 p-6 rounded-xl`}>
          <div className="flex items-center gap-3 mb-2">
            {packData.lateCheckinQueue.length > 0 ? (
              <AlertCircle className="w-6 h-6 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-gray-400" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">Late Check-Ins</h3>
          </div>
          <p className="text-sm text-gray-700">
            {packData.lateCheckinQueue.length > 0
              ? `${packData.lateCheckinQueue.length} late arrival(s)`
              : 'No late check-ins'}
          </p>
        </div>
      </div>

      {/* Export Options */}
      {totalSections > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Export CT Pack</h2>
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
            Export includes PACK.md (index with timed checklist) and APPROVAL.md (hard gates). Local demo only—no external storage.
          </p>
        </div>
      )}

      {/* Timed Checklist Preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Timed Checklist (Demo Copy Only)</h2>
        
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-1">20:00 CT - Same-Day Morning Guest Drafts</h3>
            <p className="text-sm text-gray-600 mb-2">Review and send welcome messages for today's arrivals</p>
            <p className="text-xs text-gray-500">Files: {packData.welcomeDrafts.length} welcome draft(s)</p>
            <p className="text-xs text-blue-700 font-medium">Action: Liana vet / Grant approve before send</p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-1">09:00 CT (Next Morning) - After-Hours Check-Ins</h3>
            <p className="text-sm text-gray-600 mb-2">Review late check-ins and booking changes from overnight</p>
            <p className="text-xs text-gray-500">Files: {packData.lateCheckinQueue.length} late check-in(s)</p>
            <p className="text-xs text-amber-700 font-medium">Action: Confirm arrival time and after-hours access</p>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold text-gray-900 mb-1">21:00 CT - Staff Ops Brief</h3>
            <p className="text-sm text-gray-600 mb-2">Send daily operations brief to team WhatsApp</p>
            <p className="text-xs text-gray-500">Files: {packData.dailyBrief ? 'Daily brief included' : 'No daily brief'}</p>
            <p className="text-xs text-green-700 font-medium">Action: WhatsApp Admin posts (H11 approval required)</p>
          </div>
        </div>
      </div>

      {/* Hard Gates Warning */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-red-900 mb-3">⚠️ Hard Gates (Phase 20)</h3>
        <ul className="space-y-2 text-sm text-red-800">
          <li>✅ <strong>DRAFT ONLY</strong> — Never sends WhatsApp or email automatically</li>
          <li>✅ <strong>CoS owns WhatsApp</strong> — This mirrors tools/browns-ct-pack-assemble for sales demo only</li>
          <li>✅ <strong>Never auto-send</strong> — All outputs require human approval</li>
          <li>✅ <strong>Never invents data</strong> — Placeholders stay flagged ([GUEST_PHONE], [RATE CARD REQUIRED])</li>
          <li>✅ <strong>Demo tenant scoped</strong> — Active demo tenant fixtures only, no production data</li>
          <li>✅ <strong>Local demo only</strong> — Export operations are local-only with no external storage</li>
        </ul>
      </div>

      {/* Links to Source Pages */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Source Pages & Verification Tools</h3>
        <p className="text-sm text-blue-800 mb-4">
          This CT-pack assembles outputs from the following existing demo pages:
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          <Link
            href={`/demo/daily-brief?date=${targetDate}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition"
          >
            <FileText className="w-4 h-4" />
            Daily Ops Brief
          </Link>
          <Link
            href="/demo/welcome-drafts"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition"
          >
            <FileText className="w-4 h-4" />
            Welcome Drafts
          </Link>
          <Link
            href={`/demo/daily-brief?date=${targetDate}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition"
          >
            <FileText className="w-4 h-4" />
            Late Check-In Queue
          </Link>
        </div>
        <div className="border-t border-blue-300 pt-4">
          <p className="text-sm text-blue-800 mb-3 font-semibold">Before sending CT-pack communications:</p>
          <Link
            href="/demo/booking-change-check"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 border-2 border-amber-400 text-amber-900 rounded-lg font-semibold hover:bg-amber-200 transition"
          >
            <AlertCircle className="w-4 h-4" />
            Last-Minute Change Check (Phase 21)
          </Link>
          <p className="text-xs text-blue-700 mt-2">
            Compare booking snapshots to catch last-minute changes before sending communications
          </p>
        </div>
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
