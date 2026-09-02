'use client'

import { useTenant } from './TenantContext'
import { Building2, Check } from 'lucide-react'

export default function TenantSwitcher() {
  const { selectedTenantId, setSelectedTenantId, tenants, isLoading } = useTenant()

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Demo Tenant</h3>
          <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
            DEMO ONLY
          </span>
        </div>
        <p className="text-sm text-gray-500">Loading tenants...</p>
      </div>
    )
  }

  if (tenants.length === 0) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Demo Tenant</h3>
          <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
            DEMO ONLY
          </span>
        </div>
        <p className="text-sm text-gray-500">
          No tenants found. Run <code className="px-2 py-1 bg-gray-100 rounded text-xs">npm run db:init</code> to seed data.
        </p>
      </div>
    )
  }

  const selectedTenant = tenants.find(t => t.id === selectedTenantId)
  const dullstroomTenant = tenants.find(t => t.name.includes('Dullstroom'))

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Building2 className="w-6 h-6 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">Demo Tenant</h3>
        <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
          DEMO ONLY
        </span>
      </div>

      <div className="space-y-3">
        {/* Quick shortcut for Dullstroom Demo */}
        {dullstroomTenant && dullstroomTenant.id !== selectedTenantId && (
          <button
            onClick={() => setSelectedTenantId(dullstroomTenant.id)}
            className="w-full px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-200 transition flex items-center justify-center gap-2"
          >
            ⚡ Use Seeded Dullstroom Demo
          </button>
        )}

        {/* Tenant selector pills */}
        <div className="flex flex-wrap gap-2">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => setSelectedTenantId(tenant.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
                selectedTenantId === tenant.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {selectedTenantId === tenant.id && <Check className="w-4 h-4" />}
              {tenant.name.length > 30 ? tenant.name.substring(0, 30) + '...' : tenant.name}
            </button>
          ))}
        </div>

        {/* Selected tenant details */}
        {selectedTenant && (
          <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm font-medium text-primary-900 mb-1">
              ✓ Active: {selectedTenant.name}
            </p>
            <p className="text-xs text-primary-700">
              📍 {selectedTenant.location} · 🕐 {selectedTenant.timezone}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Selection is sticky across demo routes (CRM, quotes, rate cards, seed). 
          Stored in browser localStorage for demo purposes only.
        </p>
      </div>
    </div>
  )
}
