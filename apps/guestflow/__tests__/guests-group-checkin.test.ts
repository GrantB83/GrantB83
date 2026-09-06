/**
 * Guests Group Check-in Inference Tests
 * 
 * Tests check-in event detection and late check-in inference
 */

import { describe, it, expect } from 'vitest'
import { classifyMessage } from '@/lib/inbound-classifier'
import { inferCheckinStatuses, processCheckinEvent } from '@/lib/checkin-inference'

describe('Check-in Event Detection', () => {
  it('should detect arrived event', () => {
    const result = classifyMessage({
      messageText: 'Hi everyone, we just arrived at The Browns! Beautiful place!',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('checkin_event')
    expect(result.extractedData.eventType).toBe('arrived')
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it('should detect in-house event', () => {
    const result = classifyMessage({
      messageText: 'We\'re settled in the room now. Everything is great!',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('checkin_event')
    expect(result.extractedData.eventType).toBe('in_house')
  })

  it('should detect late arrival', () => {
    const result = classifyMessage({
      messageText: 'Running a bit late, ETA around 8pm',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('checkin_event')
    expect(result.extractedData.eventType).toBe('late_arrival')
  })

  it('should detect checkout event', () => {
    const result = classifyMessage({
      messageText: 'Checking out now, thank you for the wonderful stay!',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('checkin_event')
    expect(result.extractedData.eventType).toBe('checked_out')
  })
})

describe('Check-in Inference', () => {
  const today = new Date('2026-12-10T10:00:00Z')
  const todayStr = '2026-12-10'

  const mockBookings = [
    {
      id: 1,
      guest_name: 'John Smith',
      guest_phone: '+27821111111',
      check_in: `${todayStr}T14:00:00Z`,
      check_out: `${todayStr}T10:00:00Z`,
      status: 'confirmed'
    },
    {
      id: 2,
      guest_name: 'Jane Doe',
      guest_phone: '+27822222222',
      check_in: `${todayStr}T14:00:00Z`,
      check_out: `${todayStr}T10:00:00Z`,
      status: 'confirmed'
    }
  ]

  it('should infer not_arrived when no events', () => {
    const statuses = inferCheckinStatuses(mockBookings, [], today)

    expect(statuses.length).toBe(2)
    expect(statuses[0].checkinStatus).toBe('not_arrived')
    expect(statuses[1].checkinStatus).toBe('not_arrived')
  })

  it('should infer arrived when arrived event exists', () => {
    const events = [
      {
        id: 1,
        booking_id: 1,
        guest_name: 'John Smith',
        guest_phone: '+27821111111',
        event_type: 'arrived' as const,
        event_timestamp: `${todayStr}T15:30:00Z`,
        confidence: 0.85
      }
    ]

    const statuses = inferCheckinStatuses(mockBookings, events, today)

    const johnStatus = statuses.find(s => s.bookingId === 1)
    expect(johnStatus?.checkinStatus).toBe('arrived')
    expect(johnStatus?.confidence).toBe(0.85)
  })

  it('should flag needs_late_checkin for guests not arrived 2h after check-in time', () => {
    // Current time: 17:00 (5pm), check-in was at 14:00 (2pm), so 3 hours late
    const lateTime = new Date(`${todayStr}T17:00:00Z`)

    const statuses = inferCheckinStatuses(mockBookings, [], lateTime)

    expect(statuses[0].needsLateCheckinInstructions).toBe(true)
    expect(statuses[1].needsLateCheckinInstructions).toBe(true)
  })

  it('should not flag needs_late_checkin if already arrived', () => {
    const lateTime = new Date(`${todayStr}T17:00:00Z`)

    const events = [
      {
        id: 1,
        booking_id: 1,
        guest_name: 'John Smith',
        guest_phone: '+27821111111',
        event_type: 'arrived' as const,
        event_timestamp: `${todayStr}T15:30:00Z`,
        confidence: 0.85
      }
    ]

    const statuses = inferCheckinStatuses(mockBookings, events, lateTime)

    const johnStatus = statuses.find(s => s.bookingId === 1)
    expect(johnStatus?.needsLateCheckinInstructions).toBe(false)
  })
})

describe('Guest Matching', () => {
  it('should match guest name to booking', () => {
    const mockBookings = [
      {
        id: 1,
        guest_name: 'John Smith',
        guest_phone: '+27821111111',
        check_in: '2026-12-10T14:00:00Z',
        check_out: '2026-12-11T10:00:00Z',
        status: 'confirmed'
      }
    ]

    const { matchedBooking, confidence } = processCheckinEvent(
      'Hi, John Smith here, just arrived!',
      'John Smith',
      '+27821111111',
      'arrived',
      '2026-12-10T15:00:00Z',
      mockBookings
    )

    expect(matchedBooking).toBeDefined()
    expect(matchedBooking?.id).toBe(1)
    expect(confidence).toBeGreaterThan(0.8)
  })

  it('should handle partial name matches', () => {
    const mockBookings = [
      {
        id: 1,
        guest_name: 'John Smith',
        guest_phone: '+27821111111',
        check_in: '2026-12-10T14:00:00Z',
        check_out: '2026-12-11T10:00:00Z',
        status: 'confirmed'
      }
    ]

    const { matchedBooking } = processCheckinEvent(
      'John here, we arrived',
      'John',
      undefined,
      'arrived',
      '2026-12-10T15:00:00Z',
      mockBookings
    )

    expect(matchedBooking).toBeDefined()
    expect(matchedBooking?.id).toBe(1)
  })

  it('should not match unrelated names', () => {
    const mockBookings = [
      {
        id: 1,
        guest_name: 'John Smith',
        guest_phone: '+27821111111',
        check_in: '2026-12-10T14:00:00Z',
        check_out: '2026-12-11T10:00:00Z',
        status: 'confirmed'
      }
    ]

    const { matchedBooking } = processCheckinEvent(
      'Bob Johnson arrived',
      'Bob Johnson',
      undefined,
      'arrived',
      '2026-12-10T15:00:00Z',
      mockBookings
    )

    expect(matchedBooking).toBeNull()
  })
})
