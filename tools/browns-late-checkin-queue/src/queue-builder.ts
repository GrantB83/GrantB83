/**
 * Queue builder logic for late check-ins
 */

import type { Booking, LateCheckInEntry } from './types.js';

const LATE_KEYWORDS = [
  'late arrival',
  'late check-in',
  'late checkin',
  'after hours',
  'after-hours',
  'eta',
  'arriving late',
  'evening arrival',
];

export function buildLateCheckInQueue(
  bookings: Booking[],
  targetDay: string,
  afterHour: number,
  timezone: string
): { lateCheckins: LateCheckInEntry[], unknownTimeCheckins: LateCheckInEntry[] } {
  const lateCheckins: LateCheckInEntry[] = [];
  const unknownTimeCheckins: LateCheckInEntry[] = [];
  
  // Filter for arrivals on the target day
  const arrivalsOnDay = bookings.filter(b => {
    if (b.status !== 'arriving') return false;
    if (!b.checkInDate) return false;
    return b.checkInDate === targetDay;
  });
  
  for (const booking of arrivalsOnDay) {
    const hasCheckInTime = !!booking.checkInTime;
    const hasLateKeyword = hasLateKeywordInNotes(booking.notes);
    
    // Check if time is at/after threshold
    if (hasCheckInTime) {
      const hour = parseCheckInHour(booking.checkInTime!);
      if (hour !== null && hour >= afterHour) {
        lateCheckins.push({
          guestName: booking.guestName,
          suiteOrUnit: booking.suiteOrUnit,
          checkInDate: booking.checkInDate!,
          checkInTime: booking.checkInTime,
          guestPhone: booking.guestPhone,
          notes: booking.notes,
          reason: 'after-hours-time',
        });
        continue;
      }
    }
    
    // Check for late/after-hours keywords
    if (hasLateKeyword) {
      const entry: LateCheckInEntry = {
        guestName: booking.guestName,
        suiteOrUnit: booking.suiteOrUnit,
        checkInDate: booking.checkInDate!,
        checkInTime: booking.checkInTime,
        guestPhone: booking.guestPhone,
        notes: booking.notes,
        reason: 'keyword-flag',
      };
      
      if (hasCheckInTime) {
        lateCheckins.push(entry);
      } else {
        unknownTimeCheckins.push(entry);
      }
      continue;
    }
    
    // If no check-in time and no late keyword, add to unknown-time queue
    if (!hasCheckInTime) {
      unknownTimeCheckins.push({
        guestName: booking.guestName,
        suiteOrUnit: booking.suiteOrUnit,
        checkInDate: booking.checkInDate!,
        checkInTime: undefined,
        guestPhone: booking.guestPhone,
        notes: booking.notes,
        reason: 'unknown-time',
      });
    }
  }
  
  return { lateCheckins, unknownTimeCheckins };
}

function hasLateKeywordInNotes(notes?: string): boolean {
  if (!notes) return false;
  const lowerNotes = notes.toLowerCase();
  return LATE_KEYWORDS.some(keyword => lowerNotes.includes(keyword));
}

function parseCheckInHour(timeStr: string): number | null {
  // Support formats: HH:MM, H:MM, HH:MM:SS, HHMM
  const patterns = [
    /^(\d{1,2}):(\d{2})(?::\d{2})?$/, // HH:MM or HH:MM:SS
    /^(\d{2})(\d{2})$/,                // HHMM
  ];
  
  for (const pattern of patterns) {
    const match = timeStr.match(pattern);
    if (match) {
      const hour = parseInt(match[1], 10);
      if (hour >= 0 && hour <= 23) {
        return hour;
      }
    }
  }
  
  return null;
}
