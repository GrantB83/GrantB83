/**
 * Type definitions for family-morning-digest-pipeline-pack
 */

export interface CliOptions {
  pack?: string;
  runMorningPack?: boolean;
  runPostChecklist?: boolean;
  date?: string;
  outdir?: string;
  help?: boolean;
  subjects?: string;
  ics?: string;
  timezone?: string;
  runSubjectDigest?: boolean;
  runIcsDigest?: boolean;
  schoolDueSubjects?: string;
  schoolDueFiles?: string;
  runSchoolDue?: boolean;
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
