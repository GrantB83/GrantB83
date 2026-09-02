import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default function CRMPage() {
  const db = getDb()
  const leads = db.prepare(`
    SELECT id, name, email, property_name, room_count, current_system, phone, notes, created_at
    FROM waitlist
    ORDER BY created_at DESC
  `).all() as any[]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Link>

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
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary-600">{leads.length}</div>
            <div className="text-sm text-gray-600">Total Leads</div>
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
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          {lead.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {lead.room_count}
                      </span>
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

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">CRM Features</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Read-only view of all waitlist submissions</li>
          <li>✅ Property interest and room count visible</li>
          <li>✅ Current system tracking (NightsBridge, Google Calendar, etc.)</li>
          <li>✅ Submission timestamp for follow-up prioritization</li>
          <li>⚠️ In production: export to CSV, email campaigns, qualification workflow</li>
          <li>⚠️ Demo only: No email sending, no lead qualification, no status updates</li>
        </ul>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/waitlist"
          className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          Add Another Lead
        </Link>
      </div>
    </div>
  )
}
