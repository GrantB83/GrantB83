/**
 * Type definitions for hm-quote-to-pod mapper
 */

/**
 * Quote structure from hm-quote-intake
 */
export interface Quote {
  customerName?: string;
  customerPhone?: string;
  materials?: string[];
  volume?: number;
  volumeUnit?: string;
  deliveryLocation?: string;
  dateNeeded?: string;
  pricePerUnit?: number;
  totalPrice?: number;
  currency?: string;
  notes?: string;
}

/**
 * POD structure for hm-delivery-pod-draft
 */
export interface PodData {
  customer?: string;
  phone?: string;
  material?: string;
  volume?: number;
  unit?: string;
  deliveryLocation?: string;
  deliveredAt?: string;
  vehicle?: string;
  driver?: string;
  notes?: string;
  signedBy?: string; // NEVER populated by this tool
}

/**
 * Mapping report showing which fields were carried vs missing
 */
export interface MappingReport {
  carried: string[];
  missing: string[];
  notes: string[];
}

/**
 * CLI options
 */
export interface CliOptions {
  quote?: string;
  outdir?: string;
  notes?: string;
  help?: boolean;
}

/**
 * Output manifest
 */
export interface Manifest {
  generated_at: string;
  source: string;
  notes_appended: boolean;
  outputs: {
    pod: string;
    mapping: string;
    approval: string;
    manifest: string;
  };
}
