/**
 * Browns OTA Rate Pipeline Pack Types
 */

export interface CliOptions {
  rates?: string;
  rateCard?: string;
  promo?: string;
  asOf?: string;
  outdir?: string;
  runWorksheet?: boolean;
  help?: boolean;
}

export interface PipelineResult {
  success: boolean;
  outdir: string;
  message: string;
  warnings: string[];
  manifest: PipelineManifest;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  timestamp: string;
  date: string;
  inputs: {
    ratesPath: string;
    promoPath: string | null;
  };
  runOptions: {
    ranWorksheet: boolean;
  };
  files: ManifestFile[];
}

export interface ManifestFile {
  filename: string;
  type: string;
  description: string;
}

export interface StageOutput {
  success: boolean;
  outputDir?: string;
  error?: string;
}
