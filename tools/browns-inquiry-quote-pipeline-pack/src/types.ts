/**
 * Types for browns-inquiry-quote-pipeline-pack CLI tool
 */

/**
 * CLI options parsed from command line arguments
 */
export interface CliOptions {
  help?: boolean;
  text?: string;
  inquiry?: string;
  runIntake?: boolean;
  runQuote?: boolean;
  intakeOutdir?: string;
  notes?: string;
  outdir?: string;
}

/**
 * Inquiry JSON structure (from browns-inquiry-intake)
 */
export interface InquiryData {
  guestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  suiteOrUnit?: string;
  adults?: number;
  children?: number;
  channel?: string;
  notes?: string;
  lateCheckIn?: boolean;
  depositAmount?: number;
  totalAmount?: number;
  quoteAmount?: number;
  currency?: string;
}

/**
 * Quote JSON structure (compatible with browns-quote-invoice-draft)
 */
export interface QuoteData {
  guestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  suiteOrUnit?: string;
  adults?: number;
  children?: number;
  channel?: string;
  notes?: string;
  nightlyRate?: number;
  nights?: number;
  total?: number;
  depositRequired?: number;
  currency?: string;
  includeProforma?: boolean;
  language?: string;
}

/**
 * Pack assembly result
 */
export interface PackResult {
  success: boolean;
  outdir: string;
  warnings: string[];
  message?: string;
}

/**
 * Manifest metadata
 */
export interface Manifest {
  tool: string;
  version: string;
  generatedAt: string;
  intakeRan: boolean;
  quoteRan: boolean;
  files: string[];
  guestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  hasAmounts: boolean;
}
