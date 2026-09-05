'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)
      try {
        // Fetch Browns inquiry history (tenant_id=1 is Browns)
        const response = await fetch('/api/leads?tenant_id=1')
        if (response.ok) {
          const data = await response.json()
          setLeads(data.leads || [])
        }
      } catch (error) {
        console.error('Error fetching leads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center text-slate-600 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Ops Hub
      </Link>

      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          🏠 Browns Inquiry History (Internal Only)
        </h1>
        <p className="text-sm text-gray-700">
          View inquiry intake submissions saved to local SQLite for Browns Dullstroom properties. 
          This is NOT a CRM for sale—it's internal draft history only.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading Browns inquiry history...</div>
      ) : leads.length === 0 ? (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-12 text-center">
          <p className="text-gray-600 mb-4">No inquiry history yet for Browns.</p>
          <Link
            href="/ops/inquiry-intake"
            className="inline-block px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition"
          >
            Go to Inquiry Intake
          </Link>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Guest Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Check-In</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{lead.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.property_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.check_in ? new Date(lead.check_in).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                        lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                        lead.status === 'won' ? 'bg-emerald-100 text-emerald-800' :
                        lead.status === 'lost' ? 'bg-gray-100 text-gray-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {lead.status || 'new'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-sm text-gray-600">
            <strong>{leads.length}</strong> {leads.length === 1 ? 'inquiry' : 'inquiries'} in Browns history
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/ops"
          className="inline-block px-6 py-3 bg-white border-2 border-slate-300 text-gray-900 rounded-lg font-semibold hover:border-slate-500 transition"
        >
          Back to All Ops Tools
        </Link>
      </div>
    </div>
  )
}
