'use client'

import { useState } from 'react'
import { DemoAuthGuard } from '@/components/DemoAuthGuard'
import { Building2, Home, CreditCard, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Step = 'tenant' | 'property' | 'rates' | 'complete'

interface TenantData {
  name: string
  location: string
  timezone: string
}

interface PropertyData {
  name: string
  location: string
  roomCount: number
}

export default function OnboardPage() {
  return (
    <DemoAuthGuard>
      <OnboardWizard />
    </DemoAuthGuard>
  )
}

function OnboardWizard() {
  const [step, setStep] = useState<Step>('tenant')
  const [tenantData, setTenantData] = useState<TenantData>({
    name: '',
    location: '',
    timezone: 'Africa/Johannesburg'
  })
  const [propertyData, setPropertyData] = useState<PropertyData>({
    name: '',
    location: '',
    roomCount: 3
  })
  const [createdTenantId, setCreatedTenantId] = useState<number | null>(null)
  const [createdPropertyId, setCreatedPropertyId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTenantNext = async () => {
    if (!tenantData.name || !tenantData.location) {
      setError('Please fill in all tenant fields')
      return
    }
    
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantData)
      })

      if (!response.ok) {
        throw new Error('Failed to create tenant')
      }

      const data = await response.json()
      setCreatedTenantId(data.id)
      setStep('property')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePropertyNext = async () => {
    if (!propertyData.name || !propertyData.location || propertyData.roomCount < 1) {
      setError('Please fill in all property fields')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: createdTenantId,
          ...propertyData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create property')
      }

      const data = await response.json()
      setCreatedPropertyId(data.id)
      setStep('rates')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipRates = () => {
    setStep('complete')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-4">
          🎭 DEMO ONBOARDING
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Tenant Onboarding Wizard
        </h1>
        <p className="text-xl text-gray-600">
          Multi-step flow to set up a new tenant and property (DEMO only)
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-12">
        <div className="flex items-center justify-center gap-4">
          <StepIndicator 
            icon={<Building2 className="w-5 h-5" />}
            label="Tenant"
            active={step === 'tenant'}
            completed={['property', 'rates', 'complete'].includes(step)}
          />
          <div className="w-16 h-0.5 bg-gray-300" />
          <StepIndicator 
            icon={<Home className="w-5 h-5" />}
            label="Property"
            active={step === 'property'}
            completed={['rates', 'complete'].includes(step)}
          />
          <div className="w-16 h-0.5 bg-gray-300" />
          <StepIndicator 
            icon={<CreditCard className="w-5 h-5" />}
            label="Rates"
            active={step === 'rates'}
            completed={step === 'complete'}
          />
          <div className="w-16 h-0.5 bg-gray-300" />
          <StepIndicator 
            icon={<CheckCircle className="w-5 h-5" />}
            label="Complete"
            active={step === 'complete'}
            completed={false}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Step 1: Create Tenant */}
      {step === 'tenant' && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create Tenant</h2>
              <p className="text-gray-600">Enter your business details</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tenantData.name}
                onChange={(e) => setTenantData({ ...tenantData, name: e.target.value })}
                placeholder="e.g., Riverside Lodge Hospitality"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tenantData.location}
                onChange={(e) => setTenantData({ ...tenantData, location: e.target.value })}
                placeholder="e.g., Dullstroom, Mpumalanga, South Africa"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={tenantData.timezone}
                onChange={(e) => setTenantData({ ...tenantData, timezone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                <option value="America/Chicago">America/Chicago (CST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
              </select>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleTenantNext}
              disabled={isSubmitting}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? 'Creating...' : 'Next: Add Property'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Add Property */}
      {step === 'property' && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Home className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add Property</h2>
              <p className="text-gray-600">Set up your first property</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={propertyData.name}
                onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })}
                placeholder="e.g., Riverside Lodge"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={propertyData.location}
                onChange={(e) => setPropertyData({ ...propertyData, location: e.target.value })}
                placeholder="e.g., Dullstroom, SA"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Rooms <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={propertyData.roomCount}
                onChange={(e) => setPropertyData({ ...propertyData, roomCount: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep('tenant')}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={handlePropertyNext}
              disabled={isSubmitting}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? 'Creating...' : 'Next: Rate Cards'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Optional Rate Card Upload */}
      {step === 'rates' && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upload Rate Cards (Optional)</h2>
              <p className="text-gray-600">Add your pricing or skip for now</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-blue-900 mb-4">
                You can upload your rate cards now or do it later. Rate cards are stored in tenant-scoped SQLite and used for quote generation.
              </p>
              <p className="text-sm text-blue-800">
                <strong>Formats supported:</strong> CSV and JSON
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Link
                href="/demo/rate-card-upload"
                className="block px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-lg transition text-center"
              >
                Go to Rate Card Upload →
              </Link>
              
              <p className="text-center text-gray-500 text-sm">or</p>
              
              <button
                onClick={handleSkipRates}
                className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Skip for Now
              </button>
            </div>
          </div>

          <div className="mt-8 flex justify-start">
            <button
              onClick={() => setStep('property')}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Onboarding Complete! 🎉
            </h2>
            <p className="text-lg text-gray-600">
              Your tenant and property have been created successfully.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Created Resources:</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Tenant: {tenantData.name}</p>
                  <p className="text-xs text-gray-600">ID: {createdTenantId}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Home className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Property: {propertyData.name}</p>
                  <p className="text-xs text-gray-600">ID: {createdPropertyId} · {propertyData.roomCount} rooms</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Next Steps:</h3>
            
            <Link
              href="/crm"
              className="block px-6 py-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition text-center"
            >
              Go to CRM Dashboard →
            </Link>

            <Link
              href="/demo"
              className="block px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-center"
            >
              Back to Demo Hub
            </Link>

            <Link
              href="/demo/rate-card-upload"
              className="block px-6 py-4 border-2 border-green-300 text-green-700 rounded-lg font-semibold hover:bg-green-50 transition text-center"
            >
              Upload Rate Cards
            </Link>
          </div>

          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-800">
              ⚠️ <strong>DEMO MODE:</strong> This data is stored in local SQLite only. Not a production signup flow.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function StepIndicator({ 
  icon, 
  label, 
  active, 
  completed 
}: { 
  icon: React.ReactNode
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center transition
        ${completed ? 'bg-green-600 text-white' : active ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'}
      `}>
        {icon}
      </div>
      <span className={`text-xs font-medium ${active || completed ? 'text-gray-900' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}
