export interface BookingRecord {
  guestName: string;
  suiteOrUnit: string;
  status: 'arriving' | 'inhouse' | 'departing' | '';
  checkInDate?: string;
  checkOutDate?: string;
  lateCheckIn?: boolean;
  notes?: string;
  adults?: number;
  children?: number;
}

export interface RawNightsbridgeRow {
  [key: string]: string;
}

export interface ParsedData {
  rows: RawNightsbridgeRow[];
  delimiter: ',' | '\t';
  headers: string[];
}

export interface MissingField {
  row: number;
  guest: string;
  field: string;
  reason: string;
}

export interface TransformResult {
  bookings: BookingRecord[];
  missingFields: MissingField[];
}

export interface ManifestEntry {
  filename: string;
  type: 'bookings-json' | 'bookings-csv' | 'missing-fields' | 'approval' | 'manifest';
  recordCount?: number;
}

export interface CliOptions {
  day: string;
  input?: string;
  paste?: boolean;
  outdir?: string;
}

export const HEADER_ALIASES: Record<string, string[]> = {
  guestName: ['guest', 'name', 'guestname', 'guest name', 'guest_name'],
  suiteOrUnit: ['suite', 'unit', 'room', 'suiteoruint', 'suite or unit', 'suite_or_unit', 'suite/unit'],
  checkInDate: ['arrive', 'checkin', 'check-in', 'check in', 'checkindate', 'check_in_date', 'arrival', 'arrival date'],
  checkOutDate: ['depart', 'checkout', 'check-out', 'check out', 'checkoutdate', 'check_out_date', 'departure', 'departure date'],
  adults: ['adults', 'adult', 'num_adults', 'number of adults'],
  children: ['children', 'child', 'kids', 'num_children', 'number of children'],
  notes: ['notes', 'note', 'comments', 'comment', 'special requests', 'special_requests', 'specialrequests', 'remarks'],
  lateCheckIn: ['late', 'latecheckin', 'late checkin', 'late check-in', 'late_checkin', 'late arrival', 'latearrival', 'late_arrival'],
  status: ['status', 'booking status', 'booking_status']
};
