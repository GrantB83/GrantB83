'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export function ComposerTooltip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const hoverTimer = useRef<number | null>(null)

  const clearTimer = () => {
    if (hoverTimer.current != null) {
      window.clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }

  const showSoon = () => {
    clearTimer()
    hoverTimer.current = window.setTimeout(() => setOpen(true), 350)
  }

  const showNow = () => {
    clearTimer()
    setOpen(true)
  }

  const hide = () => {
    clearTimer()
    setOpen(false)
  }

  useEffect(() => () => clearTimer(), [])

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={showSoon}
      onMouseLeave={hide}
      onFocusCapture={showNow}
      onBlurCapture={hide}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-[90] mb-1 max-w-[28ch] -translate-x-1/2 rounded-md bg-[#0A3775] px-2.5 py-1.5 text-center text-[11px] font-medium leading-tight text-white"
        >
          {label}
        </span>
      )}
    </span>
  )
}
