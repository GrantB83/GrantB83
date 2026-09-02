'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/components/TenantContext'
import { Key, Plus, Copy, Check } from 'lucide-react'
import { DemoAuthGuard } from '@/components/DemoAuthGuard'

export default function InviteCodesPage() {
  return (
    <DemoAuthGuard>
      <InviteCodesContent />
    </DemoAuthGuard>
  )
}

function InviteCodesContent() {
  const { selectedTenantId, tenants } = useTenant()
  const activeTenant = tenants.find(t => t.id === selectedTenantId)
  
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  
  const [maxUses, setMaxUses] = useState(1)
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [note, setNote] = useState('')

  useEffect(() => {
    loadCodes()
  }, [activeTenant])

  async function loadCodes() {
    if (!activeTenant) return
    
    try {
      const response = await fetch(`/api/invite-codes?tenant_id=${activeTenant.id}`)
      const data = await response.json()
      setCodes(data.codes || [])
    } catch (error) {
      console.error('Error loading codes:', error)
    }
  }

  async function generateCode() {
    if (!activeTenant) return
    
    setLoading(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
      
      const response = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: activeTenant.id,
          max_uses: maxUses,
          expires_at: expiresAt.toISOString(),
          note: note || null
        })
      })
      
      if (response.ok) {
        await loadCodes()
        setNote('')
      } else {
        alert('Failed to generate code')
      }
    } catch (error) {
      console.error('Error generating code:', error)
      alert('Error generating code')
    } finally {
      setLoading(false)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (!activeTenant) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <p className="text-amber-800">Please select a demo tenant first</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-800 rounded-full text-sm font-medium mb-4">
          Phase 28 — Demo Invite Codes
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Demo Invite Codes</h1>
        <p className="text-lg text-gray-600 mb-4">
          Generate short-lived demo invite codes for <strong>{activeTenant.name}</strong>
        </p>
        
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
          <p className="text-amber-800 font-medium">
            ⚠️ DEMO ACCESS ONLY — These codes unlock demo tenant access for sales walkthroughs. 
            NOT a paid account, NOT a signup, NO Stripe/payments.
          </p>
        </div>
      </div>

      {/* Generate Code Form */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-6 h-6 text-violet-600" />
          Generate New Code
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Uses
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expires In (days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Sales demo for Prospect XYZ"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={generateCode}
            disabled={loading}
            className="w-full px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-gray-400 font-semibold transition"
          >
            {loading ? 'Generating...' : 'Generate Code'}
          </button>
        </div>
      </div>

      {/* Codes List */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-6 h-6 text-violet-600" />
          Active Codes
        </h2>
        
        {codes.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No invite codes yet. Generate one above.
          </p>
        ) : (
          <div className="space-y-4">
            {codes.map((code) => {
              const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
              const isMaxed = code.current_uses >= code.max_uses
              const isActive = !isExpired && !isMaxed
              
              return (
                <div
                  key={code.id}
                  className={`p-4 rounded-lg border-2 ${
                    isActive 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <code className="text-2xl font-mono font-bold text-gray-900">
                        {code.code}
                      </code>
                      <button
                        onClick={() => copyCode(code.code)}
                        className="p-2 hover:bg-white rounded transition"
                        title="Copy code"
                      >
                        {copiedCode === code.code ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                    
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isActive
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {isActive ? 'Active' : isExpired ? 'Expired' : 'Max Uses Reached'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    <div>
                      <span className="font-medium">Uses:</span> {code.current_uses} / {code.max_uses}
                    </div>
                    <div>
                      <span className="font-medium">Expires:</span>{' '}
                      {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                  
                  {code.note && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Note:</span> {code.note}
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Created: {new Date(code.created_at).toLocaleString()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How to Use Invite Codes</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
          <li>Generate a code with desired max uses and expiry</li>
          <li>Share code with prospect (copy button above)</li>
          <li>Direct them to <code className="bg-blue-100 px-2 py-1 rounded">/demo/redeem</code> page</li>
          <li>They enter code → unlock demo tenant context</li>
          <li>Code tracks usage count automatically</li>
        </ol>
        
        <p className="mt-4 text-sm text-blue-900 font-medium">
          All codes are FIXTURES for local SQLite demo. Never invents PII. No payments, no signups.
        </p>
      </div>
    </div>
  )
}
