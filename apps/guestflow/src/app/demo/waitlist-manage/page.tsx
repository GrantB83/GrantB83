'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { DemoAuthGuard } from '@/components/DemoAuthGuard'
import { useTenant } from '@/components/TenantContext'

type WaitlistEntry = {
  id: number
  name: string
  email: string
  property_name: string
  room_count: string
  current_system: string | null
  phone: string | null
  notes: string | null
  status: string | null
  created_at: string
  tenant_name: string | null
}

export default function WaitlistManagePage() {
  const { selectedTenantId, tenants } = useTenant()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState<number | null>(null)

  const selectedTenant = tenants.find(t => t.id === selectedTenantId)

  useEffect(() => {
    if (selectedTenantId === null) return

    const fetchEntries = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/leads?tenant_id=${selectedTenantId}`)
        if (response.ok) {
          const data = await response.json()
          // Filter to show only new/unconverted entries
          const unconverted = (data.leads || []).filter(
            (entry: WaitlistEntry) => !entry.status || entry.status === 'new'
          )
          setEntries(unconverted)
        }
      } catch (error) {
        console.error('Error fetching waitlist:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEntries()
  }, [selectedTenantId])

  const handleConvert = async (entryId: number) => {
    if (!selectedTenantId) return

    setConverting(entryId)
    try {
      const response = await fetch('/api/waitlist/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          waitlistId: entryId,
          tenantId: selectedTenantId 
        }),
      })

      if (response.ok) {
        // Remove from list since it's now converted
        setEntries(entries.filter(e => e.id !== entryId))
        alert('Successfully converted to CRM lead!')
      } else {
        const data = await response.json()
        alert(`Failed to convert: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert('Network error during conversion')
    } finally {
      setConverting(null)
    }
  }

  return (
    <DemoAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Demo Hub
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-xs font-medium mb-3">
            🎭 PHASE 11
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Waitlist Management
          </h1>
          <p className="text-gray-600">
            Convert waitlist entries to CRM leads for {selectedTenant?.name || 'selected tenant'}
          </p>
        </div>

        {loading ? (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-500">Loading waitlist entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4">No unconverted waitlist entries</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/waitlist"
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Add New Entry
              </Link>
              <Link
                href="/crm"
                className="inline-block px-6 py-3 bg-white border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:border-primary-600 transition"
              >
                View CRM
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rooms
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current System
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                        <div className="text-sm text-gray-500">{entry.email}</div>
                        {entry.phone && (
                          <div className="text-xs text-gray-400">{entry.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{entry.property_name}</div>
                        {entry.notes && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={entry.notes}>
                            {entry.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {entry.room_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.current_system || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleConvert(entry.id)}
                          disabled={converting === entry.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                        >
                          {converting === entry.id ? (
                            'Converting...'
                          ) : (
                            <>
                              Convert to CRM
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Phase 11: Waitlist to CRM Conversion</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ One-click convert button per waitlist row</li>
            <li>✅ Creates CRM lead for active tenant (copies name/contact/property/notes)</li>
            <li>✅ Marks waitlist status as "converted"</li>
            <li>✅ Tenant-scoped demo auth protection</li>
            <li>✅ Never invents contact details—copies only what exists</li>
            <li>⚠️ Demo only: No live email campaigns, no auto-qualification</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/crm"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            View CRM Leads →
          </Link>
        </div>
      </div>
    </DemoAuthGuard>
  )
}
