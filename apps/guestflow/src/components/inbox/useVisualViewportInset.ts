'use client'

import { useEffect, useState } from 'react'

const SIMULATED_KEYBOARD_PX = 280

export function useVisualViewportInset(simulateKeyboard: boolean): number {
  const [inset, setInset] = useState(simulateKeyboard ? SIMULATED_KEYBOARD_PX : 0)

  useEffect(() => {
    const apply = (value: number) => {
      const next = Math.max(0, Math.round(value))
      setInset(next)
      document.documentElement.style.setProperty('--inbox-keyboard-inset', `${next}px`)
    }

    if (simulateKeyboard) {
      apply(SIMULATED_KEYBOARD_PX)
      return () => {
        document.documentElement.style.removeProperty('--inbox-keyboard-inset')
      }
    }

    const viewport = window.visualViewport
    if (!viewport) {
      apply(0)
      return
    }

    const update = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop
      apply(covered)
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      document.documentElement.style.removeProperty('--inbox-keyboard-inset')
    }
  }, [simulateKeyboard])

  return inset
}
