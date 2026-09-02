'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'

const STATUS_COLORS = {
  new: 'bg-gray-100 text-gray-800',
  contacted: 'bg-blue-100 text-blue-800',
  qualified: 'bg-purple-100 text-purple-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
}

const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
}

type Lead = {
  id: number
  name: string
  email: string
  property_name: string
  room_count: string
  current_system: string | null
  phone: string | null
  notes: string | null
  status: string
  created_at: string
  tenant_name: string | null
}

type CRMTableProps = {
  initialLeads: Lead[]
  tenant: any
  defaultTenantId: number
}

export default function CRMTable({ initialLeads, tenant, defaultTenantId }: CRMTableProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [updating, setUpdating] = useState<number | null>(null)

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setUpdating(leadId)
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setLeads(leads.map(lead => 
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        ))
      } else {
        alert('Failed to update status')
      }
    } catch (error) {
      alert('Network error')
    } finally {
      setUpdating(null)
    }
  }

  const handleExportCSV = () => {
    window.location.href = `/api/leads/export?tenant_id=${defaultTenantId}`
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium mb-3">
              🎭 DEMO CRM
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Operator Lead Management
            </h1>
            <p className="text-gray-600 mt-2">
              View and manage guesthouse operator waitlist submissions
            </p>
            {tenant && (
              <p className="text-sm text-gray-500 mt-1">
                Filtered to: <span className="font-semibold">{tenant.name}</span>
              </p>
            )}
          </div>
          <div className="text-right space-y-2">
            <div className="text-3xl font-bold text-primary-600">{leads.length}</div>
            <div className="text-sm text-gray-600">Total Leads</div>
            {leads.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-4">No waitlist leads yet</p>
          <Link
            href="/waitlist"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Submit Test Lead
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rooms
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{lead.property_name}</div>
                      {lead.notes && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={lead.notes}>
                          {lead.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {lead.room_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={lead.status || 'new'}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        disabled={updating === lead.id}
                        className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer ${STATUS_COLORS[lead.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.new} ${updating === lead.id ? 'opacity-50' : ''}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.current_system || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.phone ? (
                        <div className="text-sm text-gray-900">{lead.phone}</div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
