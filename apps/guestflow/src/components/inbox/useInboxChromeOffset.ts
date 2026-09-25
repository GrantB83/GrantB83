'use client'

import { useEffect, useState } from 'react'

export function measureOpsChromeOffset(doc: Pick<Document, 'querySelector'>): number {
  const chrome = doc.querySelector('[data-ops-chrome]')
  if (chrome) {
    return Math.max(0, Math.round(chrome.getBoundingClientRect().height))
  }

  const nav = doc.querySelector('nav')
  const banner = doc.querySelector('[data-outbound-banner]')
  const bottoms = [nav, banner]
    .filter((node): node is Element => Boolean(node))
    .map((node) => node.getBoundingClientRect().bottom)
  return Math.max(0, Math.round(Math.max(0, ...bottoms)))
}

export function useInboxChromeOffset(): number {
  const [offset, setOffset] = useState(88)

  useEffect(() => {
    const measure = () => setOffset(measureOpsChromeOffset(document))

    measure()
    window.addEventListener('resize', measure)
    const observer = new MutationObserver(measure)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    const chrome = document.querySelector('[data-ops-chrome]')
    const resizeObserver = chrome ? new ResizeObserver(measure) : null
    if (chrome && resizeObserver) resizeObserver.observe(chrome)
    return () => {
      window.removeEventListener('resize', measure)
      observer.disconnect()
      resizeObserver?.disconnect()
    }
  }, [])

  return offset
}
