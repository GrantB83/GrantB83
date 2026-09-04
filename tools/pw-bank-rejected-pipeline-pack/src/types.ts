/**
 * TypeScript type definitions for pw-bank-rejected-pipeline-pack
 */

export interface CliOptions {
  // Input modes
  bankCsv?: string;                    // Raw bank CSV (requires --run-normalize)
  normalizedOutdir?: string;           // Prebuilt normalized output directory
  
  // Orchestration flags
  runNormalize: boolean;               // Run pw-bank-csv-normalize (default: false)
  runRejectedDigest: boolean;          // Run pw-rejected-csv-digest (default: true)
  
  // Output
  outdir: string;                      // Output directory (default: ./out)
  
  // Metadata
  help: boolean;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  timestamp: string;
  inputMode: 'bank-csv-with-normalize' | 'prebuilt-normalized';
  inputs: {
    bankCsv?: string;
    normalizedOutdir?: string;
  };
  operations: {
    normalize: boolean;
    rejectedDigest: boolean;
  };
  outputs: {
    packDir: string;
    files: string[];                   // Only files actually present (PR #116)
  };
  summary: {
    normalizedRows?: number;
    rejectedRows?: number;
  };
}
