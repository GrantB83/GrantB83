import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const read = (...parts: string[]) => readFileSync(path.join(__dirname, ...parts), 'utf8')

describe('Sprint 2 mobile inbox UI contract', () => {
  const page = read('../src/app/page.tsx')
  const shell = read('../src/components/inbox/InboxLayoutShell.tsx')
  const thread = read('../src/components/inbox/ThreadLayoutShell.tsx')
  const confirm = read('../src/components/inbox/InboxConfirmDialog.tsx')
  const nextConfig = read('../next.config.mjs')
  const nav = read('../src/components/Navigation.tsx')
  const banner = read('../src/components/outbound-redirect-banner.tsx')
  const css = read('../src/app/globals.css')

  it('keeps Approve&Send confirmToken sequence and does not auto-send', () => {
    expect(page).toContain("fetch('/api/inbound/confirm-token'")
    expect(page).toContain('confirmToken: tokenData.confirmToken')
    expect(page).toContain("fetch('/api/inbound/send'")
    expect(page).toContain('Approve&Send required — never auto-sent')
    expect(page).not.toContain('window.confirm')
    expect(confirm).toContain('data-inbox-confirm')
    expect(confirm).toContain('No auto-send')
  })

  it('exposes rebase slots for parallel thread-UI PRs', () => {
    expect(thread).toContain('data-inbox-slot="header-badge"')
    expect(thread).toContain('data-inbox-slot="header-actions"')
    expect(thread).toContain('data-inbox-slot="bubble-status"')
    expect(page).toContain('OutboundDeliveryBubble')
  })

  it('implements phone / tablet / desktop panes', () => {
    expect(shell).toContain("breakpoint === 'phone'")
    expect(shell).toContain("breakpoint === 'tablet'")
    expect(shell).toContain('max-w-md')
    expect(shell).toContain('w-72')
    expect(page).toContain("breakpoint === 'phone'")
    expect(page).toContain("router.back()")
    expect(page).toContain('inbox-list-scroll')
  })

  it('enforces 16px fields, 44px taps, wrap, and keyboard inset', () => {
    expect(css).toContain('min-height: 44px')
    expect(css).toContain('font-size: 16px')
    expect(css).toContain('overflow-wrap: anywhere')
    expect(page).toContain('inbox-field')
    expect(page).toContain('inbox-tap')
    expect(page).toContain('inbox-wrap')
    expect(page).toContain('useVisualViewportInset')
  })

  it('keeps hamburger and compact redirect banner', () => {
    expect(nav).toContain('Toggle menu')
    expect(nav).toContain('inbox-tap')
    expect(banner).toContain('Outbound redirect on — test sinks only.')
    expect(banner).toContain('data-outbound-banner')
  })

  it('pins staff chrome and widens phone panes without changing send gates', () => {
    const staffChrome = read('../src/components/StaffChrome.tsx')
    const layout = read('../src/app/layout.tsx')
    expect(staffChrome).toContain('data-ops-chrome')
    expect(layout).toContain('StaffChrome')
    expect(page).toContain('inbox-lock')
    expect(page).toContain('inbox-list-scroll')
    expect(css).toContain('.ops-chrome')
    expect(css).toContain('data-inbox-breakpoint="phone"')
    expect(page).toContain("fetch('/api/inbound/confirm-token'")
    expect(page).toContain('Approve&Send required — never auto-sent')
  })

  it('does not ignore TypeScript build errors', () => {
    expect(nextConfig).not.toContain('ignoreBuildErrors')
  })

  it('uses invented fixture guests only', () => {
    const fixture = read('../src/components/inbox/inbox-fixture.ts')
    expect(fixture).toContain('Alex Guest')
    expect(fixture).toContain('Jordan Booker')
    expect(fixture).toContain('example.invalid')
    expect(fixture).not.toMatch(/thebrowns\.co\.za/)
  })
})
