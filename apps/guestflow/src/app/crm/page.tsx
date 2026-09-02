'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CRMTable from '@/components/CRMTable'
import { DemoAuthGuard } from '@/components/DemoAuthGuard'
import { useTenant } from '@/components/TenantContext'

export default function CRMPage() {
  const { selectedTenantId, tenants } = useTenant()
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const selectedTenant = tenants.find(t => t.id === selectedTenantId)

  useEffect(() => {
    if (selectedTenantId === null) return

    const fetchLeads = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/leads?tenant_id=${selectedTenantId}`)
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
  }, [selectedTenantId])

  return (
    <DemoAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {loading ? (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-500">Loading leads...</p>
          </div>
        ) : (
          <CRMTable 
            initialLeads={leads} 
            tenant={selectedTenant}
            defaultTenantId={selectedTenantId || 1}
          />
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">CRM Features (Phase 10)</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ View all waitlist submissions with property details and notes</li>
            <li>✅ Lead status tracking (New → Contacted → Qualified → Won/Lost)</li>
            <li>✅ CSV export of leads (tenant-scoped, local SQLite only)</li>
            <li>✅ Current system tracking (NightsBridge, Google Calendar, etc.)</li>
            <li>✅ Submission timestamp for follow-up prioritization</li>
            <li>✅ <strong>NEW:</strong> Multi-tenant switcher—scoped to selected tenant ({selectedTenant?.name || 'N/A'})</li>
            <li>⚠️ Demo only: No email sending, no automated campaigns, no live payments</li>
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
    </DemoAuthGuard>
  )
}
