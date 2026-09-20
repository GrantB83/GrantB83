import { describe, expect, it } from 'vitest'
import { normalizeEmail, normalizeZaE164 } from '@/lib/phone'

describe('normalizeZaE164', () => {
  it('normalizes local ZA mobiles', () => {
    expect(normalizeZaE164('0821234567')).toBe('+27821234567')
    expect(normalizeZaE164('082 123 4567')).toBe('+27821234567')
    expect(normalizeZaE164('(082) 123-4567')).toBe('+27821234567')
  })

  it('keeps E.164 and 00-prefix', () => {
    expect(normalizeZaE164('+27821234567')).toBe('+27821234567')
    expect(normalizeZaE164('0027821234567')).toBe('+27821234567')
    expect(normalizeZaE164('27821234567')).toBe('+27821234567')
  })

  it('returns null instead of inventing', () => {
    expect(normalizeZaE164('')).toBeNull()
    expect(normalizeZaE164(null)).toBeNull()
    expect(normalizeZaE164('ask staff')).toBeNull()
    expect(normalizeZaE164('123')).toBeNull()
    expect(normalizeZaE164('441234567890')).toBeNull()
  })
})

describe('normalizeEmail', () => {
  it('lowercases valid email and rejects junk', () => {
    expect(normalizeEmail('  Guest@Example.COM ')).toBe('guest@example.com')
    expect(normalizeEmail('nope')).toBeNull()
  })
})
