import type { BookingRecord } from './types.js';

/**
 * Filter bookings with check-in within windowDays of asOfDate
 * Skip bookings without guestName
 */
export function filterBookings(
  bookings: BookingRecord[],
  asOfDate: string,
  windowDays: number
): BookingRecord[] {
  const asOfMs = new Date(asOfDate).getTime();
  const windowEndMs = asOfMs + windowDays * 24 * 60 * 60 * 1000;

  return bookings.filter((b) => {
    // Skip if no guest name
    if (!b.guestName || b.guestName.trim() === '') {
      return false;
    }

    // Skip if no check-in date
    if (!b.checkInDate) {
      return false;
    }

    const checkInMs = new Date(b.checkInDate).getTime();

    // Check if check-in is within window: asOfDate <= checkIn < asOfDate + windowDays
    return checkInMs >= asOfMs && checkInMs < windowEndMs;
  });
}
