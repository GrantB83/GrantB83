export interface CLIArgs {
  grvPath?: string;
  stocktakePath?: string;
  grvRaw?: string;
  stockRaw?: string;
  runNormalize: boolean;
  runDiff: boolean;
  runRejectedDigest: boolean;
  diffOutdir?: string;
  rejectedOutdir?: string;
  outdir: string;
}

export interface PackMetadata {
  tool: string;
  version: string;
  timestamp: string;
  inputs: {
    grvPath?: string;
    stocktakePath?: string;
    grvRaw?: string;
    stockRaw?: string;
    diffOutdir?: string;
    rejectedOutdir?: string;
  };
  operations: {
    normalized: boolean;
    diffed: boolean;
    digestedRejected: boolean;
  };
  outputs: {
    packMd: string;
    approvalMd: string;
    manifestJson: string;
    diffMd?: string;
    diffJson?: string;
    missingKeysMd?: string;
    rejectedDigestMd?: string;
  };
  summary: {
    totalReceivedQty?: number;
    totalCountedQty?: number;
    totalDelta?: number;
    itemsCompared?: number;
    rejectedGrvRows?: number;
    rejectedStocktakeRows?: number;
  };
}
