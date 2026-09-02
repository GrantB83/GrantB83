/**
 * Metadata for a Suno job
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

/**
 * Configuration for job generation
 */
export interface JobConfig {
  lyrics: string;
  meta?: SunoMetadata;
  outdir: string;
}

/**
 * Output manifest for a Suno job
 */
export interface JobManifest {
  generated_at: string;
  title: string;
  artist: string;
  lyrics_file: string;
  prompt_file: string;
  style_file: string;
  title_file: string;
  checklist_file: string;
  metadata: SunoMetadata;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * CLI options
 */
export interface CliOptions {
  lyrics?: string;
  meta?: string;
  outdir?: string;
  help?: boolean;
}
