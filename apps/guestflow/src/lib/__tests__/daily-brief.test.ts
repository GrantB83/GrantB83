import { describe, it, expect } from 'vitest'
import {
  deriveBookingStatus,
  detectMissingFields,
  inferLateCheckIn,
  buildDailyBriefSnapshot,
  generateWhatsAppBrief,
  detectEmptySuites,
  type RawBookingRow,
} from '../daily-brief'

const baseRow = (overrides: Partial<RawBookingRow> = {}): RawBookingRow => ({
  id: 1,
  guest_name: 'Jane Doe',
  guest_phone: '+27821234567',
  property_name: 'Riverside Suite',
  suite_or_unit: 'Suite 3',
  room_number: 'Suite 3',
  check_in: '2026-09-14',
  check_out: '2026-09-16',
  adults: 2,
  children: 0,
  notes: '',
  late_check_in: 0,
  ...overrides,
})

describe('deriveBookingStatus', () => {
  it('returns arriving when check-in matches target date', () => {
    expect(deriveBookingStatus('2026-09-14', '2026-09-16', '2026-09-14')).toBe('arriving')
  })

  it('returns departing when check-out matches target date', () => {
    expect(deriveBookingStatus('2026-09-12', '2026-09-14', '2026-09-14')).toBe('departing')
  })

  it('returns inhouse when stay spans target date', () => {
    expect(deriveBookingStatus('2026-09-12', '2026-09-16', '2026-09-14')).toBe('inhouse')
  })

  it('returns null when booking outside window', () => {
    expect(deriveBookingStatus('2026-09-20', '2026-09-22', '2026-09-14')).toBeNull()
  })
})

describe('inferLateCheckIn', () => {
  it('detects late_check_in flag', () => {
    expect(inferLateCheckIn(baseRow({ late_check_in: 1 }))).toBe(true)
  })

  it('detects late keyword in notes', () => {
    expect(inferLateCheckIn(baseRow({ notes: 'Flight delayed, arriving late' }))).toBe(true)
  })

  it('returns false for normal booking', () => {
    expect(inferLateCheckIn(baseRow())).toBe(false)
  })
})

describe('detectMissingFields', () => {
  it('flags missing guest phone and suite', () => {
    const missing = detectMissingFields(
      baseRow({ guest_phone: '', suite_or_unit: '', room_number: '' })
    )
    expect(missing).toContain('guest_phone')
    expect(missing).toContain('suite_or_unit')
  })
})

describe('detectEmptySuites', () => {
  it('flags turnover gap when departure has no follow-up arrival', () => {
    const rows = [
      baseRow({
        id: 1,
        check_in: '2026-09-10',
        check_out: '2026-09-14',
        suite_or_unit: 'Suite A',
      }),
    ]
    const flags = detectEmptySuites(rows, '2026-09-14', '2026-09-15')
    expect(flags.length).toBe(1)
    expect(flags[0].unit).toBe('Suite A')
  })
})

describe('buildDailyBriefSnapshot', () => {
  it('groups today and tomorrow slices', () => {
    const rows = [
      baseRow({ id: 1, check_in: '2026-09-14', check_out: '2026-09-16' }),
      baseRow({
        id: 2,
        guest_name: 'Bob Smith',
        check_in: '2026-09-15',
        check_out: '2026-09-17',
        suite_or_unit: 'Suite 5',
      }),
    ]
    const snapshot = buildDailyBriefSnapshot(1, 'Browns Dullstroom', '2026-09-14', rows)
    expect(snapshot.today.arrivals).toHaveLength(1)
    expect(snapshot.tomorrow.arrivals).toHaveLength(1)
    expect(snapshot.today.arrivals[0].guestName).toBe('Jane Doe')
  })
})

describe('generateWhatsAppBrief', () => {
  it('includes draft-only footer and no rate amounts', () => {
    const snapshot = buildDailyBriefSnapshot(1, 'Browns', '2026-09-14', [
      baseRow({ late_check_in: 1 }),
    ])
    const text = generateWhatsAppBrief(snapshot)
    expect(text).toContain('DRAFT ONLY')
    expect(text).toContain('No auto-send')
    expect(text).not.toMatch(/\bZAR\b/)
    expect(text).not.toMatch(/R\s?[\d,]{3,}/)
    expect(text).toContain('Never includes rates or payment amounts')
    expect(text).toContain('Jane Doe')
    expect(text).toContain('LATE CHECK-IN')
  })

  it('states no operations when empty', () => {
    const snapshot = buildDailyBriefSnapshot(1, 'Browns', '2026-09-14', [])
    const text = generateWhatsAppBrief(snapshot)
    expect(text).toContain('No arrivals today')
    expect(text).toContain('DRAFT ONLY')
  })
})
