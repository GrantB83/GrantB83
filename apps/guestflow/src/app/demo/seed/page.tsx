'use client'

import { useState } from 'react'
import { DemoAuthGuard } from '@/components/DemoAuthGuard'
import { Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function DemoSeedPage() {
  return (
    <DemoAuthGuard>
      <DemoSeedContent />
    </DemoAuthGuard>
  )
}

function DemoSeedContent() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    summary?: {
      tenant: string
      tenantId: number
      properties: number
      rateCards: number
      leads: number
      inquiries: number
      bookings: number
    }
    error?: string
  } | null>(null)

  const handleSeed = async () => {
    setIsSeeding(true)
    setResult(null)

    try {
      // Get demo password from sessionStorage (same as DemoAuthGuard)
      const authStatus = sessionStorage.getItem('guestflow_demo_auth')
      
      if (authStatus !== 'authenticated') {
        setResult({
          success: false,
          message: 'Not authenticated',
          error: 'Please log in first'
        })
        setIsSeeding(false)
        return
      }

      const response = await fetch('/api/demo/seed', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer demo2026',
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({
          success: false,
          message: data.error || 'Seed failed',
          error: data.details || 'Unknown error'
        })
      } else {
        setResult({
          success: true,
          message: data.message,
          summary: data.summary
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Failed to connect to API'
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link 
          href="/demo"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Back to Demo Hub
        </Link>
      </div>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-4">
          🎭 DEMO ONLY
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          One-Click Demo Seed
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Reset demo SQLite database to a known-good sales walkthrough state.
        </p>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-8 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <Database className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What This Does</h2>
            <p className="text-gray-600">
              Running the seed will create a fresh demo environment with:
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <ul className="space-y-2 text-sm text-blue-900">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>1 demo tenant:</strong> "Dullstroom Demo Guesthouse"</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>2 properties:</strong> Riverside Suite (2 rooms) + Mountain View Cottage (3 rooms)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>4 rate cards:</strong> Peak/standard season rates (clearly labeled DEMO)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>3 sample leads:</strong> For CRM demo with diverse scenarios</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>3 inquiries:</strong> For quote draft generation</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>2 confirmed bookings:</strong> For daily brief / ops demos</span>
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">
                ⚠️ Idempotent Operation
              </p>
              <p className="text-xs text-amber-800">
                Re-running this seed will <strong>delete and replace</strong> all data for the "Dullstroom Demo Guesthouse" tenant.
                Other tenants (if any) are never touched. Safe to run multiple times.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSeed}
          disabled={isSeeding}
          className="w-full px-6 py-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isSeeding ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Seeding Demo Data...
            </>
          ) : (
            <>
              <Database className="w-5 h-5" />
              Run Demo Seed
            </>
          )}
        </button>
      </div>

      {result && (
        <div className={`rounded-xl border-2 p-6 ${
          result.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3 mb-4">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div>
              <h3 className={`text-lg font-bold mb-1 ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? 'Seed Complete!' : 'Seed Failed'}
              </h3>
              <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </p>
            </div>
          </div>

          {result.success && result.summary && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-900 mb-3">Summary:</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Tenant:</span>
                  <p className="font-medium text-gray-900">{result.summary.tenant}</p>
                </div>
                <div>
                  <span className="text-gray-600">Tenant ID:</span>
                  <p className="font-medium text-gray-900">{result.summary.tenantId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Properties:</span>
                  <p className="font-medium text-gray-900">{result.summary.properties}</p>
                </div>
                <div>
                  <span className="text-gray-600">Rate Cards:</span>
                  <p className="font-medium text-gray-900">{result.summary.rateCards}</p>
                </div>
                <div>
                  <span className="text-gray-600">Leads (CRM):</span>
                  <p className="font-medium text-gray-900">{result.summary.leads}</p>
                </div>
                <div>
                  <span className="text-gray-600">Inquiries:</span>
                  <p className="font-medium text-gray-900">{result.summary.inquiries}</p>
                </div>
                <div>
                  <span className="text-gray-600">Bookings:</span>
                  <p className="font-medium text-gray-900">{result.summary.bookings}</p>
                </div>
              </div>
            </div>
          )}

          {result.error && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {result.error}
              </p>
            </div>
          )}

          {result.success && (
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/crm"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
              >
                View CRM Leads →
              </Link>
              <Link
                href="/demo/quote-draft"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
              >
                Generate Quotes →
              </Link>
              <Link
                href="/demo/rate-card-upload"
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
              >
                View Rate Cards →
              </Link>
              <Link
                href="/demo"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
              >
                Back to Demo Hub
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
        <h3 className="font-semibold text-gray-900 mb-3">🔒 Hard Gates Reminder</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>❌ NO live payments</li>
          <li>❌ NO paid ads</li>
          <li>❌ NO public signup</li>
          <li>❌ NO WhatsApp/email auto-send</li>
          <li>✅ Demo data only — all rates clearly labeled DEMO</li>
          <li>✅ Local SQLite only — never touches production</li>
        </ul>
      </div>
    </div>
  )
}
