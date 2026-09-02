/**
 * Type definitions for hm-quote-pipeline-pack
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
 * POD structure from hm-quote-to-pod or hm-delivery-pod-draft
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
  signedBy?: string;
}

/**
 * CLI options
 */
export interface CliOptions {
  text?: string;
  quote?: string;
  runIntake?: boolean;
  runMap?: boolean;
  runPod?: boolean;
  quoteOutdir?: string;
  podOutdir?: string;
  podDraftOutdir?: string;
  notes?: string;
  outdir?: string;
  help?: boolean;
}

/**
 * Pack manifest
 */
export interface PackManifest {
  tool: string;
  version: string;
  timestamp: string;
  packDate: string;
  inputs: {
    textPath: string | null;
    quotePath: string | null;
    quoteOutdirPath: string | null;
    podOutdirPath: string | null;
    podDraftOutdirPath: string | null;
    notes: string | null;
  };
  runOptions: {
    ranIntake: boolean;
    ranMap: boolean;
    ranPod: boolean;
  };
  outputs: string[];
  checks: {
    hasQuote: boolean;
    hasPod: boolean;
    hasPodDraft: boolean;
    hasApproval: boolean;
  };
}

/**
 * Pack result
 */
export interface PackResult {
  success: boolean;
  outdir: string;
  manifest: PackManifest;
  warnings: string[];
}

/**
 * Missing fields summary
 */
export interface MissingFieldsSummary {
  quoteFields: string[];
  podFields: string[];
  critical: boolean; // true if volume/location/material missing
}
