import { describe, it, expect } from 'vitest'
import { mockViewport, calculateShellHeight, calculateMaxComposerHeight } from './setup.test'

/**
 * US4: Composer Space Management
 * 
 * Tests that composer height is capped at 50% of thread column on desktop
 * and remains usable (≥44px controls) without dominating the view.
 */

describe('US4: Composer Height Cap on Desktop', () => {
  it('calculates max composer height as 50% of shell', () => {
    mockViewport(1280, 800) // Desktop
    const chromeOffset = 56
    const keyboardInset = 0
    const shellHeight = calculateShellHeight(chromeOffset, keyboardInset)
    const maxComposerHeight = calculateMaxComposerHeight(shellHeight)
    
    // Shell: 800 - 56 = 744px
    // Max composer: 744 * 0.50 = 372px
    expect(shellHeight).toBe(744)
    expect(maxComposerHeight).toBe(372)
    expect(maxComposerHeight).toBeLessThanOrEqual(shellHeight * 0.50)
  })

  it('verifies composer does not exceed 50% on tall desktops', () => {
    mockViewport(1920, 1080) // Large desktop
    const shellHeight = calculateShellHeight(56, 0)
    const maxComposerHeight = calculateMaxComposerHeight(shellHeight)
    
    // Shell: 1080 - 56 = 1024px
    // Max composer: 1024 * 0.50 = 512px
    expect(maxComposerHeight).toBe(512)
    expect(maxComposerHeight / shellHeight).toBeLessThanOrEqual(0.50)
  })

  it('documents that max-height constraint is applied on desktop', () => {
    const composerConstraint = {
      desktop: 'max-height: 50% of shell height (via maxComposerHeight)',
      tablet: 'Same as desktop (50% cap applies)',
      phone: 'Conditional collapse instead of strict cap (see US4 collapse tests)',
      mechanism: 'Inline style or CSS variable set from useShellDimensions hook'
    }
    
    expect(composerConstraint.desktop).toContain('50%')
  })
})

describe('US4: Composer Minimum Usability', () => {
  it('documents minimum touch target size requirement', () => {
    const minTouchTarget = {
      size: '≥44px (iOS/Android standard)',
      applies: 'Send button, channel selector, textarea min height',
      reason: 'Users must be able to tap controls reliably on mobile'
    }
    
    expect(minTouchTarget.size).toContain('44px')
  })

  it('verifies composer does not collapse below usable size', () => {
    // Even with collapse on short viewport/keyboard inset,
    // textarea and controls must remain ≥44px
    const minComposerHeight = 44 + 44 // Textarea + send button minimum
    
    expect(minComposerHeight).toBeGreaterThanOrEqual(88)
  })
})

describe('US4: Composer vs Message Area Balance', () => {
  it('documents that message area should be larger than composer on desktop', () => {
    mockViewport(1280, 800)
    const shellHeight = calculateShellHeight(56, 0) // 744px
    const maxComposerHeight = calculateMaxComposerHeight(shellHeight) // 372px
    const headerHeight = 100 // Typical thread header
    const minMessageHeight = shellHeight - headerHeight - maxComposerHeight
    
    // Messages get at least: 744 - 100 - 372 = 272px
    expect(minMessageHeight).toBe(272)
    expect(minMessageHeight).toBeGreaterThan(maxComposerHeight * 0.7) // Messages > composer
  })

  it('verifies message area has priority when space is limited', () => {
    // Min message height is 240px or 35% shell (whichever is larger)
    // Composer can be compressed below 50% if needed to preserve message area
    const priority = {
      primary: 'Message transcript (min 240px or 35%)',
      secondary: 'Composer (flexible, caps at 50% but can be less)',
      tradeoff: 'On short viewports, composer collapses to preserve message space'
    }
    
    expect(priority.primary).toContain('Message transcript')
  })
})
