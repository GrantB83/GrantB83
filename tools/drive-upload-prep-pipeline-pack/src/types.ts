/**
 * Types for Drive Upload Prep Pipeline Pack
 */

export interface CliOptions {
  help?: boolean;
  sourceFile?: string;
  sourcePdf?: string;
  title?: string;
  outdir?: string;
  asOf?: string;
  runValidate?: boolean;
  runUploadPrep?: boolean;
  // drive-create-file-validate specific
  maxB64?: number;
  requirePdfMagic?: boolean;
  // drive-pdf-upload-prep specific
  parentId?: string;
}

export interface StageResult {
  success: boolean;
  message: string;
  outputDir?: string;
}

export interface PipelineManifest {
  tool: string;
  version: string;
  generatedAt: string;
  sourceFile?: string;
  title?: string;
  asOf?: string;
  validateRan: boolean;
  uploadPrepRan: boolean;
  allChecksPassed: boolean;
  validationFailCount: number;
  uploadPrepFailCount: number;
  files: string[];
}

export interface PipelineResult {
  success: boolean;
  message: string;
  manifest?: PipelineManifest;
  pipelinePackDir?: string;
}
