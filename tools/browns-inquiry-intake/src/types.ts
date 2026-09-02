/**
 * Type definitions for Browns inquiry intake
 */

/**
 * Structured booking data
 */
export interface Booking {
  guestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  suiteOrUnit?: string;
  adults?: number;
  children?: number;
  lateCheckIn?: boolean;
  channel?: string;
  notes?: string;
  depositAmount?: number;
  totalAmount?: number;
  currency?: string;
}

/**
 * Structured quote data
 */
export interface Quote {
  guestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  suiteOrUnit?: string;
  adults?: number;
  children?: number;
  channel?: string;
  notes?: string;
  quoteAmount?: number;
  currency?: string;
}

/**
 * Extraction result with missing fields tracking
 */
export interface ExtractionResult {
  booking: Booking;
  quote: Quote;
  missingFields: string[];
}

/**
 * CLI options
 */
export interface CliOptions {
  text?: string;
  stdin?: boolean;
  mode?: 'booking' | 'quote' | 'both';
  outdir?: string;
  help?: boolean;
}

/**
 * Output manifest
 */
export interface Manifest {
  generated_at: string;
  mode: string;
  source: string;
  outputs: {
    booking?: string;
    quote?: string;
    missing_fields: string;
    approval: string;
    manifest: string;
  };
}
