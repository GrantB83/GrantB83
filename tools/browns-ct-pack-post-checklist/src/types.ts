export interface CliOptions {
  pack: string;
  outdir: string;
  slot?: '20:00' | '09:00' | '21:00' | 'all';
}

export interface PackFiles {
  packMd: string;
  approvalMd: string;
  dailyOpsMd?: string;
  changesMd?: string;
  queueMd?: string;
  unknownTimeMd?: string;
  guestFiles: string[];
  welcomeFiles: string[];
}

export interface CheckResult {
  passed: boolean;
  message: string;
}

export interface ChecklistManifest {
  generatedAt: string;
  packPath: string;
  slot: string | null;
  outputs: string[];
  checks: {
    [key: string]: CheckResult;
  };
}
