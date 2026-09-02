/**
 * Type definitions for ledger-month-close-pipeline-pack
 */

export interface CLIOptions {
  month: string;
  outdir: string;
  unmatchedOutdir?: string;
  suggestOutdir?: string;
  aliasChecklistOutdir?: string;
  closeOutdir?: string;
  runUnmatched?: boolean;
  runSuggest?: boolean;
  runAliasChecklist?: boolean;
  runClose?: boolean;
  transactions?: string;
  aliases?: string;
  exportsDir?: string;
}

export interface StageFile {
  stage: string;
  filename: string;
  sourcePath: string | null;
  present: boolean;
  description: string;
}

export interface PackManifest {
  tool: string;
  version: string;
  generatedAt: string;
  month: string;
  stages: {
    unmatchedQueue: boolean;
    aliasSuggest: boolean;
    aliasChecklist: boolean;
    monthClose: boolean;
  };
  files: StageFile[];
  totalStages: number;
}
