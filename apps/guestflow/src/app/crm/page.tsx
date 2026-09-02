'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Filter } from 'lucide-react'
import CRMTable from '@/components/CRMTable'
import { DemoAuthGuard } from '@/components/DemoAuthGuard'
import { useTenant } from '@/components/TenantContext'

export default function CRMPage() {
  const { selectedTenantId, tenants } = useTenant()
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Phase 31: Invite code filter state
  const [inviteCodeFilter, setInviteCodeFilter] = useState<string>('all')
  const [availableCodes, setAvailableCodes] = useState<string[]>([])
  const [initialFilterSet, setInitialFilterSet] = useState(false)

  const selectedTenant = tenants.find(t => t.id === selectedTenantId)
  
  // Phase 31: Read invite code from URL query param on initial load
  useEffect(() => {
    if (!initialFilterSet && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const codeFromUrl = params.get('invite_code')
      if (codeFromUrl) {
        setInviteCodeFilter(codeFromUrl)
      }
      setInitialFilterSet(true)
    }
  }, [initialFilterSet])

  useEffect(() => {
    if (selectedTenantId === null) return

    const fetchLeads = async () => {
      setLoading(true)
      try {
        let url = `/api/leads?tenant_id=${selectedTenantId}`
        
        // Phase 31: Apply invite code filter
        if (inviteCodeFilter !== 'all') {
          url += `&invite_code=${inviteCodeFilter}`
        }
        
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setLeads(data.leads || [])
          
          // Phase 31: Extract unique invite codes for filter dropdown
          if (inviteCodeFilter === 'all') {
            const codes = Array.from(new Set(
              (data.leads || [])
                .map((l: any) => l.invite_code)
                .filter((c: string | null) => c !== null)
            )) as string[]
            setAvailableCodes(codes)
          }
        }
      } catch (error) {
        console.error('Error fetching leads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [selectedTenantId, inviteCodeFilter])

  return (
    <DemoAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        {/* Phase 31: Invite Code Filter */}
        <div className="mb-6 bg-white border-2 border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <label htmlFor="invite-code-filter" className="text-sm font-semibold text-gray-700">
                Filter by Invite Code:
              </label>
            </div>
            <select
              id="invite-code-filter"
              value={inviteCodeFilter}
              onChange={(e) => setInviteCodeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Leads</option>
              <option value="any">Any Attributed (has invite code)</option>
              <option value="none">Unattributed (no invite code)</option>
              {availableCodes.length > 0 && <option disabled>─────────</option>}
              {availableCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            {inviteCodeFilter !== 'all' && (
              <button
                onClick={() => setInviteCodeFilter('all')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

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
          <h3 className="font-semibold text-gray-900 mb-2">CRM Features (Phase 31)</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ View all waitlist submissions with property details and notes</li>
            <li>✅ Lead status tracking (New → Contacted → Qualified → Won/Lost)</li>
            <li>✅ CSV export of leads (tenant-scoped, local SQLite only)</li>
            <li>✅ Current system tracking (NightsBridge, Google Calendar, etc.)</li>
            <li>✅ Submission timestamp for follow-up prioritization</li>
            <li>✅ Multi-tenant switcher—scoped to selected tenant ({selectedTenant?.name || 'N/A'})</li>
            <li>✅ Timestamped notes on leads—expand rows to view history and add notes (Phase 12)</li>
            <li>✅ <strong>NEW Phase 31:</strong> Filter by invite code—see which leads came from specific codes or show all attributed/unattributed</li>
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
