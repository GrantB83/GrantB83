/**
 * Type definitions for vault-entity-due-pipeline-pack
 */

export interface CliOptions {
  queue?: string;
  filenames?: string;
  entityMap?: string;
  runQueue?: boolean;
  runEntityPack?: boolean;
  asOf?: string;
  outdir?: string;
  help?: boolean;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  timestamp: string;
  asOf?: string;
  inputs: {
    queuePath: string | null;
    filenamesPath: string | null;
    entityMapPath: string | null;
  };
  runOptions: {
    ranFilenameQueue: boolean;
    ranEntityPack: boolean;
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
