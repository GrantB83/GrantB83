/**
 * Types for browns-late-checkin-queue CLI
 */

export interface Booking {
  guestName: string;
  suiteOrUnit: string;
  status: 'arriving' | 'inhouse' | 'departing';
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  lateCheckIn?: boolean;
  adults?: number;
  children?: number;
  notes?: string;
  guestPhone?: string;
}

export interface LateCheckInEntry {
  guestName: string;
  suiteOrUnit: string;
  checkInDate: string;
  checkInTime?: string;
  guestPhone?: string;
  notes?: string;
  reason: 'after-hours-time' | 'keyword-flag' | 'unknown-time';
}

export interface CliOptions {
  bookings: string;
  day: string;
  outdir: string;
  afterHour: number;
  timezone: string;
}

export interface QueueOutput {
  targetDay: string;
  afterHourThreshold: number;
  timezone: string;
  lateCheckins: LateCheckInEntry[];
  unknownTimeCheckins: LateCheckInEntry[];
}

export interface MissingField {
  guestName: string;
  missingFields: string[];
}
