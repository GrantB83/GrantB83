'use client'

import Link from 'next/link'
import { ArrowLeft, Save, Eye, EyeOff, Plus, AlertTriangle, Key, Lock } from 'lucide-react'
import { useState, useEffect } from 'react'

interface AccessCode {
  id: number
  property: string
  code_type: 'gate_pinpad' | 'lockbox' | 'wifi_network' | 'wifi_password'
  suite: string
  code_value: string
  code_value_hint?: string
  last_updated_at: string
  last_updated_by: string | null
}

interface AuditEntry {
  property: string
  code_type: string
  suite: string
  changed_at: string
  changed_by: string | null
  action: string
}

export default function AccessCodesManager() {
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revealedCodes, setRevealedCodes] = useState<Set<number>>(new Set())
  const [editingCode, setEditingCode] = useState<{
    id?: number
    property: string
    code_type: 'gate_pinpad' | 'lockbox' | 'wifi_network' | 'wifi_password'
    suite: string
    code: string
  } | null>(null)

  useEffect(() => {
    fetchCodes()
    fetchAuditLog()
  }, [])

  const fetchCodes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ops/access-codes')
      const data = await response.json()
      if (data.codes) {
        setCodes(data.codes)
      }
    } catch (err) {
      console.error('Failed to fetch codes:', err)
      setError('Failed to load access codes')
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditLog = async () => {
    try {
      const response = await fetch('/api/ops/access-codes/audit?days=90')
      const data = await response.json()
      if (data.logs) {
        setAuditLogs(data.logs)
      }
    } catch (err) {
      console.error('Failed to fetch audit log:', err)
    }
  }

  const handleSave = async () => {
    if (!editingCode) return

    setSaving(editingCode.id || -1)
    setError(null)

    try {
      const response = await fetch('/api/ops/access-codes/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: editingCode.property,
          code_type: editingCode.code_type,
          suite: editingCode.suite,
          code: editingCode.code,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchCodes()
        await fetchAuditLog()
        setEditingCode(null)
        setRevealedCodes(new Set())
      } else {
        setError(data.error || 'Failed to save code')
      }
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save code')
    } finally {
      setSaving(null)
    }
  }

  const toggleReveal = (id: number) => {
    setRevealedCodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const startEdit = (code: AccessCode) => {
    setEditingCode({
      id: code.id,
      property: code.property,
      code_type: code.code_type,
      suite: code.suite,
      code: '',
    })
    setError(null)
  }

  const startAddGate = (property: string) => {
    setEditingCode({
      property,
      code_type: 'gate_pinpad',
      suite: '',
      code: '',
    })
    setError(null)
  }

  const startAddLockbox = (property: string) => {
    setEditingCode({
      property,
      code_type: 'lockbox',
      suite: '',
      code: '',
    })
    setError(null)
  }

  const groupedCodes = codes.reduce((acc, code) => {
    if (!acc[code.property]) {
      acc[code.property] = { gates: [], lockboxes: [], wifiNetworks: [], wifiPasswords: [] }
    }
    if (code.code_type === 'gate_pinpad') {
      acc[code.property].gates.push(code)
    } else if (code.code_type === 'lockbox') {
      acc[code.property].lockboxes.push(code)
    } else if (code.code_type === 'wifi_network') {
      acc[code.property].wifiNetworks.push(code)
    } else if (code.code_type === 'wifi_password') {
      acc[code.property].wifiPasswords.push(code)
    }
    return acc
  }, {} as Record<string, { gates: AccessCode[]; lockboxes: AccessCode[]; wifiNetworks: AccessCode[]; wifiPasswords: AccessCode[] }>)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/ops"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Ops Hub
      </Link>

      <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">Security — Handle with care</h3>
            <p className="text-sm text-gray-700 mt-1">
              Access codes are shown masked by default. Click eye icon to reveal. Never share codes
              outside secure channels. All changes are logged.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Codes Management</h1>
        <p className="text-gray-600">
          Manage gate pinpad and lockbox codes for all properties. Changes take effect immediately.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          <p className="text-gray-600 mt-4">Loading codes...</p>
        </div>
      ) : (
        <>
          {/* Gate Codes Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Key className="w-6 h-6" />
              Gate Pinpads
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Cottage entrance = 278 Blue Crane · Main house entrance = 279 Blue Crane
            </p>
            
            <div className="space-y-4">
              {['cottage', 'main-house'].map(property => {
                const propertyData = groupedCodes[property]
                const gateCode = propertyData?.gates[0]

                return (
                  <div key={property} className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 capitalize">
                      {property.replace('-', ' ')}
                    </h3>
                    
                    {gateCode ? (
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-sm text-gray-600 mb-1">Gate Code</div>
                          {editingCode?.id === gateCode.id ? (
                            <input
                              type="text"
                              value={editingCode.code}
                              onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              placeholder="Enter new code"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-lg">
                                {revealedCodes.has(gateCode.id) 
                                  ? gateCode.code_value_hint || '****'
                                  : '****'}
                              </span>
                              <button
                                onClick={() => toggleReveal(gateCode.id)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                {revealedCodes.has(gateCode.id) ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Last updated: {new Date(gateCode.last_updated_at).toLocaleString()}
                            {gateCode.last_updated_by && ` by ${gateCode.last_updated_by}`}
                          </div>
                        </div>
                        
                        {editingCode?.id === gateCode.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={saving === gateCode.id || !editingCode.code.trim()}
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              {saving === gateCode.id ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingCode(null)}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(gateCode)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        {editingCode?.property === property && editingCode.code_type === 'gate_pinpad' ? (
                          <div className="space-y-4">
                            <input
                              type="text"
                              value={editingCode.code}
                              onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              placeholder="Enter gate code"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleSave}
                                disabled={saving === -1 || !editingCode.code.trim()}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                {saving === -1 ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingCode(null)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startAddGate(property)}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                          >
                            <Plus className="w-4 h-4" />
                            Add Gate Code
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lockbox Codes Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6" />
              Lockbox Codes
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Suite-specific lockbox codes. Suite field is free-text to match booking data.
            </p>
            
            <div className="space-y-6">
              {['cottage', 'main-house'].map(property => {
                const propertyData = groupedCodes[property]
                const lockboxes = propertyData?.lockboxes || []

                return (
                  <div key={property} className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 capitalize">
                      {property.replace('-', ' ')}
                    </h3>
                    
                    <div className="space-y-4">
                      {lockboxes.map(lockbox => (
                        <div key={lockbox.id} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="flex-1">
                            <div className="text-sm text-gray-600 mb-1">
                              Suite: <span className="font-semibold">{lockbox.suite}</span>
                            </div>
                            {editingCode?.id === lockbox.id ? (
                              <input
                                type="text"
                                value={editingCode.code}
                                onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="Enter new code"
                                autoFocus
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-lg">
                                  {revealedCodes.has(lockbox.id) 
                                    ? lockbox.code_value_hint || '****'
                                    : '****'}
                                </span>
                                <button
                                  onClick={() => toggleReveal(lockbox.id)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  {revealedCodes.has(lockbox.id) ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              Last updated: {new Date(lockbox.last_updated_at).toLocaleString()}
                              {lockbox.last_updated_by && ` by ${lockbox.last_updated_by}`}
                            </div>
                          </div>
                          
                          {editingCode?.id === lockbox.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={handleSave}
                                disabled={saving === lockbox.id || !editingCode.code.trim()}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                {saving === lockbox.id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingCode(null)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(lockbox)}
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {editingCode?.property === property && editingCode.code_type === 'lockbox' && !editingCode.id ? (
                        <div className="space-y-4 pt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Suite Name
                            </label>
                            <input
                              type="text"
                              value={editingCode.suite}
                              onChange={(e) => setEditingCode({ ...editingCode, suite: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              placeholder="e.g., Suite 1, Master Bedroom, Garden Cottage"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Lockbox Code
                            </label>
                            <input
                              type="text"
                              value={editingCode.code}
                              onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              placeholder="Enter lockbox code"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={saving === -1 || !editingCode.code.trim() || !editingCode.suite.trim()}
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              {saving === -1 ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingCode(null)}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        !editingCode && (
                          <button
                            onClick={() => startAddLockbox(property)}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                          >
                            <Plus className="w-4 h-4" />
                            Add Lockbox Code
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* WiFi Credentials Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              WiFi Credentials
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              WiFi network name (SSID) and password per property. Property-wide, not suite-specific.
            </p>
            
            <div className="space-y-6">
              {['cottage', 'main-house'].map(property => {
                const propertyData = groupedCodes[property]
                const wifiNetwork = propertyData?.wifiNetworks[0]
                const wifiPassword = propertyData?.wifiPasswords[0]

                return (
                  <div key={property} className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 capitalize">
                      {property.replace('-', ' ')} WiFi
                    </h3>
                    
                    <div className="space-y-4">
                      {/* WiFi Network Name */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Network Name (SSID)</div>
                        {wifiNetwork ? (
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              {editingCode?.id === wifiNetwork.id ? (
                                <input
                                  type="text"
                                  value={editingCode.code}
                                  onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                  placeholder="Enter WiFi network name"
                                  maxLength={32}
                                  autoFocus
                                />
                              ) : (
                                <div>
                                  <span className="font-mono text-lg">
                                    {wifiNetwork.code_value_hint || '****'}
                                  </span>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Last updated: {new Date(wifiNetwork.last_updated_at).toLocaleString()}
                                    {wifiNetwork.last_updated_by && ` by ${wifiNetwork.last_updated_by}`}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {editingCode?.id === wifiNetwork.id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSave}
                                  disabled={saving === wifiNetwork.id || !editingCode.code.trim()}
                                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                  <Save className="w-4 h-4" />
                                  {saving === wifiNetwork.id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => setEditingCode(null)}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingCode({
                                  id: wifiNetwork.id,
                                  property: wifiNetwork.property,
                                  code_type: 'wifi_network',
                                  suite: '',
                                  code: '',
                                })}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        ) : (
                          <div>
                            {editingCode?.property === property && editingCode.code_type === 'wifi_network' ? (
                              <div className="space-y-4">
                                <input
                                  type="text"
                                  value={editingCode.code}
                                  onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                  placeholder="Enter WiFi network name"
                                  maxLength={32}
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSave}
                                    disabled={saving === -1 || !editingCode.code.trim()}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                                  >
                                    <Save className="w-4 h-4" />
                                    {saving === -1 ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingCode(null)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingCode({
                                  property,
                                  code_type: 'wifi_network',
                                  suite: '',
                                  code: '',
                                })}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                              >
                                <Plus className="w-4 h-4" />
                                Add Network Name
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* WiFi Password */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">WiFi Password</div>
                        {wifiPassword ? (
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              {editingCode?.id === wifiPassword.id ? (
                                <input
                                  type="text"
                                  value={editingCode.code}
                                  onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                  placeholder="Enter WiFi password"
                                  minLength={8}
                                  maxLength={63}
                                  autoFocus
                                />
                              ) : (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-lg">
                                      {revealedCodes.has(wifiPassword.id) 
                                        ? wifiPassword.code_value_hint || '****'
                                        : '****'}
                                    </span>
                                    <button
                                      onClick={() => toggleReveal(wifiPassword.id)}
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      {revealedCodes.has(wifiPassword.id) ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Last updated: {new Date(wifiPassword.last_updated_at).toLocaleString()}
                                    {wifiPassword.last_updated_by && ` by ${wifiPassword.last_updated_by}`}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {editingCode?.id === wifiPassword.id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSave}
                                  disabled={saving === wifiPassword.id || !editingCode.code.trim() || editingCode.code.length < 8}
                                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                  <Save className="w-4 h-4" />
                                  {saving === wifiPassword.id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => setEditingCode(null)}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingCode({
                                  id: wifiPassword.id,
                                  property: wifiPassword.property,
                                  code_type: 'wifi_password',
                                  suite: '',
                                  code: '',
                                })}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        ) : (
                          <div>
                            {editingCode?.property === property && editingCode.code_type === 'wifi_password' ? (
                              <div className="space-y-4">
                                <input
                                  type="password"
                                  value={editingCode.code}
                                  onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                  placeholder="Enter WiFi password (min 8 characters)"
                                  minLength={8}
                                  maxLength={63}
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSave}
                                    disabled={saving === -1 || !editingCode.code.trim() || editingCode.code.length < 8}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                                  >
                                    <Save className="w-4 h-4" />
                                    {saving === -1 ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingCode(null)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingCode({
                                  property,
                                  code_type: 'wifi_password',
                                  suite: '',
                                  code: '',
                                })}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                              >
                                <Plus className="w-4 h-4" />
                                Add Password
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Audit Log */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Change History (Last 90 days)</h2>
            <p className="text-sm text-gray-600 mb-4">
              Audit log shows metadata only. Actual code values are never stored in history.
            </p>
            
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {auditLogs.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Suite
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Changed At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Changed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {auditLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {log.property.replace('-', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.code_type === 'gate_pinpad' ? 'Gate' : 
                           log.code_type === 'lockbox' ? 'Lockbox' :
                           log.code_type === 'wifi_network' ? 'WiFi Network' :
                           log.code_type === 'wifi_password' ? 'WiFi Password' : log.code_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.suite || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(log.changed_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {log.changed_by || 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No changes recorded in the last 90 days
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
