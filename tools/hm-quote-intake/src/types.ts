/**
 * Type definitions for Heavy Metal quote intake
 */

/**
 * Structured quote data for Heavy Metal Sand & Stone
 */
export interface Quote {
  customerName?: string;
  customerPhone?: string;
  materials?: string[]; // sand, stone, gravel, crusher dust, etc.
  volume?: number;
  volumeUnit?: string; // m³, ton, load, etc.
  deliveryLocation?: string;
  dateNeeded?: string;
  pricePerUnit?: number;
  totalPrice?: number;
  currency?: string;
  notes?: string;
}

/**
 * Extraction result with missing fields tracking
 */
export interface ExtractionResult {
  quote: Quote;
  missingFields: string[];
}

/**
 * CLI options
 */
export interface CliOptions {
  text?: string;
  stdin?: boolean;
  outdir?: string;
  help?: boolean;
}

/**
 * Output manifest
 */
export interface Manifest {
  generated_at: string;
  source: string;
  outputs: {
    quote: string;
    draft_reply: string;
    missing_fields: string;
    approval: string;
    manifest: string;
  };
}
