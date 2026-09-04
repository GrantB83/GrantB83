/**
 * Browns Welcome Late Pipeline Pack Types
 */

export interface CliOptions {
  bookings?: string;
  day?: string;
  asOf?: string;
  facts?: string;
  outdir?: string;
  runWelcome?: boolean;
  runLate?: boolean;
  runDailyOps?: boolean;
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
    bookingsPath: string | null;
    factsPath: string | null;
  };
  runOptions: {
    ranWelcome: boolean;
    ranLate: boolean;
    ranDailyOps: boolean;
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
