'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Key, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function RedeemPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    error?: string
    tenant?: any
  } | null>(null)

  async function handleRedeem() {
    if (!code.trim()) {
      setResult({ success: false, error: 'Please enter a code' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/invite-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.message,
          tenant: data.tenant
        })
        
        if (data.tenant) {
          localStorage.setItem('demo_tenant_id', data.tenant.id.toString())
        }
      } else {
        setResult({
          success: false,
          error: data.error || 'Invalid code'
        })
      }
    } catch (error) {
      console.error('Error redeeming code:', error)
      setResult({
        success: false,
        error: 'Failed to redeem code. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-800 rounded-full text-sm font-medium mb-4">
          Phase 28 — Redeem Demo Code
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Redeem Invite Code</h1>
        <p className="text-lg text-gray-600">
          Enter your demo invite code to unlock tenant access
        </p>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
        <p className="text-amber-800 font-medium mb-2">
          ⚠️ DEMO ACCESS ONLY
        </p>
        <p className="text-amber-700 text-sm">
          This unlocks demo tenant context for sales walkthroughs. This is NOT a paid account, 
          NOT a signup, and does NOT create any subscription or payment. All data is local 
          SQLite fixtures only.
        </p>
      </div>

      {!result?.success && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-8 h-8 text-violet-600" />
            <h2 className="text-2xl font-bold text-gray-900">Enter Code</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                maxLength={8}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-center text-2xl font-mono font-bold tracking-wider uppercase"
                disabled={loading}
              />
            </div>

            {result?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800">{result.error}</p>
              </div>
            )}

            <button
              onClick={handleRedeem}
              disabled={loading || !code.trim()}
              className="w-full px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-gray-400 font-semibold transition text-lg"
            >
              {loading ? 'Redeeming...' : 'Redeem Code'}
            </button>
          </div>
        </div>
      )}

      {result?.success && result.tenant && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <h2 className="text-2xl font-bold text-green-900">Demo Access Unlocked!</h2>
          </div>

          <div className="mb-6">
            <p className="text-green-800 font-medium mb-2">{result.message}</p>
            <p className="text-green-700">
              You now have demo access to <strong>{result.tenant.name}</strong>
            </p>
          </div>

          <div className="bg-white rounded-lg border border-green-200 p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Demo Tenant Details</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-gray-700">Name:</dt>
                <dd className="text-gray-900">{result.tenant.name}</dd>
              </div>
              {result.tenant.location && (
                <div>
                  <dt className="font-medium text-gray-700">Location:</dt>
                  <dd className="text-gray-900">{result.tenant.location}</dd>
                </div>
              )}
              {result.tenant.timezone && (
                <div>
                  <dt className="font-medium text-gray-700">Timezone:</dt>
                  <dd className="text-gray-900">{result.tenant.timezone}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="space-y-3">
            <Link
              href="/demo"
              className="block text-center px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-semibold transition"
            >
              Go to Demo Hub
            </Link>
            <Link
              href="/demo/sales-walkthrough"
              className="block text-center px-6 py-3 bg-white text-violet-600 border-2 border-violet-600 rounded-lg hover:bg-violet-50 font-semibold transition"
            >
              Start Sales Walkthrough
            </Link>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">What This Is</h3>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✓</span>
            <span>Demo/preview access to a tenant for sales walkthroughs</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✓</span>
            <span>Local SQLite fixtures only — no cloud sync</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✗</span>
            <span className="line-through">NOT a paid account or subscription</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✗</span>
            <span className="line-through">NO Stripe, NO payments, NO signup flow</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">✗</span>
            <span className="line-through">NO WhatsApp/email auto-send</span>
          </li>
        </ul>

        <p className="mt-4 text-sm text-blue-900 font-medium">
          All hard gates from Phase 27 remain: DRAFT/fixtures only, never invents PII.
        </p>
      </div>

      <div className="mt-6 text-center">
        <Link href="/demo" className="text-violet-600 hover:text-violet-700 font-medium">
          ← Back to Demo Hub
        </Link>
      </div>
    </div>
  )
}
