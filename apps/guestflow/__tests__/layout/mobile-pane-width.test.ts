import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const read = (...parts: string[]) => readFileSync(path.join(__dirname, ...parts), 'utf8')

export function phoneUsableWidth(shellWidth: number, gutterPx = 8): number {
  return shellWidth - gutterPx * 2
}

describe('US3: Wider usable phone inbox panes', () => {
  const css = read('../../src/app/globals.css')
  const page = read('../../src/app/page.tsx')
  const thread = read('../../src/components/inbox/ThreadLayoutShell.tsx')
  const shell = read('../../src/components/inbox/InboxLayoutShell.tsx')

  it('uses 0.5rem phone gutters on list, thread header, messages, and composer', () => {
    expect(css).toContain('.inbox-shell[data-inbox-breakpoint="phone"] .inbox-list-header')
    expect(css).toContain('.inbox-shell[data-inbox-breakpoint="phone"] .inbox-list-row')
    expect(css).toContain('.inbox-shell[data-inbox-breakpoint="phone"] .inbox-thread-header')
    expect(css).toContain('.inbox-shell[data-inbox-breakpoint="phone"] .inbox-thread-messages')
    expect(css).toContain('.inbox-shell[data-inbox-breakpoint="phone"] .inbox-composer')
    expect(css).toContain('padding-left: 0.5rem')
    expect(css).toContain('padding-right: 0.5rem')
  })

  it('marks list header/rows and keeps phone panes full shell width', () => {
    expect(page).toContain('inbox-list-header')
    expect(page).toContain('inbox-list-row')
    expect(shell).toContain('absolute inset-0 z-10 w-full')
    expect(shell).toContain('absolute inset-0 z-20 w-full')
    expect(thread).toContain('inbox-thread-messages')
    expect(thread).toContain('flex-col gap-2 sm:flex-row')
    expect(thread).toContain('min-w-0 w-full')
  })

  it('gives ≥90% usable content width at 390 CSS px with 8px gutters', () => {
    const shellWidth = 390
    const usable = phoneUsableWidth(shellWidth, 8)
    expect(usable).toBe(374)
    expect(usable / shellWidth).toBeGreaterThanOrEqual(0.9)
  })

  it('does not hide Approve&Send while widening panes', () => {
    expect(page).toContain('Approve')
    expect(page).toContain('Send')
    expect(page).toContain('Approve&Send required — never auto-sent')
  })
})
