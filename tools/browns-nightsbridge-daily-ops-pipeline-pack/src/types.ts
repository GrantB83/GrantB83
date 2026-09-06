/**
 * Browns Nightsbridge Daily Ops Pipeline Pack Types
 */

export interface CliOptions {
  input?: string;
  paste?: boolean;
  day?: string;
  asOf?: string;
  priorBookings?: string;
  facts?: string;
  outdir?: string;
  runAdapter?: boolean;
  runBrief?: boolean;
  runChangeCheck?: boolean;
  runLate?: boolean;
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
    inputPath: string | null;
    priorBookingsPath: string | null;
    factsPath: string | null;
  };
  runOptions: {
    ranAdapter: boolean;
    ranBrief: boolean;
    ranChangeCheck: boolean;
    ranLate: boolean;
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
