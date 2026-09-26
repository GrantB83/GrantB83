'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { InboxBreakpoint } from './inbox-types'

interface ThreadHeaderDetailsProps {
  /** Whether the sheet is visible */
  isOpen: boolean

  /** Callback when sheet should close */
  onClose: () => void

  /** Thread ID for save operations */
  threadId: number

  /** Current guest phone value */
  initialPhone?: string

  /** Current guest email value */
  initialEmail?: string

  /** Callback when contact saved successfully */
  onSaved?: () => void

  /** Breakpoint for responsive layout */
  breakpoint: InboxBreakpoint
}

export function ThreadHeaderDetails({
  isOpen,
  onClose,
  threadId,
  initialPhone = '',
  initialEmail = '',
  onSaved,
  breakpoint,
}: ThreadHeaderDetailsProps) {
  const [phone, setPhone] = useState(initialPhone)
  const [email, setEmail] = useState(initialEmail)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setPhone(initialPhone)
      setEmail(initialEmail)
      setError(null)
    }
  }, [isOpen, initialPhone, initialEmail])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const hasChanges = phone !== initialPhone || email !== initialEmail

  const isValidEmail = (value: string): boolean => {
    if (!value) return true // optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const canSave = hasChanges && isValidEmail(email) && !isSaving

  const handleSave = async () => {
    if (!canSave) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/umi/threads/${threadId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone || null,
          email: email || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save contact')
      }

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const isPhone = breakpoint === 'phone'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet/Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-header"
        className={`fixed z-50 bg-white ${
          isPhone
            ? 'bottom-0 left-0 right-0 rounded-t-xl max-h-[90vh] overflow-y-auto'
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto'
        }`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <h2
              id="details-header"
              className="text-lg font-semibold text-slate-900"
            >
              Booking & Contact Details
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="guest-phone"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Guest phone
              </label>
              <input
                id="guest-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label
                htmlFor="guest-email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Guest email
              </label>
              <input
                id="guest-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  email && !isValidEmail(email)
                    ? 'border-red-500'
                    : 'border-slate-300'
                }`}
                placeholder="Optional"
              />
              {email && !isValidEmail(email) && (
                <p className="text-sm text-red-600 mt-1">
                  Please enter a valid email address
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-700 rounded px-4 py-2 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 bg-[#0A3775] text-white rounded px-4 py-2 hover:bg-[#082a5a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
