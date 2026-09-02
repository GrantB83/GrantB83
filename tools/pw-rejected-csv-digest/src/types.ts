export interface RejectedRow {
  [key: string]: string;
}

export interface ReasonBucket {
  reason: string;
  count: number;
  sampleIndices?: number[];
}

export interface FileDigest {
  filename: string;
  label: string;
  totalRows: number;
  reasonBuckets: ReasonBucket[];
  missingHeaders: string[];
}

export interface DigestReport {
  timestamp: string;
  filesProcessed: FileDigest[];
  outputDir: string;
}
