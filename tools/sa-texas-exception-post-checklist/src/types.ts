export interface CliOptions {
  pack: string;
  outdir: string;
  date?: string;
}

export interface PackFiles {
  packMd: string;
  hospitalityMd: string;
  heavyMetalMd: string;
  approvalMd: string;
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
  checks: {
    [key: string]: CheckResult;
  };
}
