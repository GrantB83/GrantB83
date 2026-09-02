'use client'

import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Tenant {
  id: number
  name: string
  location: string
  timezone: string
}

export default function TenantSwitcherPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null)

  useEffect(() => {
    const fetchTenants = async () => {
      const response = await fetch('/api/tenants')
      if (response.ok) {
        const data = await response.json()
        setTenants(data.tenants)
        setSelectedTenant(data.defaultTenantId)
      }
    }
    fetchTenants()
  }, [])

  const handleSelectTenant = (tenantId: number) => {
    setSelectedTenant(tenantId)
    localStorage.setItem('guestflow_demo_tenant_id', tenantId.toString())
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo Hub
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium mb-3">
          🎭 DEMO / LOCAL ONLY
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tenant Switcher
        </h1>
        <p className="text-gray-600">
          Switch between demo tenants (local development only)
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-amber-900 mb-2">⚠️ Local Demo Only</h3>
        <p className="text-sm text-amber-800">
          This tenant switcher is for <strong>local development and demo purposes only</strong>. 
          In production, tenants will be authenticated via NextAuth.js with proper isolation and security.
        </p>
      </div>

      <div className="space-y-4">
        {tenants.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No tenants found. Run <code className="px-2 py-1 bg-gray-200 rounded">npm run db:init</code> to seed demo data.</p>
          </div>
        ) : (
          tenants.map((tenant) => (
            <div
              key={tenant.id}
              onClick={() => handleSelectTenant(tenant.id)}
              className={`border-2 rounded-xl p-6 cursor-pointer transition ${
                selectedTenant === tenant.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className={`w-5 h-5 ${selectedTenant === tenant.id ? 'text-primary-600' : 'text-gray-400'}`} />
                    <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
                    {selectedTenant === tenant.id && (
                      <span className="px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    📍 {tenant.location}
                  </p>
                  <p className="text-xs text-gray-500">
                    🕐 {tenant.timezone}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">How This Works</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Demo tenant: "The Browns Luxury Guest Suites (Dullstroom)" pre-seeded</li>
          <li>✅ All demo routes default to the selected tenant</li>
          <li>✅ Selection stored in browser localStorage (local dev only)</li>
          <li>⚠️ In production: Multi-tenant authentication via NextAuth.js</li>
          <li>⚠️ In production: Row-level security ensures tenant data isolation</li>
        </ul>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/demo"
          className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          Continue to Demos
        </Link>
      </div>
    </div>
  )
}
