/**
 * Type definitions for Heavy Metal delivery proof-of-delivery draft
 */

/**
 * Proof-of-delivery data for Heavy Metal Sand & Stone
 */
export interface PodData {
  customer?: string;
  phone?: string;
  material?: string;
  volume?: number;
  unit?: string; // m³, ton, load
  deliveryLocation?: string;
  deliveredAt?: string; // ISO date or datetime
  vehicle?: string;
  driver?: string;
  notes?: string;
  signedBy?: string; // NEVER invent this field
}

/**
 * Extraction result with missing fields tracking
 */
export interface ExtractionResult {
  pod: PodData;
  missingFields: string[];
}

/**
 * CLI options
 */
export interface CliOptions {
  pod?: string;
  text?: string;
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
    pod: string;
    pod_md: string;
    missing_fields: string;
    approval: string;
    manifest: string;
  };
}
