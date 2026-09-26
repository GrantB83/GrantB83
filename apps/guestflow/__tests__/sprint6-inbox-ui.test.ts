import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const read = (...parts: string[]) => readFileSync(path.join(__dirname, ...parts), 'utf8')

describe('Sprint 6 inbox UI contract', () => {
  const page = read('../src/app/page.tsx')
  const composer = read('../src/components/inbox/ThreadComposer.tsx')
  const css = read('../src/app/globals.css')

  it('uses exact SoR toolbar tooltip copy and pop-out', () => {
    expect(composer).toContain("channel: 'Send channel'")
    expect(composer).toContain("templates: 'Templates'")
    expect(composer).toContain("attach: 'Attach file'")
    expect(composer).toContain("popOut: 'Expand editor'")
    expect(composer).toContain('aria-label={TOOLTIPS.channel}')
    expect(composer).toContain('title={TOOLTIPS.popOut}')
    expect(composer).toContain('data-sprint6-popout="open"')
    expect(composer).toContain('minHeight: 280')
    expect(composer).toContain('Maximize2')
    expect(composer).not.toContain('Template & Care')
    expect(page).not.toContain('Template & Care')
  })

  it('densifies list chrome and keeps search clear of the glass', () => {
    expect(page).toContain('pl-10')
    expect(page).toContain('title="Refresh inbox"')
    expect(page).toContain('Needs attention')
    expect(page).toContain('data-inbox-skeleton')
    expect(page).toContain("limit: '25'")
    expect(page).toContain('Refresh bodies')
    expect(page).toContain('stayStateLabel')
    expect(page).not.toContain('WA closed')
    expect(css).toContain('padding-left: 40px')
    expect(css).toContain('.inbox-search')
  })

  it('keeps Approve&Send human and does not auto-send', () => {
    expect(page).toContain("fetch('/api/inbound/confirm-token'")
    expect(composer).toContain('Approve & Send')
    expect(page).not.toContain('@every 5m')
  })
})
