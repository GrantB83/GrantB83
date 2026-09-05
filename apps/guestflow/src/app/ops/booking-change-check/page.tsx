'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, Download, Upload, AlertTriangle, CheckCircle, MinusCircle, RefreshCw } from 'lucide-react'
import { useTenant } from '@/components/TenantContext'

interface Booking {
  id: number | string
  guest_name: string
  suite_or_unit: string | null
  check_in: string
  check_out: string
  adults: number
  children: number
  notes: string | null
  late_check_in: boolean
  status?: string
}

interface ChangeReport {
  additions: Booking[]
  removals: Booking[]
  updates: Array<{
    id: number | string
    field: string
    before: any
    after: any
    booking: Booking
  }>
}

export default function BookingChangeCheckPage() {
  const { selectedTenantId, tenants } = useTenant()
  const activeTenant = tenants.find(t => t.id === selectedTenantId)
  
  const [beforeSnapshot, setBeforeSnapshot] = useState<Booking[]>([])
  const [afterSnapshot, setAfterSnapshot] = useState<Booking[]>([])
  const [report, setReport] = useState<ChangeReport | null>(null)
  const [beforeInput, setBeforeInput] = useState('')
  const [afterInput, setAfterInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [useFixtures, setUseFixtures] = useState(true)

  useEffect(() => {
    if (useFixtures) {
      loadFixtures()
    }
  }, [useFixtures])

  const loadFixtures = () => {
    // Before snapshot - baseline bookings
    const before: Booking[] = [
      {
        id: 1,
        guest_name: 'Sarah Johnson',
        suite_or_unit: 'Riverside Suite',
        check_in: '2026-12-15',
        check_out: '2026-12-18',
        adults: 2,
        children: 0,
        notes: 'Prefers ground floor',
        late_check_in: false,
        status: 'confirmed'
      },
      {
        id: 2,
        guest_name: 'Mike & Emma Chen',
        suite_or_unit: 'Mountain View Cottage',
        check_in: '2026-12-16',
        check_out: '2026-12-19',
        adults: 2,
        children: 1,
        notes: 'Toddler needs cot',
        late_check_in: false,
        status: 'confirmed'
      },
      {
        id: 3,
        guest_name: 'David Smith',
        suite_or_unit: 'Lakeside Lodge',
        check_in: '2026-12-17',
        check_out: '2026-12-20',
        adults: 1,
        children: 0,
        notes: null,
        late_check_in: false,
        status: 'confirmed'
      }
    ]

    // After snapshot - with changes
    const after: Booking[] = [
      {
        id: 1,
        guest_name: 'Sarah Johnson',
        suite_or_unit: 'Garden Suite', // CHANGED suite
        check_in: '2026-12-15',
        check_out: '2026-12-18',
        adults: 2,
        children: 0,
        notes: 'Prefers ground floor. Requested early check-in', // CHANGED notes
        late_check_in: false,
        status: 'confirmed'
      },
      {
        id: 2,
        guest_name: 'Mike & Emma Chen',
        suite_or_unit: 'Mountain View Cottage',
        check_in: '2026-12-16',
        check_out: '2026-12-20', // CHANGED checkout (extended stay)
        adults: 2,
        children: 1,
        notes: 'Toddler needs cot',
        late_check_in: false,
        status: 'confirmed'
      },
      // id 3 REMOVED
      {
        id: 4,
        guest_name: 'Lisa Anderson',
        suite_or_unit: 'Sunset Villa',
        check_in: '2026-12-18',
        check_out: '2026-12-21',
        adults: 2,
        children: 2,
        notes: 'Anniversary celebration',
        late_check_in: true,
        status: 'confirmed'
      } // NEW booking
    ]

    setBeforeSnapshot(before)
    setAfterSnapshot(after)
    setBeforeInput(JSON.stringify(before, null, 2))
    setAfterInput(JSON.stringify(after, null, 2))
  }

  const parseInput = (input: string): Booking[] | null => {
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) {
        return parsed
      }
      return null
    } catch {
      return null
    }
  }

  const compareSnapshots = () => {
    const before = useFixtures ? beforeSnapshot : (parseInput(beforeInput) || [])
    const after = useFixtures ? afterSnapshot : (parseInput(afterInput) || [])

    if (!before.length && !after.length) {
      alert('Both snapshots are empty')
      return
    }

    const beforeMap = new Map(before.map(b => [String(b.id), b]))
    const afterMap = new Map(after.map(b => [String(b.id), b]))

    const additions: Booking[] = []
    const removals: Booking[] = []
    const updates: ChangeReport['updates'] = []

    // Find additions
    for (const [id, booking] of afterMap) {
      if (!beforeMap.has(id)) {
        additions.push(booking)
      }
    }

    // Find removals
    for (const [id, booking] of beforeMap) {
      if (!afterMap.has(id)) {
        removals.push(booking)
      }
    }

    // Find updates
    for (const [id, afterBooking] of afterMap) {
      const beforeBooking = beforeMap.get(id)
      if (beforeBooking) {
        const fields: Array<keyof Booking> = [
          'guest_name', 'suite_or_unit', 'check_in', 'check_out',
          'adults', 'children', 'notes', 'late_check_in', 'status'
        ]
        
        for (const field of fields) {
          if (JSON.stringify(beforeBooking[field]) !== JSON.stringify(afterBooking[field])) {
            updates.push({
              id,
              field,
              before: beforeBooking[field],
              after: afterBooking[field],
              booking: afterBooking
            })
          }
        }
      }
    }

    setReport({ additions, removals, updates })
  }

  const generateMarkdown = (): string => {
    if (!report) return ''

    const lines: string[] = []
    lines.push('# Booking Change Check Report')
    lines.push('')
    lines.push(`**Tenant:** ${activeTenant?.name || 'Demo Tenant'}`)
    lines.push(`**Generated:** ${new Date().toISOString()}`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // Summary
    lines.push('## Summary')
    lines.push('')
    lines.push(`- **Additions:** ${report.additions.length}`)
    lines.push(`- **Removals:** ${report.removals.length}`)
    lines.push(`- **Updates:** ${report.updates.length}`)
    lines.push('')

    // Additions
    if (report.additions.length > 0) {
      lines.push('## New Bookings')
      lines.push('')
      report.additions.forEach(b => {
        lines.push(`### ➕ ${b.guest_name || '[NO NAME]'} (ID: ${b.id})`)
        lines.push(`- **Suite:** ${b.suite_or_unit || '[NOT ASSIGNED]'}`)
        lines.push(`- **Dates:** ${b.check_in} → ${b.check_out}`)
        lines.push(`- **Guests:** ${b.adults} adult(s), ${b.children} child(ren)`)
        if (b.late_check_in) lines.push(`- **⚠️ LATE CHECK-IN**`)
        if (b.notes) lines.push(`- **Notes:** ${b.notes}`)
        lines.push('')
      })
    }

    // Removals
    if (report.removals.length > 0) {
      lines.push('## Cancelled/Removed Bookings')
      lines.push('')
      report.removals.forEach(b => {
        lines.push(`### ➖ ${b.guest_name || '[NO NAME]'} (ID: ${b.id})`)
        lines.push(`- **Suite:** ${b.suite_or_unit || '[NOT ASSIGNED]'}`)
        lines.push(`- **Dates:** ${b.check_in} → ${b.check_out}`)
        lines.push('')
      })
    }

    // Updates
    if (report.updates.length > 0) {
      lines.push('## Modified Bookings')
      lines.push('')
      
      // Group updates by booking
      const updatesByBooking = new Map<string, typeof report.updates>()
      report.updates.forEach(u => {
        const key = String(u.id)
        if (!updatesByBooking.has(key)) {
          updatesByBooking.set(key, [])
        }
        updatesByBooking.get(key)!.push(u)
      })

      for (const [id, updates] of updatesByBooking) {
        const booking = updates[0].booking
        lines.push(`### 🔄 ${booking.guest_name || '[NO NAME]'} (ID: ${id})`)
        updates.forEach(u => {
          const fieldLabel = u.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          const beforeVal = u.before === null ? '[EMPTY]' : String(u.before)
          const afterVal = u.after === null ? '[EMPTY]' : String(u.after)
          lines.push(`- **${fieldLabel}:** ${beforeVal} → ${afterVal}`)
        })
        lines.push('')
      }
    }

    lines.push('---')
    lines.push('')
    lines.push('*Generated by GuestFlow Phase 21 - Booking Change Check (DRAFT/Fixtures Only)*')
    lines.push('*Never invents data - reports only actual differences between snapshots*')

    return lines.join('\n')
  }

  const handleDownloadMarkdown = () => {
    const markdown = generateMarkdown()
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `booking-changes-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo Hub
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium mb-3">
          Phase 21 🎯 BOOKING CHANGE CHECK (DRAFT/FIXTURES ONLY)
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Last-Minute Booking Change Check
        </h1>
        <p className="text-gray-600">
          Compare two booking snapshots to detect additions, removals, and field updates before sending communications (mirrors tools/browns-booking-change-check)
        </p>
      </div>

      {activeTenant && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="text-sm text-primary-900">
            <strong>Active Tenant:</strong> {activeTenant.name}
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={useFixtures}
              onChange={() => setUseFixtures(true)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Use Demo Fixtures</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!useFixtures}
              onChange={() => setUseFixtures(false)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Paste/Upload JSON</span>
          </label>
        </div>
      </div>

      {/* Input Section */}
      {!useFixtures && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Before Snapshot
            </h3>
            <textarea
              value={beforeInput}
              onChange={(e) => setBeforeInput(e.target.value)}
              placeholder='[{"id": 1, "guest_name": "...", ...}]'
              className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              After Snapshot
            </h3>
            <textarea
              value={afterInput}
              onChange={(e) => setAfterInput(e.target.value)}
              placeholder='[{"id": 1, "guest_name": "...", ...}]'
              className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex gap-4 justify-center mb-8">
        <button
          onClick={compareSnapshots}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          <RefreshCw className="w-5 h-5" />
          Compare Snapshots
        </button>

        {report && (
          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
          >
            <Download className="w-5 h-5" />
            Export as Markdown
          </button>
        )}
      </div>

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white border-2 border-gray-300 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Change Summary</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">New Bookings</span>
                </div>
                <div className="text-3xl font-bold text-green-600">{report.additions.length}</div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MinusCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-900">Cancelled</span>
                </div>
                <div className="text-3xl font-bold text-red-600">{report.removals.length}</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-900">Modified</span>
                </div>
                <div className="text-3xl font-bold text-amber-600">{report.updates.length}</div>
              </div>
            </div>
          </div>

          {/* Additions */}
          {report.additions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                New Bookings ({report.additions.length})
              </h2>
              <div className="space-y-4">
                {report.additions.map(b => (
                  <div key={b.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{b.guest_name || '[NO NAME]'}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-600">Suite:</span> <span className="font-medium">{b.suite_or_unit || '[NOT ASSIGNED]'}</span></div>
                      <div><span className="text-gray-600">Dates:</span> <span className="font-medium">{b.check_in} → {b.check_out}</span></div>
                      <div><span className="text-gray-600">Guests:</span> <span className="font-medium">{b.adults} adults, {b.children} children</span></div>
                      {b.late_check_in && (
                        <div className="col-span-2 text-amber-700 font-semibold">⚠️ LATE CHECK-IN</div>
                      )}
                      {b.notes && (
                        <div className="col-span-2"><span className="text-gray-600">Notes:</span> <span className="italic">{b.notes}</span></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removals */}
          {report.removals.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MinusCircle className="w-6 h-6 text-red-600" />
                Cancelled/Removed Bookings ({report.removals.length})
              </h2>
              <div className="space-y-4">
                {report.removals.map(b => (
                  <div key={b.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{b.guest_name || '[NO NAME]'}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-600">Suite:</span> <span className="font-medium">{b.suite_or_unit || '[NOT ASSIGNED]'}</span></div>
                      <div><span className="text-gray-600">Dates:</span> <span className="font-medium">{b.check_in} → {b.check_out}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Updates */}
          {report.updates.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-amber-600" />
                Modified Bookings ({report.updates.length} changes)
              </h2>
              <div className="space-y-4">
                {(() => {
                  const grouped = new Map<string, typeof report.updates>()
                  report.updates.forEach(u => {
                    const key = String(u.id)
                    if (!grouped.has(key)) grouped.set(key, [])
                    grouped.get(key)!.push(u)
                  })
                  
                  return Array.from(grouped.entries()).map(([id, updates]) => {
                    const booking = updates[0].booking
                    return (
                      <div key={id} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">{booking.guest_name || '[NO NAME]'} (ID: {id})</h4>
                        <div className="space-y-2">
                          {updates.map((u, idx) => (
                            <div key={idx} className="text-sm bg-white rounded p-2 border border-amber-200">
                              <span className="font-medium text-gray-700">{u.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-red-600 line-through">{u.before === null ? '[EMPTY]' : String(u.before)}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600 font-medium">{u.after === null ? '[EMPTY]' : String(u.after)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {report.additions.length === 0 && report.removals.length === 0 && report.updates.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="text-blue-900 font-semibold">No Changes Detected</p>
              <p className="text-blue-700 text-sm mt-1">Both snapshots are identical</p>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-600" />
          About This Demo Tool
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Mirrors tools/browns-booking-change-check semantics</li>
          <li>✅ Compares two booking snapshots (before vs after)</li>
          <li>✅ Reports additions, removals, and field-level updates</li>
          <li>✅ Never invents missing fields - shows [EMPTY] or [NOT ASSIGNED]</li>
          <li>✅ Optional markdown export for leave-behind/verification</li>
          <li>🔒 DRAFT/fixtures only - no live WhatsApp/email sends</li>
          <li>🎯 Use before CT-pack style communications to catch last-minute changes</li>
        </ul>
      </div>
    </div>
  )
}
