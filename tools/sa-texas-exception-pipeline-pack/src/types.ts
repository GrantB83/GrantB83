/**
 * Type definitions for sa-texas-exception-pipeline-pack
 */

export interface CliOptions {
  pack?: string;
  runMorningPack?: boolean;
  runPostChecklist?: boolean;
  date?: string;
  outdir?: string;
  help?: boolean;
  // Morning pack options (when --run-morning-pack is used)
  brownsBookings?: string;
  hmQuotesDir?: string;
  notes?: string;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  date: string;
  generatedAt: string;
  packPath: string;
  morningPackRan: boolean;
  postChecklistRan: boolean;
  allChecksPassed: boolean;
  checkCount: number;
  passCount: number;
  failCount: number;
  warningCount: number;
  files: string[];
}

export interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

export interface ChecklistOutput {
  allPassed: boolean;
  checks: CheckResult[];
  failures: string[];
  warnings: string[];
}
