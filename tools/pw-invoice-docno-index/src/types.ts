/**
 * Core types for Perfect Water / CoS invoice Doc No indexer
 */

/**
 * Represents an indexed invoice with extracted Doc No
 */
export interface InvoiceEntry {
  /** Invoice document number (e.g., IN236058) */
  docNo: string;
  /** Original filename */
  filename: string;
  /** Full path (if from directory scan) */
  path?: string;
}

/**
 * Result of indexing operation
 */
export interface IndexResult {
  /** All indexed invoices */
  entries: InvoiceEntry[];
  /** Doc Nos that appear multiple times in the batch */
  duplicatesInBatch: Map<string, InvoiceEntry[]>;
  /** Doc Nos that were already in the known index */
  alreadyKnown: Set<string>;
  /** Doc Nos that are new (not in known index) */
  newDocNos: Set<string>;
  /** Total unique Doc Nos found */
  uniqueDocNos: number;
  /** Filenames that had no Doc No match */
  noMatch: string[];
}

/**
 * Manifest metadata for run tracking
 */
export interface Manifest {
  generatedAt: string;
  mode: 'directory' | 'files';
  inputPath: string;
  knownIndexProvided: boolean;
  totalFiles: number;
  totalMatched: number;
  totalNoMatch: number;
  uniqueDocNos: number;
  duplicatesInBatch: number;
  knownDocNos: number;
  newDocNos: number;
}
