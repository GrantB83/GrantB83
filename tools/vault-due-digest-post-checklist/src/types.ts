/**
 * Type definitions for vault-due-digest-post-checklist
 */

export interface CliOptions {
  pack?: string;
  asOf?: string;
  outdir?: string;
  help?: boolean;
}

export interface PackFiles {
  digestMd?: string;
  masterMd?: string;
  approvalMd: string;
  byEntityDir?: string;
  missingSignalsMd?: string;
}

export interface CheckResult {
  passed: boolean;
  message: string;
}

export interface ChecklistManifest {
  date: string | null;
  generatedAt: string;
  packPath: string;
  outputs: string[];
  checks: { [key: string]: CheckResult };
}
