/**
 * Types for Browns guest communications draft generator
 */

export interface BookingData {
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  suiteOrUnit: string;
  lateCheckIn?: boolean;
  adults: number;
  children?: number;
  notes?: string;
  channel: 'whatsapp' | 'email';
}

export interface BrandFacts {
  address?: string;
  suites?: string[];
  wifi?: string;
  parking?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface SeedSamples {
  welcome?: string[];
  directions?: string[];
  lateCheckIn?: string[];
  quoteFollowUp?: string[];
}

export interface DraftOutputs {
  welcomeWhatsApp: string;
  welcomeEmail: {
    subject: string;
    body: string;
  };
  lateCheckIn: string;
  teamCheckIn: string;
  approval: string;
  manifest: {
    booking: BookingData;
    generatedAt: string;
    outputFiles: string[];
  };
}
