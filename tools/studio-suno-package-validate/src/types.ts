/**
 * CLI options
 */
export interface CliOptions {
  dir?: string;
  outdir?: string;
  strict?: boolean;
  help?: boolean;
}

/**
 * Validation check result
 */
export interface CheckResult {
  passed: boolean;
  message: string;
  details?: string;
}

/**
 * Validation report
 */
export interface ValidationReport {
  timestamp: string;
  job_dir: string;
  checks: {
    required_files: CheckResult;
    meta_json_shape: CheckResult;
    lyrics_not_empty: CheckResult;
    no_pii_patterns: CheckResult;
    checklist_manual_paste: CheckResult;
  };
  summary: {
    total_checks: number;
    passed: number;
    failed: number;
    all_passed: boolean;
  };
}

/**
 * Expected Suno metadata shape
 */
export interface SunoMetadata {
  title?: string;
  artist?: string;
  kids?: string[];
  style?: string;
  mood?: string;
  duration_hint?: string;
  negative_prompts?: string[];
}
