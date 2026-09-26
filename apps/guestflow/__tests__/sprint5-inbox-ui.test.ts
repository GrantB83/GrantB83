import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const read = (...parts: string[]) => readFileSync(path.join(__dirname, ...parts), 'utf8')

describe('Sprint 5 inbox UI contract', () => {
  const page = read('../src/app/page.tsx')
  const details = read('../src/components/inbox/ThreadHeaderDetails.tsx')
  const composer = read('../src/components/inbox/ThreadComposer.tsx')
  const shell = read('../src/components/inbox/ThreadLayoutShell.tsx')
  const css = read('../src/app/globals.css')

  it('labels Guest phone/email and saves { phone, email }', () => {
    expect(details).toContain('Guest phone')
    expect(details).toContain('Guest email')
    expect(details).not.toContain('Staff phone')
    expect(details).not.toContain('Staff email')
    expect(details).toContain('phone: phone || null')
    expect(details).toContain('email: email || null')
  })

  it('cuts Template & Care and uses an overlay composer', () => {
    expect(page).not.toContain('Template & Care')
    expect(composer).toContain('data-sprint5-composer="overlay"')
    expect(composer).toContain('Approve & Send')
    expect(composer).toContain('aria-label="Channel"')
    expect(composer).toContain('aria-label="Templates"')
    expect(composer).toContain('aria-label="Attach"')
    expect(shell).toContain('data-sprint5-zone="B"')
    expect(shell).toContain('data-sprint5-zone="C"')
    expect(css).toContain('100dvh')
    expect(css).toContain('safe-area-inset-bottom')
  })

  it('strips list chip rows and unifies Window closed', () => {
    expect(page).not.toContain('WA closed')
    expect(page).toContain('Draft ·')
    expect(page).toContain('stayStateLabel')
    expect(page).toContain('HeaderStatusChips')
    expect(page).toContain('data-pending-draft')
    expect(page).toContain("fetch('/api/inbound/confirm-token'")
  })
})

describe('Sprint 5 portal contract', () => {
  const route = read('../src/app/api/guest-portal/[code]/route.ts')
  const portal = read('../src/app/guest/[code]/page.tsx')

  it('keeps mapping-gap language off the guest-facing security message', () => {
    expect(route).toContain('message: security.message')
    expect(route).toContain('needsAttentionReason: codesUnresolved ? CODES_UNRESOLVED_REASON')
    expect(route).not.toContain('message: codesUnresolved')
    expect(portal).toContain('stayPacket.wifi.password ? (')
    expect(portal).toContain('Local information')
    expect(portal).toContain('Access codes appear on check-in day from 14:00.')
  })
})
