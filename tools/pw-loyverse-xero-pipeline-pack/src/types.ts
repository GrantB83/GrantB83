/**
 * TypeScript type definitions for pw-loyverse-xero-pipeline-pack
 */

export interface CliOptions {
  help?: boolean;
  loyverseCsv?: string;
  xeroCsv?: string;
  mode?: 'receipt' | 'summary';
  outdir?: string;
  asOf?: string;
  runRecon?: boolean;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  generatedAt: string;
  operations: {
    reconRan: boolean;
  };
  inputs: {
    loyverseCsv: string | null;
    xeroCsv: string | null;
    mode: string | null;
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
