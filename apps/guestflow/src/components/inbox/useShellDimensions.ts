'use client'

import { useMemo } from 'react'

/**
 * Calculate shell dimensions and layout constraints
 * for inbox scroll improvements (US1, US4)
 * 
 * @param chromeOffset - Top offset for operations nav (pixels)
 * @param keyboardInsetPx - Bottom inset for mobile keyboard (pixels)
 * @param viewportHeight - Window inner height (default: window.innerHeight)
 * @returns Shell dimensions and min/max height constraints
 */
export function useShellDimensions(
  chromeOffset: number,
  keyboardInsetPx: number,
  viewportHeight?: number
) {
  return useMemo(() => {
    const vh = viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 800)
    
    // Shell height = viewport - chrome offset (top) - keyboard inset (bottom)
    const shellHeight = vh - chromeOffset - keyboardInsetPx
    
    // Min message height: max(240px, 35% of shell height)
    // Per US1 acceptance criteria
    const minMessageHeight = Math.max(240, Math.round(shellHeight * 0.35))
    
    // Max composer height: 50% of thread column on desktop
    // Per US4 acceptance criteria
    const maxComposerHeight = Math.round(shellHeight * 0.50)
    
    return {
      shellHeight,
      minMessageHeight,
      maxComposerHeight,
    }
  }, [chromeOffset, keyboardInsetPx, viewportHeight])
}

/**
 * Type for shell dimensions returned by useShellDimensions hook
 */
export interface ShellDimensions {
  /** Available shell height (viewport - chrome - keyboard inset) */
  shellHeight: number
  /** Minimum height for message transcript area (≥240px or ≥35% shell) */
  minMessageHeight: number
  /** Maximum height for composer on desktop (50% of shell) */
  maxComposerHeight: number
}
