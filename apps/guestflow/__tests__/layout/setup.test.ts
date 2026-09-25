import { describe, it, expect, beforeEach, afterEach } from 'vitest'

/**
 * Layout Test Infrastructure
 * 
 * Provides utilities for mocking viewport dimensions and testing layout calculations
 * for the GuestFlow inbox scroll improvements feature.
 */

describe('Layout Test Setup', () => {
  let originalInnerWidth: number
  let originalInnerHeight: number
  let originalVisualViewport: VisualViewport | null

  beforeEach(() => {
    // Store original viewport dimensions
    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight
    originalVisualViewport = window.visualViewport
  })

  afterEach(() => {
    // Restore original viewport dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: originalVisualViewport,
    })
  })

  it('can mock desktop viewport (1280x800)', () => {
    mockViewport(1280, 800)
    expect(window.innerWidth).toBe(1280)
    expect(window.innerHeight).toBe(800)
  })

  it('can mock mobile viewport (375x667)', () => {
    mockViewport(375, 667)
    expect(window.innerWidth).toBe(375)
    expect(window.innerHeight).toBe(667)
  })

  it('can mock keyboard inset via visual viewport', () => {
    mockViewport(375, 667)
    mockKeyboardInset(350)
    
    if (window.visualViewport) {
      expect(window.visualViewport.height).toBe(317) // 667 - 350
    }
  })
})

/**
 * Mock viewport dimensions for testing
 */
export function mockViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
}

/**
 * Mock keyboard inset by simulating visual viewport height reduction
 */
export function mockKeyboardInset(insetPx: number) {
  const viewportHeight = window.innerHeight - insetPx
  
  Object.defineProperty(window, 'visualViewport', {
    writable: true,
    configurable: true,
    value: {
      height: viewportHeight,
      width: window.innerWidth,
      scale: 1,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as VisualViewport,
  })
}

/**
 * Calculate shell height (viewport - chromeOffset - keyboardInset)
 */
export function calculateShellHeight(chromeOffset: number, keyboardInset: number): number {
  return window.innerHeight - chromeOffset - keyboardInset
}

/**
 * Calculate minimum message height (max of 240px or 35% of shell)
 */
export function calculateMinMessageHeight(shellHeight: number): number {
  return Math.max(240, Math.round(shellHeight * 0.35))
}

/**
 * Calculate maximum composer height (50% of thread column on desktop)
 */
export function calculateMaxComposerHeight(threadColumnHeight: number): number {
  return Math.round(threadColumnHeight * 0.50)
}
