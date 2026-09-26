import { describe, expect, it } from 'vitest'
import {
  extractWaWebDisplayName,
  isPhoneLikeDisplayName,
  isWaWebSentinelBody,
} from '@/lib/wa-web-body'

describe('wa-web-body', () => {
  it('treats empty and known sentinels as unavailable bodies', () => {
    expect(isWaWebSentinelBody('')).toBe(true)
    expect(isWaWebSentinelBody('   ')).toBe(true)
    expect(isWaWebSentinelBody('[metadata-only]')).toBe(true)
    expect(isWaWebSentinelBody('[body unavailable]')).toBe(true)
    expect(isWaWebSentinelBody('[observe-probe]')).toBe(true)
    expect(isWaWebSentinelBody('What time is check-in?')).toBe(false)
  })

  it('rejects phone-like labels so we do not invent a name', () => {
    expect(isPhoneLikeDisplayName('+27821234567', '+27821234567')).toBe(true)
    expect(isPhoneLikeDisplayName('082 123 4567', '+27821234567')).toBe(true)
    expect(isPhoneLikeDisplayName('Sam Guest', '+27821234567')).toBe(false)
    expect(isPhoneLikeDisplayName('', '+27821234567')).toBe(true)
  })

  it('extracts contact / push / chat title and ignores raw-number titles', () => {
    expect(
      extractWaWebDisplayName({
        from: '+27821234567',
        metadata: { chatTitle: '+27821234567', pushName: 'Sam' },
      })
    ).toBe('Sam')
    expect(
      extractWaWebDisplayName({
        from: '+27821234567',
        contactName: 'Sam Guest',
        pushName: 'Sam',
      })
    ).toBe('Sam Guest')
    expect(
      extractWaWebDisplayName({
        from: '+27821234567',
        displayName: '+27821234567',
        metadata: { chatTitle: '27821234567' },
      })
    ).toBeNull()
  })
})
