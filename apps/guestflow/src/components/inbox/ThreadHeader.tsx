'use client'

import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

interface ThreadHeaderProps {
  /** Guest display name */
  guestName: string

  /** Accommodation suite name */
  suiteName: string | null

  /** Check-in date */
  checkIn: string | null

  /** Check-out date */
  checkOut: string | null

  /** Nightsbridge booking reference (format: NB-XXXX) */
  nbRef: string | null

  /** Last communication channel used */
  lastChannel: string | null

  /** Optional badge (e.g., "Window closed") */
  badge?: ReactNode

  /** Whether to show Details button */
  showDetailsButton?: boolean

  /** Callback when Details button clicked */
  onDetailsClick?: () => void

  /** Whether to show Back button (phone only) */
  showBack?: boolean

  /** Callback when Back button clicked */
  onBack?: () => void
}

function formatDateRange(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return ''
  try {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    return `${format(start, 'MMM d')} → ${format(end, 'MMM d, yyyy')}`
  } catch {
    return `${checkIn} → ${checkOut}`
  }
}

export function ThreadHeader({
  guestName,
  suiteName,
  checkIn,
  checkOut,
  nbRef,
  lastChannel,
  badge,
  showDetailsButton = false,
  onDetailsClick,
  showBack = false,
  onBack,
}: ThreadHeaderProps) {
  const dateRange = formatDateRange(checkIn, checkOut)
  const facts = [suiteName, dateRange, nbRef].filter(Boolean).join(' · ')

  return (
    <header className="inbox-thread-header shrink-0 bg-white border-b px-3 py-2 sm:px-4 sm:py-3">
      <div className="flex items-start gap-2">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="inbox-tap shrink-0"
            aria-label="Back to inbox list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 inbox-wrap">
                {guestName}
              </h2>
              {facts && (
                <p className="text-sm sm:text-base text-slate-600 inbox-wrap mt-0.5">
                  {facts}
                </p>
              )}
              {lastChannel && (
                <p className="text-sm text-slate-500 mt-0.5 inbox-wrap">
                  Last: {lastChannel}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {badge && (
                <div data-inbox-slot="header-badge" className="inbox-slot">
                  {badge}
                </div>
              )}
              {showDetailsButton && (
                <button
                  type="button"
                  onClick={onDetailsClick}
                  className="text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded px-2 py-1 hover:bg-slate-50"
                  aria-label="View booking and contact details"
                >
                  Details
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
