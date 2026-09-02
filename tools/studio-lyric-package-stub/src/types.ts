/**
 * CLI options
 */
export interface CliOptions {
  lyrics?: string;
  title?: string;
  artist?: string;
  mood?: string;
  notes?: string;
  outdir?: string;
  help?: boolean;
}

/**
 * Package metadata
 */
export interface PackageMetadata {
  title: string;
  artist?: string;
  mood?: string;
  source: 'stub';
  createdAt: string;
  titleDerived?: boolean;
}

/**
 * Package manifest
 */
export interface PackageManifest {
  generated_at: string;
  tool: string;
  tool_version: string;
  input_lyrics: string;
  output_dir: string;
  metadata: PackageMetadata;
  files: {
    lyrics: string;
    checklist: string;
    approval: string;
    meta: string;
    manifest: string;
  };
}
