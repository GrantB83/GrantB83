'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function StaffChrome({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const apply = () => {
      const height = Math.max(0, Math.round(el.getBoundingClientRect().height))
      document.documentElement.style.setProperty('--ops-chrome-height', `${height}px`)
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    window.addEventListener('resize', apply)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])

  return (
    <div ref={ref} data-ops-chrome className="ops-chrome">
      {children}
    </div>
  )
}
