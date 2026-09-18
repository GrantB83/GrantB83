'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  Download,
  FileText,
  Copy,
  AlertTriangle,
  Home,
  Info,
  ListPlus,
} from 'lucide-react'
import { useState, useEffect, Suspense, useCallback } from 'react'
import { useTenant } from '@/components/TenantContext'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import type { DailyBriefBooking, DailyBriefSnapshot } from '@/lib/daily-brief'

export const dynamic = 'force-dynamic'

function DailyBriefContent() {
  const searchParams = useSearchParams()
  const { selectedTenantId, tenants } = useTenant()
  const [snapshot, setSnapshot] = useState<DailyBriefSnapshot | null>(null)
  const [briefText, setBriefText] = useState('')
  const [targetDate, setTargetDate] = useState(
    searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [enqueueSupported, setEnqueueSupported] = useState(false)
  const [enqueueBlocker, setEnqueueBlocker] = useState<string | null>(null)
  const [approvalQueuePath, setApprovalQueuePath] = useState('/needs-approval')
  const [enqueuing, setEnqueuing] = useState(false)
  const [enqueueMessage, setEnqueueMessage] = useState<string | null>(null)

  const activeTenant = tenants.find((t) => t.id === selectedTenantId)

  useEffect(() => {
    const urlDate = searchParams.get('date')
    if (urlDate) setTargetDate(urlDate)
  }, [searchParams])

  const fetchBrief = useCallback(async () => {
    if (!selectedTenantId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/daily-brief?tenant_id=${selectedTenantId}&date=${targetDate}`
      )
      const data = await response.json()

      if (data.success) {
        setSnapshot({
          tenantId: data.tenantId,
          tenantName: data.tenantName,
          targetDate: data.targetDate,
          tomorrowDate: data.tomorrowDate,
          today: data.today,
          tomorrow: data.tomorrow,
          exceptions: data.exceptions,
          generatedAt: data.generatedAt,
        })
        setBriefText(data.briefText || '')
        setEnqueueSupported(Boolean(data.enqueueSupported))
        setEnqueueBlocker(data.enqueueBlocker ?? null)
        setApprovalQueuePath(data.approvalQueuePath || '/needs-approval')
      } else {
        setSnapshot(null)
        setBriefText('')
        setEnqueueSupported(false)
        setEnqueueBlocker(null)
        setError(data.error || 'Failed to load daily brief')
      }
    } catch (err) {
      console.error('Error fetching daily brief:', err)
      setError('Failed to load daily brief')
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }, [selectedTenantId, targetDate])

  useEffect(() => {
    fetchBrief()
  }, [fetchBrief])

  const hasOperations =
    snapshot &&
    (snapshot.today.arrivals.length > 0 ||
      snapshot.today.departures.length > 0 ||
      snapshot.today.inHouse.length > 0 ||
      snapshot.tomorrow.arrivals.length > 0)

  const handleCopy = async () => {
    if (!briefText) return
    try {
      await navigator.clipboard.writeText(briefText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleEnqueue = async () => {
    if (!selectedTenantId || !briefText || !enqueueSupported) return
    setEnqueuing(true)
    setEnqueueMessage(null)
    try {
      const response = await fetch('/api/daily-brief/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          target_date: targetDate,
          actor: 'Staff',
        }),
      })
      const data = await response.json()
      if (data.success) {
        setEnqueueMessage(
          data.existing
            ? `Draft already pending (id ${data.draftId}). Review at ${approvalQueuePath}.`
            : `Draft enqueued (id ${data.draftId}). Review at ${approvalQueuePath}.`
        )
      } else {
        setEnqueueMessage(data.error || 'Failed to enqueue draft')
      }
    } catch (err) {
      console.error('Enqueue failed:', err)
      setEnqueueMessage('Failed to enqueue draft')
    } finally {
      setEnqueuing(false)
    }
  }

  const handleExport = async (exportFormat: 'markdown' | 'text') => {
    if (!snapshot || !activeTenant) return
    setExporting(true)
    try {
      const response = await fetch('/api/daily-brief/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: activeTenant.name,
          targetDate,
          snapshot,
          format: exportFormat,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `daily-brief-${targetDate}.${exportFormat === 'markdown' ? 'md' : 'txt'}`
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

  const today = snapshot?.today
  const tomorrow = snapshot?.tomorrow
  const exceptions = snapshot?.exceptions

  const redAlerts = exceptions?.lateCheckIns ?? []
  const amberWarnings = exceptions?.missingData ?? []
  const emptySuites = exceptions?.emptySuites ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/ops"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Ops Hub
      </Link>

      <div className="mb-6 bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">Draft only — no auto-send</h3>
            <p className="text-sm text-gray-700 mt-1">
              Copy or export this brief for the internal staff WhatsApp group. A human must
              approve before any post (H11). Never includes invented rates or payment amounts.
            </p>
          </div>
        </div>
      </div>

      {enqueueSupported ? (
        <div className="mb-6 bg-teal-50 border-2 border-teal-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ListPlus className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-gray-900">Enqueue to approval queue — available</h3>
              <p className="text-sm text-gray-700 mt-1">
                Enqueue saves this brief as a copy-only <strong>staff_ops</strong> draft at{' '}
                <Link href={approvalQueuePath} className="text-primary-600 hover:underline">
                  {approvalQueuePath}
                </Link>
                . Approve there, then copy for manual H11 post. Never auto-sent.
              </p>
              {enqueueMessage && (
                <p className="text-sm text-teal-800 mt-2 font-medium">{enqueueMessage}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        enqueueBlocker && (
          <div className="mb-6 bg-slate-50 border-2 border-slate-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-gray-900">Enqueue to approval queue — not available</h3>
                <p className="text-sm text-gray-700 mt-1">{enqueueBlocker}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Use <strong>Copy for WhatsApp</strong> below, then post manually after H11 approval.
                </p>
              </div>
            </div>
          </div>
        )
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily Operations Brief</h1>
            <p className="text-gray-600">
              {activeTenant?.name || 'Browns Dullstroom'} — from GuestFlow bookings
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          <p className="text-gray-600 mt-4">Loading brief...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-800 font-medium">{error}</p>
          <button
            onClick={fetchBrief}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {today && (
            <div className="grid lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={<Users className="w-6 h-6 text-blue-600" />} label="Arrivals Today" value={today.arrivals.length} color="blue" />
              <StatCard icon={<Home className="w-6 h-6 text-green-600" />} label="In-House" value={today.inHouse.length} color="green" />
              <StatCard icon={<Clock className="w-6 h-6 text-orange-600" />} label="Departures Today" value={today.departures.length} color="orange" />
              <StatCard icon={<Calendar className="w-6 h-6 text-purple-600" />} label="Arrivals Tomorrow" value={tomorrow?.arrivals.length ?? 0} color="purple" />
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-3">
            {enqueueSupported && (
              <button
                onClick={handleEnqueue}
                disabled={enqueuing || !briefText || !hasOperations}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition disabled:opacity-50"
              >
                <ListPlus className="w-4 h-4" />
                {enqueuing ? 'Enqueuing…' : 'Enqueue draft'}
              </button>
            )}
            <button
              onClick={handleCopy}
              disabled={!briefText}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy for WhatsApp'}
            </button>
            <button
              onClick={() => handleExport('text')}
              disabled={exporting || !hasOperations}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download Text
            </button>
            <button
              onClick={() => handleExport('markdown')}
              disabled={exporting || !hasOperations}
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Download Markdown
            </button>
          </div>

          <div className="space-y-6">
            {redAlerts.length > 0 && (
              <Section title="🔴 RED — Late Check-ins" color="red">
                {redAlerts.map((booking) => (
                  <AlertItem
                    key={booking.id}
                    title={`${booking.guestName} — ${booking.propertyName}`}
                    details={`Late check-in flagged. Suite: ${booking.suiteOrUnit}`}
                    action="Confirm arrival timing and after-hours access"
                  />
                ))}
              </Section>
            )}

            {(amberWarnings.length > 0 || emptySuites.length > 0) && (
              <Section title="🟡 AMBER — Exceptions" color="amber">
                {amberWarnings.map((booking) => (
                  <BriefItem
                    key={`missing-${booking.id}`}
                    title={`${booking.guestName} — ${booking.propertyName}`}
                    details={`Missing: ${booking.missingFields.join(', ')}`}
                    time={booking.derivedStatus === 'arriving' ? 'Arriving' : 'In ops window'}
                  />
                ))}
                {emptySuites.map((flag, idx) => (
                  <BriefItem
                    key={`empty-${idx}`}
                    title={`${flag.propertyName} — ${flag.unit}`}
                    details={flag.reason}
                    time="Turnover / empty suite"
                  />
                ))}
              </Section>
            )}

            {today && today.arrivals.length > 0 && (
              <Section title={`Arrivals Today (${today.arrivals.length})`} color="blue">
                {today.arrivals.map((booking) => (
                  <GuestCard key={booking.id} booking={booking} />
                ))}
              </Section>
            )}

            {today && today.inHouse.length > 0 && (
              <Section title={`In-House (${today.inHouse.length})`} color="green">
                {today.inHouse.map((booking) => (
                  <GuestCard key={booking.id} booking={booking} />
                ))}
              </Section>
            )}

            {today && today.departures.length > 0 && (
              <Section title={`Departures Today (${today.departures.length})`} color="orange">
                {today.departures.map((booking) => (
                  <div key={booking.id} className="text-sm text-gray-600">
                    • {booking.guestName} — {booking.propertyName} (Suite {booking.suiteOrUnit}) — checkout {booking.checkOut}
                  </div>
                ))}
              </Section>
            )}

            {tomorrow && (tomorrow.arrivals.length > 0 || tomorrow.departures.length > 0) && (
              <Section title={`Tomorrow Preview (${snapshot?.tomorrowDate})`} color="purple">
                {tomorrow.arrivals.map((booking) => (
                  <div key={`tm-in-${booking.id}`} className="text-sm text-gray-700 mb-2">
                    <span className="font-medium text-purple-800">IN:</span> {booking.guestName} — {booking.suiteOrUnit}
                  </div>
                ))}
                {tomorrow.departures.map((booking) => (
                  <div key={`tm-out-${booking.id}`} className="text-sm text-gray-700 mb-2">
                    <span className="font-medium text-orange-800">OUT:</span> {booking.guestName} — {booking.suiteOrUnit}
                  </div>
                ))}
              </Section>
            )}

            {!hasOperations && (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No operations for {targetDate}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Import NightsBridge bookings or run demo seed — no guest data is invented.
                </p>
              </div>
            )}

            {today && (today.departures.length > 0 || today.arrivals.length > 0) && (
              <Section title="Housekeeping Schedule" color="gray">
                {today.departures.map((booking, idx) => (
                  <TaskItem
                    key={`depart-${idx}`}
                    task={`Morning: ${booking.propertyName} ${booking.suiteOrUnit} (departure)`}
                  />
                ))}
                {today.arrivals.map((booking, idx) => (
                  <TaskItem
                    key={`arrive-${idx}`}
                    task={`Afternoon: ${booking.propertyName} ${booking.suiteOrUnit} (arrival prep)`}
                  />
                ))}
              </Section>
            )}
          </div>

          {briefText && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">WhatsApp preview (draft)</h3>
              <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-64">
                {briefText}
              </pre>
            </div>
          )}
        </>
      )}

      <div className="mt-8 flex gap-4 justify-center">
        <Link
          href="/ops/bookings"
          className="inline-block px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
        >
          View Bookings
        </Link>
        <Link
          href="/ops/late-checkin-queue"
          className="inline-block px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
        >
          Late Check-in Queue
        </Link>
      </div>
    </div>
  )
}

export default function DailyBriefPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="text-gray-600 mt-4">Loading brief...</p>
          </div>
        </div>
      }
    >
      <DailyBriefContent />
    </Suspense>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  const bgColor =
    color === 'blue'
      ? 'bg-blue-50'
      : color === 'green'
        ? 'bg-green-50'
        : color === 'orange'
          ? 'bg-orange-50'
          : 'bg-purple-50'
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

function Section({
  title,
  color,
  children,
}: {
  title: string
  color: string
  children: React.ReactNode
}) {
  const borderColor =
    color === 'red'
      ? 'border-red-200'
      : color === 'amber'
        ? 'border-amber-200'
        : color === 'blue'
          ? 'border-blue-200'
          : color === 'green'
            ? 'border-green-200'
            : color === 'orange'
              ? 'border-orange-200'
              : color === 'purple'
                ? 'border-purple-200'
                : 'border-gray-200'

  return (
    <div className={`bg-white border-2 ${borderColor} rounded-xl p-6`}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function AlertItem({
  title,
  details,
  action,
}: {
  title: string
  details: string
  action: string
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="font-semibold text-red-900 mb-1">{title}</h3>
      <p className="text-sm text-red-800 mb-2">{details}</p>
      <p className="text-sm font-medium text-red-900">→ {action}</p>
    </div>
  )
}

function BriefItem({
  title,
  details,
  time,
}: {
  title: string
  details: string
  time: string
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h3 className="font-semibold text-amber-900 mb-1">{title}</h3>
      <p className="text-sm text-amber-800 mb-1">{details}</p>
      <p className="text-xs text-amber-700">{time}</p>
    </div>
  )
}

function GuestCard({ booking }: { booking: DailyBriefBooking }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{booking.guestName}</h3>
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
        {booking.propertyName} · Suite {booking.suiteOrUnit}
      </p>
      <p className="text-sm text-gray-600 mb-2">
        {booking.adults || 0} adult{(booking.adults || 0) !== 1 ? 's' : ''}
        {booking.children ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}
        {booking.pets && ' 🐾'}
      </p>
      {booking.specialRequests && (
        <p className="text-xs text-gray-500 italic">{booking.specialRequests}</p>
      )}
    </div>
  )
}

function TaskItem({ task }: { task: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="w-5 h-5 text-gray-300" />
      <span className="text-sm text-gray-700">{task}</span>
    </div>
  )
}
