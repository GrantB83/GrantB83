/**
 * CLI options
 */
export interface CliOptions {
  dir?: string;
  outdir?: string;
  driveUrl?: string;
  driveUrlFile?: string;
  video?: string;
  runValidate?: boolean;
  validateReport?: string;
  strict?: boolean;
  help?: boolean;
}

/**
 * Check result
 */
export interface CheckResult {
  passed: boolean;
  message: string;
  details?: string;
}

/**
 * Preflight report
 */
export interface PreflightReport {
  timestamp: string;
  package_dir: string;
  checks: {
    required_files: CheckResult;
    validate_report?: CheckResult;
    drive_url: CheckResult;
    video_exists?: CheckResult;
    pii_patterns: CheckResult;
  };
  summary: {
    total_checks: number;
    passed: number;
    failed: number;
    all_passed: boolean;
  };
  drive_url?: string;
  video_path?: string;
}

/**
 * Missing items
 */
export interface MissingItems {
  items: string[];
  blocking: boolean;
}
