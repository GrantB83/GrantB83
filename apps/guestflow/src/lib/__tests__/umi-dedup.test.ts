import { describe, expect, it } from 'vitest'
import { computeDedupKey } from '@/lib/umi-dedup'

describe('umi-dedup', () => {
  it('matches Cloud and Web copies of the same guest message', () => {
    const a = computeDedupKey('+27821234567', 'What time is check-in?', '2026-09-24T12:00:10.000Z')
    const b = computeDedupKey('whatsapp:+27821234567', 'what time is check-in?', '2026-09-24T12:01:40.000Z')
    expect(a).toBe(b)
  })

  it('does not merge different bodies', () => {
    const a = computeDedupKey('+27821234567', 'Hello', '2026-09-24T12:00:00.000Z')
    const b = computeDedupKey('+27821234567', 'Goodbye', '2026-09-24T12:00:00.000Z')
    expect(a).not.toBe(b)
  })
})
