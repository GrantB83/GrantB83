'use client'

import { useState, useEffect } from 'react'
import { Gift, Plus, X, AlertCircle, Calendar, Users } from 'lucide-react'
import DemoAuthGuard from '@/components/DemoAuthGuard'
import { useTenant } from '@/components/TenantContext'

interface InviteCode {
  id: number
  code: string
  max_uses: number
  uses_count: number
  expires_at: string | null
  note: string | null
  created_at: string
}

function InviteCodesContent() {
  const { activeTenant } = useTenant()
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  // Form state
  const [newCode, setNewCode] = useState('')
  const [maxUses, setMaxUses] = useState('10')
  const [expiresAt, setExpiresAt] = useState('')
  const [note, setNote] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (activeTenant) {
      fetchCodes()
    }
  }, [activeTenant])

  const fetchCodes = async () => {
    if (!activeTenant) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invite-codes?tenant_id=${activeTenant.id}`)
      const data = await response.json()
      setCodes(data.codes || [])
    } catch (error) {
      console.error('Error fetching invite codes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newCode.trim()) {
      setCreateError('Code is required')
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo2026'
        },
        body: JSON.stringify({
          tenantId: activeTenant?.id,
          code: newCode.trim().toUpperCase(),
          maxUses: parseInt(maxUses) || 1,
          expiresAt: expiresAt || null,
          note: note.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invite code')
      }

      // Reset form
      setNewCode('')
      setMaxUses('10')
      setExpiresAt('')
      setNote('')
      setShowCreateForm(false)
      
      // Refresh list
      fetchCodes()
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create invite code')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-4">
          <Gift className="w-4 h-4" />
          DEMO ACCESS ONLY
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Invite Codes Management
        </h1>
        <p className="text-xl text-gray-600">
          Create and manage demo invite codes for sales walkthroughs and leave-behinds.
        </p>
      </div>

      {/* Active Tenant Info */}
      {activeTenant && (
        <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Active Tenant:</span> {activeTenant.name}
          </p>
        </div>
      )}

      {/* Create Button */}
      {!showCreateForm && (
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            <Plus className="w-5 h-5" />
            Create Invite Code
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="mb-8 bg-white rounded-xl border-2 border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Create New Invite Code</h3>
            <button
              onClick={() => {
                setShowCreateForm(false)
                setCreateError(null)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-2">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. DEMO2026, SALES-OCT"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
              />
            </div>

            <div>
              <label htmlFor="maxUses" className="block text-sm font-semibold text-gray-700 mb-2">
                Max Uses <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="maxUses"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                min="1"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="expiresAt" className="block text-sm font-semibold text-gray-700 mb-2">
                Expires At <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="date"
                id="expiresAt"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="note" className="block text-sm font-semibold text-gray-700 mb-2">
                Note <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. October sales demos, Partner walkthrough"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {createError && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-semibold">Error</p>
                    <p>{createError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleCreate}
                disabled={isCreating || !newCode.trim()}
                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
              >
                {isCreating ? 'Creating...' : 'Create Code'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setCreateError(null)
                }}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Codes List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading invite codes...</p>
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
          <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 mb-2">No invite codes yet</p>
          <p className="text-gray-600 mb-4">Create your first invite code to start tracking demo interest</p>
        </div>
      ) : (
        <div className="space-y-4">
          {codes.map((code) => {
            const isExpired = code.expires_at ? new Date(code.expires_at) < new Date() : false
            const isMaxedOut = code.uses_count >= code.max_uses

            return (
              <div
                key={code.id}
                className={`bg-white rounded-xl border-2 p-6 ${
                  isExpired || isMaxedOut ? 'border-gray-300 opacity-75' : 'border-purple-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900 font-mono">{code.code}</h3>
                      {isExpired && (
                        <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-700 rounded-full">
                          EXPIRED
                        </span>
                      )}
                      {isMaxedOut && !isExpired && (
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                          MAX USES REACHED
                        </span>
                      )}
                    </div>
                    {code.note && (
                      <p className="text-sm text-gray-600">{code.note}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Uses</p>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <p className="text-lg font-bold text-gray-900">
                        {code.uses_count} / {code.max_uses}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Expires</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <p className="text-sm font-medium text-gray-900">
                        {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Created</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(code.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Code ID</p>
                    <p className="text-sm font-mono text-gray-600">#{code.id}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function InviteCodesPage() {
  return (
    <DemoAuthGuard>
      <InviteCodesContent />
    </DemoAuthGuard>
  )
}
