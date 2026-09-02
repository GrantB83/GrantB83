/**
 * Types for family-digest-post-checklist
 */

export interface CliOptions {
  pack?: string;
  date?: string;
  outdir?: string;
  help?: boolean;
}

export interface CheckResult {
  passed: boolean;
  message: string;
}

export interface ChecklistOutput {
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    notes?: string;
  }>;
  allPassed: boolean;
  warnings: string[];
  failures: string[];
}

export interface ManifestData {
  tool: string;
  version: string;
  date: string;
  generatedAt: string;
  packPath: string;
  allPassed: boolean;
  checkCount: number;
  passCount: number;
  failCount: number;
  warningCount: number;
}
