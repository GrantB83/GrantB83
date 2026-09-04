/**
 * Type definitions for attachment-filename-index-pipeline-pack
 */

export interface CliOptions {
  help?: boolean;
  files?: string;
  dir?: string;
  subjects?: string;
  runIndex?: boolean;
  asOf?: string;
  outdir?: string;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  asOf: string | null;
  generatedAt: string;
  indexRan: boolean;
  inputFiles: {
    filesPath?: string;
    dirPath?: string;
    subjectsPath?: string | null;
  };
  files: string[];
}

export interface AssembleResult {
  success: boolean;
  message: string;
  outdir: string;
  files: string[];
  warnings: string[];
  manifest: PipelineManifest;
}
