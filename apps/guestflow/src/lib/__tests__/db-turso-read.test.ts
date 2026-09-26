import { describe, expect, it } from 'vitest'
import { libsqlRowToPlain, libsqlRowsToPlain, resolveExecuteArgs } from '@/lib/db'

describe('Turso staff read wrapper', () => {
  it('prefers call-site params over a leftover bind()', () => {
    expect(resolveExecuteArgs([28], [51])).toEqual([51])
    expect(resolveExecuteArgs([28], [])).toEqual([28])
    expect(resolveExecuteArgs([], [28])).toEqual([28])
  })

  it('maps libsql array-like rows onto named columns so message_text is not dropped', () => {
    const row = Object.assign(['51', 'inbound', '[metadata-only]'], {
      id: 51,
      direction: 'inbound',
      message_text: 'We land at 16:00 — is late check-in OK?',
    })
    const plain = libsqlRowToPlain(row, ['id', 'direction', 'message_text'])
    expect(plain.id).toBe(51)
    expect(plain.message_text).toBe('We land at 16:00 — is late check-in OK?')
  })

  it('falls back to column index when named getters are missing', () => {
    const row = [51, 'We land at 16:00 — is late check-in OK?']
    const plain = libsqlRowToPlain(row, ['id', 'message_text'])
    expect(plain.id).toBe(51)
    expect(plain.message_text).toBe('We land at 16:00 — is late check-in OK?')
  })

  it('flattens a ResultSet so getThreadDetail can read updated bodies', () => {
    const rows = libsqlRowsToPlain({
      columns: ['id', 'message_text'],
      rows: [{ id: 51, message_text: 'We land at 16:00 — is late check-in OK?', 0: 51, 1: '[metadata-only]' }],
    })
    expect(rows[0].message_text).toBe('We land at 16:00 — is late check-in OK?')
  })
})
