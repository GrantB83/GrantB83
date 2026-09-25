'use client'

import { useEffect, useState } from 'react'
import type { InboxBreakpoint } from './inbox-types'

export function useInboxBreakpoint(): { breakpoint: InboxBreakpoint; ready: boolean } {
  const [breakpoint, setBreakpoint] = useState<InboxBreakpoint>('desktop')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const phoneQuery = window.matchMedia('(max-width: 767px)')
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1199px)')

    const compute = () => {
      if (phoneQuery.matches) setBreakpoint('phone')
      else if (tabletQuery.matches) setBreakpoint('tablet')
      else setBreakpoint('desktop')
      setReady(true)
    }

    compute()
    phoneQuery.addEventListener('change', compute)
    tabletQuery.addEventListener('change', compute)
    return () => {
      phoneQuery.removeEventListener('change', compute)
      tabletQuery.removeEventListener('change', compute)
    }
  }, [])

  return { breakpoint, ready }
}
