export interface CliOptions {
  input: string;
  outdir: string;
  merchantCol?: string;
  statusCol?: string;
  unmatchedValues?: string;
  limit?: number;
}

export interface ParsedRow {
  rowIndex: number;
  merchant: string;
  status?: string;
  date?: string;
  amount?: string;
  raw: Record<string, string>;
}

export interface MerchantGroup {
  normalizedName: string;
  displayName: string;
  count: number;
  firstDate?: string;
  lastDate?: string;
  sampleRows: number[];
  reason?: string;
}

export interface QueueOutput {
  merchants: MerchantGroup[];
  totalRows: number;
  totalUnmatched: number;
  generatedAt: string;
}

export interface ManifestOutput {
  tool: string;
  version: string;
  generatedAt: string;
  input: string;
  outputFiles: string[];
  stats: {
    totalRows: number;
    totalUnmatched: number;
    uniqueMerchants: number;
  };
}
