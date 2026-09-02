/**
 * Type definitions for studio-brownie-pipeline-pack
 */

export interface CliOptions {
  help?: boolean;
  pack?: string;
  runLyricStub?: boolean;
  runSunoValidate?: boolean;
  runYoutubePreflight?: boolean;
  lyrics?: string;
  title?: string;
  artist?: string;
  mood?: string;
  notes?: string;
  driveUrl?: string;
  driveUrlFile?: string;
  video?: string;
  outdir?: string;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  generatedAt: string;
  packPath?: string;
  lyricStubRan: boolean;
  sunoValidateRan: boolean;
  youtubePreflightRan: boolean;
  allChecksPassed: boolean;
  validationCheckCount: number;
  validationPassCount: number;
  validationFailCount: number;
  preflightCheckCount: number;
  preflightPassCount: number;
  preflightFailCount: number;
  files: string[];
}

export interface StageResult {
  success: boolean;
  message: string;
  outputDir?: string;
}

export interface PipelineResult {
  success: boolean;
  message: string;
  manifest?: PipelineManifest;
  pipelinePackDir?: string;
}
