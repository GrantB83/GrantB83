/**
 * Types for ledger-month-close-pack CLI
 */

export interface CLIOptions {
  month: string; // YYYY-MM format
  exportsDir: string;
  outdir: string;
  unmatchedQueue?: string; // optional path to queue.md
  requireHeaders?: string; // comma-separated list
}

export interface CSVFileInfo {
  basename: string;
  path: string;
  size: number; // bytes
  mtime: string; // ISO8601
  headerRow: string; // first line only
  missingHeaders: string[]; // if --require-headers specified
}

export interface PackManifest {
  month: string;
  generatedAt: string;
  exportsDir: string;
  csvFiles: CSVFileInfo[];
  unmatchedQueueIncluded: boolean;
  totalFiles: number;
  totalSize: number;
  missingHeadersCount: number;
}
