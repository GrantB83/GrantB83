/**
 * Type definitions for pw-grv-stocktake-pipeline-pack
 */

export interface CliOptions {
  help?: boolean;
  grvNorm?: string;
  stockNorm?: string;
  grvRaw?: string;
  stockRaw?: string;
  diffOutdir?: string;
  runInventoryRecon?: boolean;
  skipDiff?: boolean;
  outdir?: string;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  generatedAt: string;
  operations: {
    grvNormalized: boolean;
    stocktakeNormalized: boolean;
    diffGenerated: boolean;
    inventoryReconRan: boolean;
  };
  inputs: {
    grvNorm?: string | null;
    stockNorm?: string | null;
    grvRaw?: string | null;
    stockRaw?: string | null;
    diffOutdir?: string | null;
  };
  files: string[];
}

export interface AssembleResult {
  success: boolean;
  message: string;
  outdir: string;
  files: string[];
}
