// Types for Perfect Water GRV CSV Normalizer

export type Profile = 'auto' | 'generic' | 'loyverse';

export interface CSVRow {
  [key: string]: string;
}

export interface NormalizedGRV {
  Store: string;
  'SKU/Item': string;
  ReceivedQty: string;
  Unit: string;
  ReceivedAt: string;
  Supplier: string;
  DocNo: string;
  Notes: string;
}

export interface RejectedRow {
  row: CSVRow;
  reason: string;
}

export interface NormalizationResult {
  normalized: NormalizedGRV[];
  rejected: RejectedRow[];
  missingFields: {
    missingStore: number;
    missingItem: number;
    missingQty: number;
    missingUnit: number;
  };
}

export interface ProfileConfig {
  name: string;
  storeColumn: string | null;
  itemColumn: string | null;
  qtyColumn: string | null;
  unitColumn: string | null;
  dateColumn: string | null;
  supplierColumn: string | null;
  docnoColumn: string | null;
  notesColumn: string | null;
  detectHeaders: (headers: string[]) => boolean;
}

export interface NormalizationReport {
  totalRows: number;
  normalizedRows: number;
  rejectedRows: number;
  profile: string;
  delimiter: string;
  inputFile: string;
  outputDir: string;
  timestamp: string;
}
