/**
 * Types for Browns quote and invoice draft generation
 * CRITICAL: Never invent rates or totals - only use what's provided
 */

export interface QuoteInput {
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  suiteOrUnit: string;
  adults?: number;
  children?: number;
  notes?: string;
  channel?: string;
  nightlyRate?: number;
  nights?: number;
  total?: number;
  depositRequired?: number;
  currency?: string;
  includeProforma?: boolean;
  language?: 'en' | 'af';
}

export interface DraftOutputs {
  whatsappQuote: string;
  emailQuote: string;
  proformaEmail?: string;
  approval: string;
  manifest: DraftManifest;
}

export interface DraftManifest {
  generatedAt: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  suiteOrUnit: string;
  hasAmounts: boolean;
  includesProforma: boolean;
  files: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
