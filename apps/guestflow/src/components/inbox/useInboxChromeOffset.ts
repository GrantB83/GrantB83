'use client'

import { useEffect, useState } from 'react'

export function useInboxChromeOffset(): number {
  const [offset, setOffset] = useState(56)

  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector('nav')
      const banner = document.querySelector('[data-outbound-banner]')
      const bottoms = [nav, banner]
        .filter((node): node is Element => Boolean(node))
        .map((node) => node.getBoundingClientRect().bottom)
      setOffset(Math.max(0, Math.round(Math.max(0, ...bottoms))))
    }

    measure()
    window.addEventListener('resize', measure)
    const observer = new MutationObserver(measure)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => {
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [])

  return offset
}
