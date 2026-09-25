'use client'

import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

interface ThreadLayoutShellProps {
  showBack: boolean
  onBack: () => void
  title: ReactNode
  facts: ReactNode
  channelLine: ReactNode
  headerBadgeSlot?: ReactNode
  headerActionsSlot?: ReactNode
  extraHeader?: ReactNode
  messages: ReactNode
  composer: ReactNode
  /** Minimum height for message transcript area (US1: ≥240px or ≥35% shell) */
  minMessageHeight?: number
  /** Maximum height for composer on desktop (US4: ≤50% shell) */
  maxComposerHeight?: number
}

export function ThreadLayoutShell({
  showBack,
  onBack,
  title,
  facts,
  channelLine,
  headerBadgeSlot,
  headerActionsSlot,
  extraHeader,
  messages,
  composer,
  minMessageHeight,
  maxComposerHeight,
}: ThreadLayoutShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="inbox-thread-header shrink-0 bg-white border-b px-3 py-2 sm:px-5 sm:py-4">
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
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 inbox-wrap">{title}</h2>
                <p className="text-base text-slate-600 inbox-wrap">{facts}</p>
                <p className="text-base text-slate-500 mt-1 inbox-wrap">{channelLine}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div data-inbox-slot="header-badge" className="inbox-slot">
                  {headerBadgeSlot}
                </div>
                <div data-inbox-slot="header-actions" className="inbox-slot">
                  {headerActionsSlot}
                </div>
              </div>
            </div>
            {extraHeader}
          </div>
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 space-y-3 min-h-0"
        style={minMessageHeight ? { minHeight: `${minMessageHeight}px` } : undefined}
      >
        {messages}
      </div>

      <footer
        data-inbox-composer
        className="inbox-composer shrink-0 bg-white border-t p-3 sm:p-4 space-y-2 sm:space-y-3"
        style={maxComposerHeight ? { maxHeight: `${maxComposerHeight}px`, overflowY: 'auto' } : undefined}
      >
        {composer}
      </footer>
    </div>
  )
}

export function ThreadBubbleStatusSlot({ children }: { children?: ReactNode }) {
  return (
    <div data-inbox-slot="bubble-status" className="inbox-slot">
      {children}
    </div>
  )
}
