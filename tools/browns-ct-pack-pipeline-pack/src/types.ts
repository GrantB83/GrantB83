/**
 * Type definitions for browns-ct-pack-pipeline-pack
 */

/**
 * CLI options
 */
export interface CliOptions {
  date?: string;
  outdir?: string;
  bookings?: string;
  changeCheck?: string;
  runChangeCheck?: boolean;
  runPostChecklist?: boolean;
  pack?: string;
  before?: string;
  after?: string;
  help?: boolean;
}

/**
 * Pipeline manifest
 */
export interface PipelineManifest {
  tool: string;
  version: string;
  timestamp: string;
  date: string;
  inputs: {
    bookingsPath: string | null;
    changeCheckPath: string | null;
    packPath: string | null;
    beforePath: string | null;
    afterPath: string | null;
  };
  runOptions: {
    ranChangeCheck: boolean;
    ranAssemble: boolean;
    ranPostChecklist: boolean;
  };
  files: Array<{
    filename: string;
    type: string;
    description: string;
  }>;
}

/**
 * Pipeline result
 */
export interface PipelineResult {
  success: boolean;
  outdir: string;
  manifest: PipelineManifest;
  warnings: string[];
}
