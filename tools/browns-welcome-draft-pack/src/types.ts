export interface BookingRecord {
  guestName: string;
  checkInDate: string;
  checkOutDate?: string;
  suiteOrUnit?: string;
  adults?: number;
  children?: number;
  notes?: string;
  guestPhone?: string;
  ratePerNight?: number;
  currency?: string;
}

export interface GuestFacts {
  guestName?: string;
  preferences?: string;
  allergies?: string;
  notes?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface WelcomeStub {
  guestName: string;
  safeName: string;
  checkInDate: string;
  hasPhone: boolean;
  hasRate: boolean;
  placeholders: string[];
  content: string;
}

export interface ManifestData {
  toolName: string;
  version: string;
  generatedAt: string;
  asOfDate: string;
  windowDays: number;
  totalBookings: number;
  draftCount: number;
  skippedNoName: number;
  missingPhones: number;
  missingRates: number;
  outdir: string;
}

export interface CliOptions {
  bookings: string;
  asOf?: string;
  windowDays: number;
  facts?: string;
  outdir: string;
}
