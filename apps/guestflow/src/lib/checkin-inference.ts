/**
 * Check-in Inference Logic
 * 
 * Infer who has/hasn't checked in from:
 * - Guests WhatsApp group context
 * - NightsBridge bookings (arriving today / in-house)
 * 
 * DO NOT INVENT check-ins. Only infer from actual messages.
 * Late check-in instructions target ONLY guests not yet checked in.
 */

interface Booking {
  id: number
  guest_name: string
  guest_phone?: string
  check_in: string
  check_out: string
  status: string
}

interface CheckinEvent {
  id: number
  booking_id?: number
  guest_name: string
  guest_phone?: string
  event_type: 'arrived' | 'in_house' | 'late_arrival' | 'checked_out'
  event_timestamp: string
  confidence: number
}

export interface GuestCheckinStatus {
  bookingId: number
  guestName: string
  guestPhone?: string
  checkInDate: string
  expectedArrivalTime: string
  checkinStatus: 'not_arrived' | 'arrived' | 'in_house' | 'late' | 'checked_out'
  lastEvent?: CheckinEvent
  needsLateCheckinInstructions: boolean
  confidence: number
}

/**
 * Match guest name from message to booking
 * Simple fuzzy matching on name tokens
 */
function matchGuestToBooking(
  guestNameFromMessage: string,
  bookings: Booking[]
): Booking | null {
  const normalizedSearchName = guestNameFromMessage.toLowerCase().trim()
  const searchTokens = normalizedSearchName.split(/\s+/)

  for (const booking of bookings) {
    const bookingName = booking.guest_name.toLowerCase()
    const bookingTokens = bookingName.split(/\s+/)

    // Match if at least 2 tokens match (first name + last name)
    const matchCount = searchTokens.filter(token => 
      bookingTokens.some(bt => bt.includes(token) || token.includes(bt))
    ).length

    if (matchCount >= 2 || (matchCount >= 1 && searchTokens.length === 1)) {
      return booking
    }
  }

  return null
}

/**
 * Infer check-in status from events and bookings
 * 
 * Rules:
 * - If no event: not_arrived
 * - If event_type = 'arrived': arrived
 * - If event_type = 'in_house': in_house
 * - If event_type = 'late_arrival': late
 * - If event_type = 'checked_out': checked_out
 * 
 * Late check-in instructions ONLY if:
 * - Check-in date is today
 * - Status is 'not_arrived' or 'late'
 * - Current time > expected check-in time + 2 hours
 */
export function inferCheckinStatuses(
  bookings: Booking[],
  events: CheckinEvent[],
  currentTime: Date = new Date()
): GuestCheckinStatus[] {
  const statuses: GuestCheckinStatus[] = []
  const today = currentTime.toISOString().split('T')[0]

  for (const booking of bookings) {
    const checkInDate = booking.check_in.split('T')[0]

    // Only process bookings for today or already checked in
    const isToday = checkInDate === today
    const isCheckoutToday = booking.check_out.split('T')[0] === today

    if (!isToday && !isCheckoutToday) {
      continue // Skip future bookings
    }

    // Find latest event for this booking
    const bookingEvents = events
      .filter(e => e.booking_id === booking.id)
      .sort((a, b) => 
        new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime()
      )

    const lastEvent = bookingEvents[0]

    let checkinStatus: GuestCheckinStatus['checkinStatus'] = 'not_arrived'
    let confidence = 0.5

    if (lastEvent) {
      switch (lastEvent.event_type) {
        case 'arrived':
          checkinStatus = 'arrived'
          confidence = lastEvent.confidence
          break
        case 'in_house':
          checkinStatus = 'in_house'
          confidence = lastEvent.confidence
          break
        case 'late_arrival':
          checkinStatus = 'late'
          confidence = lastEvent.confidence
          break
        case 'checked_out':
          checkinStatus = 'checked_out'
          confidence = lastEvent.confidence
          break
      }
    }

    // Determine if needs late check-in instructions
    const expectedCheckInTime = `${checkInDate}T14:00:00Z` // 14:00 default
    const twoHoursAfterCheckIn = new Date(expectedCheckInTime)
    twoHoursAfterCheckIn.setHours(twoHoursAfterCheckIn.getHours() + 2)

    const needsLateCheckinInstructions = 
      isToday &&
      (checkinStatus === 'not_arrived' || checkinStatus === 'late') &&
      currentTime > twoHoursAfterCheckIn

    statuses.push({
      bookingId: booking.id,
      guestName: booking.guest_name,
      guestPhone: booking.guest_phone,
      checkInDate: booking.check_in,
      expectedArrivalTime: expectedCheckInTime,
      checkinStatus,
      lastEvent,
      needsLateCheckinInstructions,
      confidence
    })
  }

  return statuses
}

/**
 * Process check-in event from guests group message
 * Returns inferred event with matched booking
 */
export function processCheckinEvent(
  messageText: string,
  guestName: string,
  guestPhone: string | undefined,
  eventType: 'arrived' | 'in_house' | 'late_arrival' | 'checked_out',
  eventTimestamp: string,
  arrivingTodayBookings: Booking[]
): {
  event: Partial<CheckinEvent>
  matchedBooking?: Booking
  confidence: number
} {
  // Try to match guest to booking
  const matchedBooking = matchGuestToBooking(guestName, arrivingTodayBookings)

  let confidence = 0.6 // Base confidence for event detection

  if (matchedBooking) {
    confidence = 0.85 // Higher confidence if matched to booking
  }

  const event: Partial<CheckinEvent> = {
    booking_id: matchedBooking?.id,
    guest_name: guestName,
    guest_phone: guestPhone,
    event_type: eventType,
    event_timestamp: eventTimestamp,
    confidence
  }

  return { event, matchedBooking: matchedBooking ?? undefined, confidence }
}

/**
 * Generate late check-in instructions for guests who need them
 */
export function generateLateCheckinInstructions(
  guestStatus: GuestCheckinStatus,
  property: string = 'The Browns Luxury Guest Suites'
): string {
  return `Hi ${guestStatus.guestName},

We noticed you haven't checked in yet. No worries!

**Check-in Information:**
📍 ${property}, Dullstroom
⏰ Check-in is available until late evening
🔑 [KEY COLLECTION INSTRUCTIONS - ASK STAFF]
📞 If you need assistance: [EMERGENCY CONTACT - ASK STAFF]

**Running late?** Just let us know your ETA and we'll make sure everything is ready for you.

Looking forward to welcoming you!

Warm regards,
The Browns Team`
}
