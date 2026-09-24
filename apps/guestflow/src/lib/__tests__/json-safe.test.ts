import { describe, expect, it } from 'vitest'
import { jsonReplacer, serializeForJson } from '@/lib/json-safe'

describe('json-safe', () => {
  it('converts safe BigInt integers to numbers', () => {
    expect(jsonReplacer('id', BigInt(42))).toBe(42)
  })

  it('stringifies BigInt values outside safe integer range', () => {
    const huge = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(2)
    expect(jsonReplacer('id', huge)).toBe(huge.toString())
  })

  it('serializeForJson round-trips nested objects with BigInt ids', () => {
    const input = {
      success: true,
      items: [{ id: BigInt(9007199254740991), threadId: BigInt(7) }],
      duplicate: { messageId: BigInt(21) },
    }
    const out = serializeForJson(input)
    expect(() => JSON.stringify(out)).not.toThrow()
    expect(out.items[0].id).toBe(9007199254740991)
    expect(out.items[0].threadId).toBe(7)
    expect(out.duplicate.messageId).toBe(21)
  })
})
