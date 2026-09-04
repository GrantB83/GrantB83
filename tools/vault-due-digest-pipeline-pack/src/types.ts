/**
 * Type definitions for vault-due-digest-pipeline-pack
 */

export interface CliOptions {
  pack?: string;
  filenames?: string;
  runFilenameQueue?: boolean;
  runEntityPack?: boolean;
  runPostChecklist?: boolean;
  outdir?: string;
  help?: boolean;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  timestamp: string;
  inputs: {
    packPath: string | null;
    filenamesPath: string | null;
  };
  runOptions: {
    ranFilenameQueue: boolean;
    ranEntityPack: boolean;
    ranDigestPack: boolean;
    ranPostChecklist: boolean;
  };
  files: Array<{
    filename: string;
    type: string;
    description: string;
  }>;
}

export interface PipelineResult {
  success: boolean;
  message: string;
  outdir: string;
  manifest: PipelineManifest;
  warnings: string[];
}
