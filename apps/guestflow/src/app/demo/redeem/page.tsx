'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Gift, Check, AlertCircle, ArrowRight } from 'lucide-react'

export default function RedeemPage() {
  const [code, setCode] = useState('')
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [inviteCodeId, setInviteCodeId] = useState<number | null>(null)

  const handleRedeem = async () => {
    if (!code.trim()) {
      setRedeemError('Please enter an invite code')
      return
    }

    setIsRedeeming(true)
    setRedeemError(null)

    try {
      const response = await fetch('/api/invite-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to redeem invite code')
      }

      setRedeemSuccess(true)
      setInviteCodeId(data.inviteCodeId)
      
      // Store invite code ID in sessionStorage for optional waitlist attribution
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('guestflow_invite_code_id', String(data.inviteCodeId))
      }
    } catch (error: any) {
      setRedeemError(error.message || 'Failed to redeem invite code')
    } finally {
      setIsRedeeming(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
          <Gift className="w-4 h-4" />
          DEMO ACCESS ONLY
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Redeem Invite Code
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Enter your invite code to unlock demo access and join the waitlist with attribution.
        </p>
      </div>

      {/* Amber Banner */}
      <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Demo Environment Only</p>
            <p>This is a <strong>DEMO/FIXTURE</strong> redeem flow. No production data. Hard gates: NO live payments, NO public paid signup, NO auto-send.</p>
          </div>
        </div>
      </div>

      {!redeemSuccess ? (
        /* Redeem Form */
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8 shadow-sm">
          <div className="mb-6">
            <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-2">
              Invite Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter your invite code (e.g. DEMO2026)"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent uppercase"
              disabled={isRedeeming}
            />
          </div>

          {redeemError && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold">Error</p>
                  <p>{redeemError}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleRedeem}
            disabled={isRedeeming || !code.trim()}
            className="w-full bg-teal-600 text-white px-8 py-4 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold text-lg"
          >
            {isRedeeming ? 'Redeeming...' : 'Redeem Invite Code'}
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an invite code? <Link href="/waitlist" className="text-teal-600 hover:text-teal-700 font-medium">Join the waitlist</Link>
          </p>
        </div>
      ) : (
        /* Success State */
        <div className="bg-white rounded-xl border-2 border-green-200 p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invite Code Redeemed!
            </h2>
            <p className="text-gray-600">
              Your invite code has been successfully redeemed. You now have demo access.
            </p>
          </div>

          {/* Next Steps */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Explore Demo Features</p>
                  <p className="text-sm text-gray-600">Check out the interactive demo hub to see GuestFlow in action</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Join the Waitlist (Optional)</p>
                  <p className="text-sm text-gray-600">Join our waitlist to receive early access updates. Your invite code will be tracked for attribution.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/demo"
              className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition font-semibold text-center inline-flex items-center justify-center gap-2"
            >
              <span>Go to Demo Hub</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/waitlist"
              className="flex-1 bg-white text-teal-600 px-6 py-3 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition font-semibold text-center"
            >
              Join Waitlist
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Invite Code ID: {inviteCodeId} • DEMO ACCESS ONLY
          </p>
        </div>
      )}

      {/* Info Card */}
      <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">About Invite Codes</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Invite codes unlock demo access and track which demos drive interest</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>If you join the waitlist after redeeming, your code will be linked to your lead for attribution</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Each code has a maximum number of uses and optional expiry date</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>DEMO ONLY:</strong> This is not a paid funnel—hard gates remain in place</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
