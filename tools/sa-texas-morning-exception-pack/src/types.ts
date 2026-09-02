export interface CliOptions {
  date: string;
  outdir: string;
  brownsBookings?: string;
  hmQuotesDir?: string;
  notes?: string;
}

export interface BrownsBooking {
  bookingId?: string;
  guestName?: string;
  suite?: string;
  checkin?: string;
  checkout?: string;
  status?: string;
  notes?: string;
  specialRequests?: string;
}

export interface HMQuoteFile {
  filename: string;
  displayName: string;
}

export interface ExceptionSection {
  title: string;
  items: string[];
  hasData: boolean;
}

export interface PackManifest {
  date: string;
  generatedAt: string;
  sources: {
    brownsBookings: string | null;
    hmQuotesDir: string | null;
    notes: string | null;
  };
  outputs: string[];
  warnings: string[];
}
