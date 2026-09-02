import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getDb, getDefaultTenantId } from '@/lib/db'
import CRMTable from '@/components/CRMTable'
import { DemoAuthGuard } from '@/components/DemoAuthGuard'

export const dynamic = 'force-dynamic'

export default function CRMPage() {
  const db = getDb()
  const defaultTenantId = getDefaultTenantId()
  
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(defaultTenantId) as any
  
  const initialLeads = db.prepare(`
    SELECT w.id, w.name, w.email, w.property_name, w.room_count, w.current_system, w.phone, w.notes, w.status, w.created_at,
           t.name as tenant_name
    FROM waitlist w
    LEFT JOIN tenants t ON w.tenant_id = t.id
    WHERE w.tenant_id = ? OR w.tenant_id IS NULL
    ORDER BY w.created_at DESC
  `).all(defaultTenantId) as any[]

  return (
    <DemoAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <CRMTable 
          initialLeads={initialLeads} 
          tenant={tenant}
          defaultTenantId={defaultTenantId}
        />

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">CRM Features (Phase 3)</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ View all waitlist submissions with property details and notes</li>
            <li>✅ Lead status tracking (New → Contacted → Qualified → Won/Lost)</li>
            <li>✅ CSV export of leads (tenant-scoped, local SQLite only)</li>
            <li>✅ Current system tracking (NightsBridge, Google Calendar, etc.)</li>
            <li>✅ Submission timestamp for follow-up prioritization</li>
            <li>✅ Multi-tenant filtering (demo tenant: {tenant?.name || 'N/A'})</li>
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
