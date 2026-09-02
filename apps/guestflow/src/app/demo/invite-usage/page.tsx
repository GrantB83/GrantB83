'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Download, AlertCircle, Calendar, Users, Gift } from 'lucide-react'
import { DemoAuthGuard } from '@/components/DemoAuthGuard'
import { useTenant } from '@/components/TenantContext'

interface InviteCodeUsage {
  id: number
  code: string
  max_uses: number
  uses_count: number
  expires_at: string | null
  note: string | null
  created_at: string
  waitlist_leads_count: number
}

function InviteUsageContent() {
  const { selectedTenantId, tenants } = useTenant()
  const activeTenant = tenants.find(t => t.id === selectedTenantId)
  const [codes, setCodes] = useState<InviteCodeUsage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (selectedTenantId) {
      fetchUsage()
    }
  }, [selectedTenantId])

  const fetchUsage = async () => {
    if (!selectedTenantId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invite-codes/usage?tenant_id=${selectedTenantId}`, {
        headers: {
          'Authorization': 'Bearer demo2026'
        }
      })
      const data = await response.json()
      setCodes(data.codes || [])
    } catch (error) {
      console.error('Error fetching invite code usage:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportAsMarkdown = () => {
    if (!activeTenant) return
    
    setIsExporting(true)

    try {
      let markdown = `# Invite Code Usage Report\n\n`
      markdown += `**Tenant:** ${activeTenant.name}\n`
      markdown += `**Generated:** ${new Date().toLocaleString()}\n`
      markdown += `**Environment:** DEMO ACCESS ONLY\n\n`
      markdown += `---\n\n`

      if (codes.length === 0) {
        markdown += `No invite codes found for this tenant.\n`
      } else {
        markdown += `## Summary\n\n`
        markdown += `- **Total Codes:** ${codes.length}\n`
        markdown += `- **Total Redemptions:** ${codes.reduce((sum, c) => sum + c.uses_count, 0)}\n`
        markdown += `- **Total Waitlist Leads Attributed:** ${codes.reduce((sum, c) => sum + c.waitlist_leads_count, 0)}\n\n`
        markdown += `---\n\n`

        markdown += `## Invite Codes\n\n`

        codes.forEach((code) => {
          const isExpired = code.expires_at ? new Date(code.expires_at) < new Date() : false
          const isMaxedOut = code.uses_count >= code.max_uses

          markdown += `### ${code.code}\n\n`
          
          if (code.note) {
            markdown += `**Note:** ${code.note}\n\n`
          }

          markdown += `| Metric | Value |\n`
          markdown += `|--------|-------|\n`
          markdown += `| Code ID | #${code.id} |\n`
          markdown += `| Redemptions | ${code.uses_count} / ${code.max_uses} |\n`
          markdown += `| Waitlist Leads Attributed | ${code.waitlist_leads_count} |\n`
          markdown += `| Expires | ${code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'} |\n`
          markdown += `| Status | ${isExpired ? '❌ Expired' : isMaxedOut ? '⚠️ Max Uses Reached' : '✅ Active'} |\n`
          markdown += `| Created | ${new Date(code.created_at).toLocaleDateString()} |\n\n`
        })
      }

      markdown += `---\n\n`
      markdown += `## Hard Gates\n\n`
      markdown += `- ❌ NO live payments\n`
      markdown += `- ❌ NO paid ads\n`
      markdown += `- ❌ NO public paid signup\n`
      markdown += `- ❌ NO WhatsApp/email auto-send\n`
      markdown += `- ✅ DEMO ACCESS ONLY - This is not a paid funnel\n\n`
      markdown += `Report generated from local SQLite demo data only.\n`

      // Download
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invite-code-usage-${activeTenant.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.md`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting report:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const totalRedemptions = codes.reduce((sum, c) => sum + c.uses_count, 0)
  const totalLeads = codes.reduce((sum, c) => sum + c.waitlist_leads_count, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
          <BarChart3 className="w-4 h-4" />
          DEMO ACCESS ONLY
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Invite Code Usage Report
        </h1>
        <p className="text-xl text-gray-600">
          Track which invite codes drive interest—redeem attribution + waitlist/CRM leads.
        </p>
      </div>

      {/* Amber Banner */}
      <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Demo Environment • Not a Paid Funnel</p>
            <p>This report shows <strong>DEMO/FIXTURE</strong> data only. Hard gates: NO live payments, NO public paid signup, NO auto-send. Usage data persists to local SQLite only.</p>
          </div>
        </div>
      </div>

      {/* Active Tenant Info */}
      {activeTenant && (
        <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Active Tenant:</span> {activeTenant.name}
          </p>
        </div>
      )}

      {/* Export Button */}
      <div className="mb-6">
        <button
          onClick={exportAsMarkdown}
          disabled={isExporting || codes.length === 0}
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
        >
          <Download className="w-5 h-5" />
          {isExporting ? 'Exporting...' : 'Export Report (Markdown)'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading usage data...</p>
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
          <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 mb-2">No invite codes found</p>
          <p className="text-gray-600 mb-4">Create invite codes to start tracking demo interest and attribution</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Gift className="w-6 h-6 text-teal-600" />
                <h3 className="text-sm font-semibold text-gray-600">Total Codes</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{codes.length}</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-600">Total Redemptions</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalRedemptions}</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-600">Waitlist Leads Attributed</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalLeads}</p>
            </div>
          </div>

          {/* Codes Table */}
          <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Note</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Redemptions</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Max Uses</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Waitlist Leads</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Expires</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {codes.map((code) => {
                    const isExpired = code.expires_at ? new Date(code.expires_at) < new Date() : false
                    const isMaxedOut = code.uses_count >= code.max_uses

                    return (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-mono font-bold text-gray-900">{code.code}</p>
                          <p className="text-xs text-gray-500">ID: {code.id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{code.note || '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="text-lg font-bold text-gray-900">{code.uses_count}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="text-sm text-gray-600">{code.max_uses}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                            <Users className="w-4 h-4" />
                            <span className="font-bold">{code.waitlist_leads_count}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <p className="text-sm text-gray-600">
                              {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isExpired ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              Expired
                            </span>
                          ) : isMaxedOut ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                              Maxed Out
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function InviteUsagePage() {
  return (
    <DemoAuthGuard>
      <InviteUsageContent />
    </DemoAuthGuard>
  )
}
