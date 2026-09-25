'use client'

import type { ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { InboxBreakpoint, InboxPane } from './inbox-types'

interface InboxLayoutShellProps {
  breakpoint: InboxBreakpoint
  pane: InboxPane
  list: ReactNode
  thread: ReactNode
  listCollapsed: boolean
  onToggleList: () => void
  chromeOffset: number
  keyboardInsetPx: number
}

export function InboxLayoutShell({
  breakpoint,
  pane,
  list,
  thread,
  listCollapsed,
  onToggleList,
  chromeOffset,
  keyboardInsetPx,
}: InboxLayoutShellProps) {
  const phone = breakpoint === 'phone'
  const tablet = breakpoint === 'tablet'
  const showList = !phone || pane === 'list'
  const showThread = !phone || pane === 'thread'

  return (
    <div
      data-inbox-shell
      data-inbox-breakpoint={breakpoint}
      data-inbox-visible-pane={phone ? pane : 'both'}
      className="inbox-shell bg-slate-100"
      style={{
        top: chromeOffset,
        bottom: keyboardInsetPx,
      }}
    >
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <aside
          data-inbox-pane="list"
          aria-hidden={!showList}
          className={`bg-white border-r flex flex-col min-h-0 overflow-hidden ${
            phone
              ? `absolute inset-0 z-10 w-full ${showList ? '' : 'invisible pointer-events-none'}`
              : tablet
                ? `${listCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-72'} shrink-0`
                : 'w-full max-w-md shrink-0'
          }`}
        >
          {list}
        </aside>

        {tablet && (
          <button
            type="button"
            onClick={onToggleList}
            className="shrink-0 min-h-[44px] min-w-[44px] border-r bg-white text-slate-700 hover:bg-slate-50"
            aria-label={listCollapsed ? 'Show thread list' : 'Hide thread list'}
          >
            {listCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 mx-auto" />
            ) : (
              <PanelLeftClose className="w-5 h-5 mx-auto" />
            )}
          </button>
        )}

        <section
          data-inbox-pane="thread"
          aria-hidden={!showThread}
          className={`flex-1 flex flex-col min-w-0 min-h-0 bg-slate-100 ${
            phone
              ? `absolute inset-0 z-20 w-full ${showThread ? '' : 'invisible pointer-events-none'}`
              : ''
          }`}
        >
          {thread}
        </section>
      </div>
    </div>
  )
}
