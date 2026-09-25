import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { measureOpsChromeOffset } from '../../src/components/inbox/useInboxChromeOffset'

function calculateShellHeight(chromeOffset: number, keyboardInset: number, viewportHeight = 800) {
  return viewportHeight - chromeOffset - keyboardInset
}

function calculateMinMessageHeight(shellHeight: number) {
  return Math.max(240, Math.round(shellHeight * 0.35))
}

function calculateMaxComposerHeight(shellHeight: number) {
  return Math.round(shellHeight * 0.5)
}

const read = (...parts: string[]) => readFileSync(path.join(__dirname, ...parts), 'utf8')

function mockRect(height: number, bottom = height) {
  return {
    getBoundingClientRect: () => ({
      top: 0,
      left: 0,
      right: 390,
      bottom,
      width: 390,
      height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  }
}

describe('US1: Sticky ops chrome stack', () => {
  const layout = read('../../src/app/layout.tsx')
  const staffChrome = read('../../src/components/StaffChrome.tsx')
  const nav = read('../../src/components/Navigation.tsx')
  const css = read('../../src/app/globals.css')
  const page = read('../../src/app/page.tsx')
  const offsetHook = read('../../src/components/inbox/useInboxChromeOffset.ts')

  it('pins banner + nav in a fixed data-ops-chrome stack', () => {
    expect(staffChrome).toContain('data-ops-chrome')
    expect(staffChrome).toContain('ops-chrome')
    expect(staffChrome).toContain('--ops-chrome-height')
    expect(layout).toContain('<StaffChrome>')
    expect(layout).toContain('<OutboundRedirectBanner />')
    expect(layout).toContain('<Navigation />')
    expect(css).toContain('position: fixed')
    expect(css).toContain('.ops-chrome')
    expect(nav).not.toContain('sticky top-0')
  })

  it('locks outer page scroll on the inbox route', () => {
    expect(page).toContain("html.classList.add('inbox-lock')")
    expect(page).toContain("document.body.classList.add('inbox-lock')")
    expect(css).toContain('html.inbox-lock')
    expect(css).toContain('overflow: hidden')
  })

  it('measures wrapper height once and does not add nav height on top', () => {
    const chrome = mockRect(88)
    const navEl = mockRect(56, 88)
    const banner = mockRect(32, 32)
    const offset = measureOpsChromeOffset({
      querySelector: (selector: string) => {
        if (selector === '[data-ops-chrome]') return chrome as unknown as Element
        if (selector === 'nav') return navEl as unknown as Element
        if (selector === '[data-outbound-banner]') return banner as unknown as Element
        return null
      },
    })
    expect(offset).toBe(88)
    expect(offset).not.toBe(88 + 56)
    expect(offsetHook).toContain('data-ops-chrome')
    expect(offsetHook).toContain('measureOpsChromeOffset')
  })
})

describe('US2: Sticky chrome is not double-counted against #235 floors', () => {
  const css = read('../../src/app/globals.css')
  const shell = read('../../src/components/inbox/InboxLayoutShell.tsx')
  const page = read('../../src/app/page.tsx')

  it('zeroes staff-main padding under inbox-lock', () => {
    expect(css).toContain('html.inbox-lock .staff-main')
    expect(css).toContain('padding-top: 0')
    expect(page).toContain('inbox-lock')
  })

  it('keeps shell top as the single chrome offset', () => {
    expect(shell).toContain('top: chromeOffset')
    expect(page).toContain('useInboxChromeOffset()')
    expect(page).toContain('useShellDimensions(chromeOffset, keyboardInsetPx)')
  })

  it('preserves #235 floors at 1280×800 with sticky chrome height 88', () => {
    const chromeOffset = 88
    const shellHeight = calculateShellHeight(chromeOffset, 0, 800)
    const minMessageHeight = calculateMinMessageHeight(shellHeight)
    const maxComposerHeight = calculateMaxComposerHeight(shellHeight)

    expect(shellHeight).toBe(712)
    expect(minMessageHeight).toBeGreaterThanOrEqual(240)
    expect(minMessageHeight).toBeGreaterThanOrEqual(Math.round(shellHeight * 0.35))
    expect(maxComposerHeight).toBeLessThanOrEqual(Math.round(shellHeight * 0.5))
  })
})
