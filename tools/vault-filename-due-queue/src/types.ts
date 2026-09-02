export type DocumentCategory = 
  | 'cipc-annual-return'
  | 'cipc-change-form'
  | 'cipc-certificate'
  | 'sars-annual-tax-return'
  | 'sars-provisional-tax'
  | 'sars-vat-return'
  | 'sars-emp-return'
  | 'sars-correspondence'
  | 'bee-affidavit'
  | 'bee-certificate'
  | 'trust-distribution'
  | 'trust-resolution'
  | 'trust-compliance'
  | 'property-rates'
  | 'property-levies'
  | 'insurance-renewal'
  | 'forex-application'
  | 'bank-statement'
  | 'attorney-letter'
  | 'other-compliance'
  | 'unknown';

export interface QueueEntry {
  filename: string;
  category: DocumentCategory;
  dateTokens: string[];
  dueStatus: 'has-date' | 'unknown-due' | 'no-date-pattern';
  confidence: 'high' | 'medium' | 'low';
  signals: string[];
  notes: string;
}

export interface QueueResult {
  entries: QueueEntry[];
  summary: {
    totalFiles: number;
    byCategory: Record<DocumentCategory, number>;
    filesWithDates: number;
    filesUnknownDue: number;
    filesNoDatePattern: number;
  };
}
