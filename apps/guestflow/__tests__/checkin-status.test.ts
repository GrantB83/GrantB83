import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { inferCheckinStatuses } from '@/lib/checkin-inference'
import { johannesburgTodayIso } from '@/lib/daily-brief'
import { isActiveGuestBooking } from '@/lib/booking-filters'

const getDbAsync = vi.fn()

vi.mock('@/lib/db', () => ({
  getDbAsync: (...args: unknown[]) => getDbAsync(...args),
}))

describe('inferCheckinStatuses unknown default', () => {
  it('returns unknown and no late-checkin instructions when there are no events', () => {
    const today = johannesburgTodayIso()
    const statuses = inferCheckinStatuses(
      [
        {
          id: 1,
          guest_name: 'Ada Booker',
          check_in: today,
          check_out: '2026-12-31',
          status: 'confirmed',
        },
      ],
      [],
      new Date()
    )
    expect(statuses).toHaveLength(1)
    expect(statuses[0].checkinStatus).toBe('unknown')
    expect(statuses[0].needsLateCheckinInstructions).toBe(false)
  })
})

describe('GET /api/checkin-status', () => {
  beforeEach(() => {
    getDbAsync.mockReset()
  })

  it('excludes cancelled and BLOCK, defaults date to SAST, and reports unknown', async () => {
    const today = johannesburgTodayIso()
    const rows = [
      {
        id: 1,
        guest_name: 'Ada Booker',
        status: 'confirmed',
        check_in: today,
        check_out: '2026-12-31',
      },
      {
        id: 2,
        guest_name: 'Cancelled Guest',
        status: 'cancelled',
        check_in: today,
        check_out: '2026-12-31',
      },
      {
        id: 3,
        guest_name: 'BLOCK',
        status: 'confirmed',
        check_in: today,
        check_out: '2026-12-31',
      },
    ]
    getDbAsync.mockResolvedValue({
      prepare: (sql: string) => {
        if (sql.includes('FROM bookings')) {
          return {
            all: vi.fn(async () => rows.filter(isActiveGuestBooking)),
          }
        }
        return { all: vi.fn(async () => []), get: vi.fn(), run: vi.fn() }
      },
    })

    const { GET } = await import('@/app/api/checkin-status/route')
    const response = await GET(new NextRequest('http://localhost:3100/api/checkin-status'))
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.date).toBe(today)
    expect(data.statuses).toHaveLength(1)
    expect(data.statuses[0].guestName).toBe('Ada Booker')
    expect(data.statuses[0].checkinStatus).toBe('unknown')
    expect(data.stats.unknown).toBe(1)
  })
})
