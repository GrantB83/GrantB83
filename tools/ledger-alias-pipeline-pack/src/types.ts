/**
 * Type definitions for ledger-alias-pipeline-pack
 */

export interface CliOptions {
  unmatchedQueue?: string;
  merchants?: string;
  aliases?: string;
  suggestOutdir?: string;
  runSuggest?: boolean;
  runApplyChecklist?: boolean;
  month?: string;
  outdir?: string;
  help?: boolean;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  month: string | null;
  generatedAt: string;
  suggestRan: boolean;
  applyChecklistRan: boolean;
  suggestOutdir: string | null;
  inputFiles: {
    unmatchedQueue?: string;
    merchants?: string;
    aliases?: string;
  };
  files: string[];
}

export interface AssembleResult {
  success: boolean;
  message: string;
  outdir: string;
  files: string[];
}
