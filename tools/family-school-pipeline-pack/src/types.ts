/**
 * Type definitions for family-school-pipeline-pack
 */

export interface CliOptions {
  subjects?: string;
  input?: string;
  filenames?: string;
  ics?: string;
  date?: string;
  timezone?: string;
  outdir?: string;
  help?: boolean;
  runDigest?: boolean;
  runDueQueue?: boolean;
  runCalendar?: boolean;
}

export interface PackResult {
  success: boolean;
  message: string;
  warnings: string[];
  outdir?: string;
}

export interface StageResult {
  success: boolean;
  outputDir?: string;
  message?: string;
}

export interface PackManifest {
  tool: string;
  version: string;
  date: string;
  generatedAt: string;
  stages: {
    digest: boolean;
    dueQueue: boolean;
    calendar: boolean;
  };
  files: string[];
  warnings: string[];
}
