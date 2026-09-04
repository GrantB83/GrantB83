/**
 * TypeScript type definitions for pw-ordered-sold-pipeline-pack
 */

export interface CliOptions {
  help?: boolean;
  orderedCsv?: string;
  soldCsv?: string;
  salesCsv?: string;
  store?: string;
  outdir?: string;
  asOf?: string;
  runSales?: boolean;
  runDiff?: boolean;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  generatedAt: string;
  operations: {
    salesDigestRan: boolean;
    diffRan: boolean;
  };
  inputs: {
    orderedCsv: string | null;
    soldCsv: string | null;
    salesCsv: string | null;
    store: string | null;
    asOf: string | null;
  };
  files: string[];
}

export interface AssembleResult {
  success: boolean;
  message: string;
  outdir: string;
  files: string[];
}
