export interface BookingRecord {
  guestName: string;
  suiteOrUnit: string;
  status: 'arriving' | 'inhouse' | 'departing';
  checkInDate?: string;
  checkOutDate?: string;
  lateCheckIn?: boolean;
  notes?: string;
  adults?: number;
  children?: number;
}

export interface BriefSections {
  arrivals: BookingRecord[];
  inhouse: BookingRecord[];
  departures: BookingRecord[];
}

export interface ManifestEntry {
  filename: string;
  type: 'team-message' | 'guest-stub' | 'approval' | 'manifest';
  guest?: string;
}

export interface CliOptions {
  day: string;
  bookings: string;
  facts?: string;
  outdir?: string;
}
