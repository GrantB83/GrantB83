export interface NormalizedRow {
  Date: string;
  Reference: string;
  Amount: string;
  Description: string;
  Payee?: string;
  Store?: string;
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

export type Profile = 'auto' | 'fnb' | 'standard' | 'absa' | 'nedbank' | 'payfast' | 'yoco' | 'generic' | 'xero-import';

export interface ProfileConfig {
  name: Profile;
  dateAliases: string[];
  referenceAliases: string[];
  amountAliases: string[];
  debitAliases: string[];
  creditAliases: string[];
  descriptionAliases: string[];
  payeeAliases: string[];
  storeAliases: string[];
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
