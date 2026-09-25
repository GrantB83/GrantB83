import { describe, it, expect } from 'vitest'
import { mockViewport, calculateShellHeight, calculateMinMessageHeight } from './setup.test'

/**
 * US1: Desktop Message Transcript Readability
 * 
 * Tests that message transcript area meets minimum height requirements:
 * - ≥240px absolute minimum
 * - ≥35% of shell height
 * - Whichever is larger
 */

describe('US1: Message Transcript Minimum Height', () => {
  it('calculates minimum message height as max(240px, 35% of shell)', () => {
    // Scenario 1: 1280x800 viewport with 56px chrome offset, no keyboard
    mockViewport(1280, 800)
    const shellHeight1 = calculateShellHeight(56, 0)
    const minHeight1 = calculateMinMessageHeight(shellHeight1)
    
    // Shell height: 800 - 56 - 0 = 744px
    // 35% of 744 = 260.4px, rounded = 260px
    // max(240, 260) = 260px
    expect(shellHeight1).toBe(744)
    expect(minHeight1).toBe(260)
    expect(minHeight1).toBeGreaterThanOrEqual(240)
    expect(minHeight1).toBeGreaterThanOrEqual(shellHeight1 * 0.35)
  })

  it('uses 240px minimum when 35% of shell is less than 240px', () => {
    // Scenario 2: Short viewport where 35% < 240px
    mockViewport(1024, 600)
    const shellHeight2 = calculateShellHeight(56, 0)
    const minHeight2 = calculateMinMessageHeight(shellHeight2)
    
    // Shell height: 600 - 56 - 0 = 544px
    // 35% of 544 = 190.4px, rounded = 190px
    // max(240, 190) = 240px
    expect(shellHeight2).toBe(544)
    expect(minHeight2).toBe(240)
    expect(minHeight2).toBeGreaterThanOrEqual(240)
  })

  it('uses 35% of shell when it exceeds 240px', () => {
    // Scenario 3: Tall viewport where 35% > 240px
    mockViewport(1920, 1080)
    const shellHeight3 = calculateShellHeight(56, 0)
    const minHeight3 = calculateMinMessageHeight(shellHeight3)
    
    // Shell height: 1080 - 56 - 0 = 1024px
    // 35% of 1024 = 358.4px, rounded = 358px
    // max(240, 358) = 358px
    expect(shellHeight3).toBe(1024)
    expect(minHeight3).toBe(358)
    expect(minHeight3).toBeGreaterThanOrEqual(240)
    expect(minHeight3).toBeGreaterThanOrEqual(shellHeight3 * 0.35)
  })

  it('accounts for keyboard inset in shell height calculation', () => {
    // Scenario 4: Mobile with keyboard visible
    mockViewport(375, 667)
    const keyboardInset = 350
    const shellHeight4 = calculateShellHeight(56, keyboardInset)
    const minHeight4 = calculateMinMessageHeight(shellHeight4)
    
    // Shell height: 667 - 56 - 350 = 261px
    // 35% of 261 = 91.35px, rounded = 91px
    // max(240, 91) = 240px (240px minimum wins)
    expect(shellHeight4).toBe(261)
    expect(minHeight4).toBe(240)
    expect(minHeight4).toBeGreaterThanOrEqual(240)
  })

  it('reference viewport 1280x800 meets acceptance criteria', () => {
    // Acceptance: On ~1280×800 desktop viewport, message transcript ≥240px or ≥35% shell height
    mockViewport(1280, 800)
    const chromeOffset = 56 // typical operations nav height
    const keyboardInset = 0 // desktop, no keyboard
    const shellHeight = calculateShellHeight(chromeOffset, keyboardInset)
    const minMessageHeight = calculateMinMessageHeight(shellHeight)
    
    // Verify acceptance criteria
    expect(minMessageHeight).toBeGreaterThanOrEqual(240)
    expect(minMessageHeight).toBeGreaterThanOrEqual(Math.round(shellHeight * 0.35))
    
    // On 1280x800 with typical chrome, we expect ~260px minimum
    expect(minMessageHeight).toBeGreaterThanOrEqual(260)
  })
})

describe('US1: Shell Height Calculation', () => {
  it('subtracts chrome offset and keyboard inset from viewport height', () => {
    mockViewport(1280, 800)
    const shellHeight = calculateShellHeight(56, 100)
    expect(shellHeight).toBe(644) // 800 - 56 - 100
  })

  it('handles zero offsets', () => {
    mockViewport(1280, 800)
    const shellHeight = calculateShellHeight(0, 0)
    expect(shellHeight).toBe(800)
  })

  it('handles large offsets', () => {
    mockViewport(375, 667)
    const shellHeight = calculateShellHeight(100, 400)
    expect(shellHeight).toBe(167) // 667 - 100 - 400
  })
})
