/**
 * Types for career-weekday-improve-pipeline-pack
 */

export interface CliOptions {
  pack?: string;
  runImprovePack?: boolean;
  runDigest?: boolean;
  runHuntLog?: boolean;
  date?: string;
  outdir?: string;
  log?: string;
  summary?: string;
  since?: string;
  help?: boolean;
}

export interface PipelineResult {
  success: boolean;
  message: string;
  pipelinePackPath?: string;
  warnings?: string[];
  digestOutput?: DigestOutput;
  huntLogOutput?: HuntLogOutput;
}

export interface DigestOutput {
  hasLearningDraft: boolean;
  hasStats: boolean;
  warnings: string[];
}

export interface HuntLogOutput {
  entriesAdded: number;
  totalLines: number;
  warnings: string[];
}

export interface PipelineManifest {
  tool: string;
  version: string;
  date: string;
  generatedAt: string;
  packPath?: string;
  improvePackRan: boolean;
  digestRan: boolean;
  huntLogRan: boolean;
  files: string[];
  inputs: {
    improvePack?: string;
    log?: string;
    summary?: string;
    since?: string;
  };
}
