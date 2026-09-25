import { describe, expect, it } from 'vitest'
import { hasGuestContact, resolveContactPresence } from '../contact-presence'

describe('contact presence (#219 matching interface)', () => {
  it('treats a ZA phone as WhatsApp contact', () => {
    expect(hasGuestContact({ phone: '0821234567', email: null })).toBe(true)
    expect(resolveContactPresence({ phone: '0821234567' })).toMatchObject({
      phone: '+27821234567',
      channel: 'whatsapp',
      hasContact: true,
    })
  })

  it('falls back to email when phone is missing', () => {
    const presence = resolveContactPresence({ phone: '', email: 'Ada@Host.example' })
    expect(presence).toMatchObject({ email: 'ada@host.example', channel: 'email', hasContact: true })
  })

  it('is no-contact when both are missing or unparseable', () => {
    expect(hasGuestContact({ phone: 'not-a-phone', email: 'nope' })).toBe(false)
    expect(resolveContactPresence({}).hasContact).toBe(false)
    expect(resolveContactPresence({}).channel).toBeNull()
  })
})
