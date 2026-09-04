/**
 * TypeScript type definitions for browns-guest-comms-pipeline-pack
 */

export interface CliOptions {
  booking?: string;
  bookings?: string;
  factsMd?: string;
  factsJson?: string;
  seeds?: string;
  outdir?: string;
  asOf?: string;
  runFacts?: boolean;
  runComms?: boolean;
  help?: boolean;
}

export interface StageOutput {
  success: boolean;
  outputDir?: string;
  error?: string;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  timestamp: string;
  date?: string;
  inputs: {
    bookingPath: string;
    factsMdPath: string | null;
    factsJsonPath: string | null;
    seedsPath: string | null;
  };
  runOptions: {
    ranFacts: boolean;
    ranComms: boolean;
  };
  files: ManifestFile[];
}

export interface ManifestFile {
  filename: string;
  type: string;
  description: string;
}

export interface PipelineResult {
  success: boolean;
  outdir: string;
  message: string;
  warnings: string[];
  manifest: PipelineManifest;
}
