export interface NormalizedRow {
  Store: string;
  'SKU/Item': string;
  CountedQty: string;
  Unit: string;
  CountedAt?: string;
  Notes?: string;
}

export interface RawRow {
  [key: string]: string;
}

export interface RejectedRow {
  originalRow: RawRow;
  reason: string;
}

export interface ParseResult {
  normalized: NormalizedRow[];
  rejected: RejectedRow[];
  missingFields: string[];
}

export type Profile = 'auto' | 'generic' | 'loyverse';

export interface ProfileConfig {
  name: Profile;
  storeAliases: string[];
  skuAliases: string[];
  qtyAliases: string[];
  unitAliases: string[];
  countedAtAliases: string[];
  notesAliases: string[];
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
