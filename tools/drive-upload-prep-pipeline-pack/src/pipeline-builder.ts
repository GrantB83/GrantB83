/**
 * Pipeline Pack Builder
 * Orchestrates drive-create-file-validate → drive-pdf-upload-prep
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { PipelineManifest, PipelineResult, StageResult } from './types.js';

/**
 * Build pipeline pack
 */
export function buildPipeline(
  sourceFile: string,
  title: string | undefined,
  asOf: string | undefined,
  runValidate: boolean,
  runUploadPrep: boolean,
  maxB64: number | undefined,
  requirePdfMagic: boolean | undefined,
  parentId: string | undefined,
  outdir: string
): PipelineResult {
  // Validate source file exists
  if (!fs.existsSync(sourceFile)) {
    return { success: false, message: `Source file does not exist: ${sourceFile}` };
  }

  if (!fs.statSync(sourceFile).isFile()) {
    return { success: false, message: `Source path is not a file: ${sourceFile}` };
  }

  // Create pipeline pack output directory
  const timestamp = new Date().toISOString().split('T')[0];
  const pipelinePackDir = path.resolve(outdir, `drive-upload-prep-pack-${timestamp}`);
  if (!fs.existsSync(pipelinePackDir)) {
    fs.mkdirSync(pipelinePackDir, { recursive: true });
  }

  // Copy source file to pipeline pack
  const sourceBasename = path.basename(sourceFile);
  const destSourcePath = path.join(pipelinePackDir, sourceBasename);
  fs.copyFileSync(sourceFile, destSourcePath);

  let validationFailCount = 0;
  let uploadPrepFailCount = 0;

  // Run drive-create-file-validate if requested
  if (runValidate) {
    const validateResult = runDriveCreateFileValidate(
      sourceFile,
      pipelinePackDir,
      maxB64,
      requirePdfMagic
    );
    
    if (!validateResult.success) {
      validationFailCount = 1;
      console.log(`⚠️  Validation stage failed: ${validateResult.message}`);
    } else {
      console.log('✅ Validation stage completed successfully');
    }

    // Copy validation outputs
    if (validateResult.outputDir) {
      for (const file of ['valid.json', 'invalid.json', 'report.md']) {
        const srcPath = path.join(validateResult.outputDir, file);
        if (fs.existsSync(srcPath)) {
          const destPath = path.join(pipelinePackDir, `validate-${file}`);
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Clean up temporary validate directory
      fs.rmSync(validateResult.outputDir, { recursive: true, force: true });
    }
  }

  // Run drive-pdf-upload-prep if requested
  if (runUploadPrep) {
    if (!parentId) {
      return { success: false, message: 'parentId is required for upload-prep stage' };
    }

    const uploadPrepResult = runDrivePdfUploadPrep(
      sourceFile,
      parentId,
      pipelinePackDir,
      maxB64
    );
    
    if (!uploadPrepResult.success) {
      uploadPrepFailCount = 1;
      console.log(`⚠️  Upload prep stage failed: ${uploadPrepResult.message}`);
    } else {
      console.log('✅ Upload prep stage completed successfully');
    }

    // Copy upload prep outputs
    if (uploadPrepResult.outputDir) {
      for (const file of fs.readdirSync(uploadPrepResult.outputDir)) {
        const srcPath = path.join(uploadPrepResult.outputDir, file);
        if (fs.statSync(srcPath).isFile()) {
          const destPath = path.join(pipelinePackDir, `upload-prep-${file}`);
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Clean up temporary upload-prep directory
      fs.rmSync(uploadPrepResult.outputDir, { recursive: true, force: true });
    }
  }

  // Generate PACK.md index
  const packMd = generatePackIndex(
    pipelinePackDir,
    runValidate,
    runUploadPrep,
    validationFailCount,
    uploadPrepFailCount
  );
  fs.writeFileSync(path.join(pipelinePackDir, 'PACK.md'), packMd);

  // Generate APPROVAL.md
  const approvalMd = generateApprovalDocument();
  fs.writeFileSync(path.join(pipelinePackDir, 'APPROVAL.md'), approvalMd);

  // Generate manifest
  const manifest = generateManifest(
    sourceFile,
    title,
    asOf,
    runValidate,
    runUploadPrep,
    pipelinePackDir,
    validationFailCount,
    uploadPrepFailCount
  );
  fs.writeFileSync(
    path.join(pipelinePackDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  const allChecksPassed = validationFailCount === 0 && uploadPrepFailCount === 0;

  return {
    success: true,
    message: `Pipeline pack created successfully: ${pipelinePackDir}`,
    manifest,
    pipelinePackDir
  };
}

/**
 * Run drive-create-file-validate
 */
function runDriveCreateFileValidate(
  sourceFile: string,
  tempOutdir: string,
  maxB64: number | undefined,
  requirePdfMagic: boolean | undefined
): StageResult {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const validateToolPath = path.resolve(__dirname, '../../drive-create-file-validate');

  // Auto-install Python dependencies if needed
  const requirementsPath = path.join(validateToolPath, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    console.log('⚙️  Checking drive-create-file-validate dependencies...');
  }

  const validateOutdir = path.join(tempOutdir, 'validate-temp');
  fs.mkdirSync(validateOutdir, { recursive: true });

  // Resolve to absolute path for Python script
  const absoluteSourceFile = path.resolve(sourceFile);
  
  let cmd = `python3 validate.py --input-files "${absoluteSourceFile}" --outdir "${validateOutdir}"`;
  if (maxB64) cmd += ` --max-b64 ${maxB64}`;
  if (requirePdfMagic) cmd += ` --require-pdf-magic`;

  try {
    execSync(cmd, {
      cwd: validateToolPath,
      stdio: 'inherit'
    });

    return {
      success: true,
      message: 'Drive create-file validation completed successfully',
      outputDir: validateOutdir
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Drive create-file validation failed: ${errorMessage}`,
      outputDir: validateOutdir
    };
  }
}

/**
 * Run drive-pdf-upload-prep
 */
function runDrivePdfUploadPrep(
  sourceFile: string,
  parentId: string,
  tempOutdir: string,
  maxB64: number | undefined
): StageResult {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadPrepToolPath = path.resolve(__dirname, '../../drive-pdf-upload-prep');

  // Check if tool exists
  const uploadPrepScript = path.join(uploadPrepToolPath, 'upload_prep.py');
  if (!fs.existsSync(uploadPrepScript)) {
    return {
      success: false,
      message: `drive-pdf-upload-prep tool not found at: ${uploadPrepToolPath}`
    };
  }

  const uploadPrepOutdir = path.join(tempOutdir, 'upload-prep-temp');
  fs.mkdirSync(uploadPrepOutdir, { recursive: true });

  // Resolve to absolute path for Python script
  const absoluteSourceFile = path.resolve(sourceFile);
  
  let cmd = `python3 upload_prep.py --input-files "${absoluteSourceFile}" --parent-id "${parentId}" --output-dir "${uploadPrepOutdir}"`;
  if (maxB64) cmd += ` --max-b64 ${maxB64}`;

  try {
    execSync(cmd, {
      cwd: uploadPrepToolPath,
      stdio: 'inherit'
    });

    return {
      success: true,
      message: 'Drive PDF upload prep completed successfully',
      outputDir: uploadPrepOutdir
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Drive PDF upload prep failed: ${errorMessage}`,
      outputDir: uploadPrepOutdir
    };
  }
}

/**
 * Generate PACK.md index
 */
function generatePackIndex(
  pipelinePackDir: string,
  runValidate: boolean,
  runUploadPrep: boolean,
  validationFailCount: number,
  uploadPrepFailCount: number
): string {
  const lines: string[] = [];

  lines.push('# Drive Upload Prep Pipeline Pack');
  lines.push('');
  lines.push('Offline orchestrator for Drive handoff prep: metadata + checklist assembly.');
  lines.push('');
  lines.push('**Never uploads to Drive. Never invents Drive URLs or file IDs. Offline only.**');
  lines.push('');

  lines.push('## Contents');
  lines.push('');

  // Source file
  const sourceFiles = fs.readdirSync(pipelinePackDir).filter(f => 
    !f.startsWith('PACK') && 
    !f.startsWith('APPROVAL') && 
    !f.startsWith('manifest') &&
    !f.startsWith('validate-') &&
    !f.startsWith('upload-prep-') &&
    fs.statSync(path.join(pipelinePackDir, f)).isFile()
  );
  
  if (sourceFiles.length > 0) {
    lines.push('### Source Files');
    lines.push('');
    for (const file of sourceFiles) {
      lines.push(`- **${file}** — Source file`);
    }
    lines.push('');
  }

  // Validation files
  if (runValidate) {
    lines.push('### Validation Reports');
    lines.push('');
    const validateFiles = ['validate-valid.json', 'validate-invalid.json', 'validate-report.md'];
    for (const file of validateFiles) {
      if (fs.existsSync(path.join(pipelinePackDir, file))) {
        lines.push(`- **${file}** — From drive-create-file-validate`);
      }
    }
    lines.push('');
  }

  // Upload prep files
  if (runUploadPrep) {
    lines.push('### Upload Prep Payloads');
    lines.push('');
    const uploadPrepFiles = fs.readdirSync(pipelinePackDir).filter(f => f.startsWith('upload-prep-'));
    for (const file of uploadPrepFiles) {
      lines.push(`- **${file}** — From drive-pdf-upload-prep`);
    }
    lines.push('');
  }

  lines.push('## Pipeline Status');
  lines.push('');

  if (runValidate) {
    const status = validationFailCount === 0 ? '✅' : '❌';
    lines.push(`${status} **Validation:** ${validationFailCount === 0 ? 'Passed' : 'Failed'}`);
  } else {
    lines.push('⏭️  **Validation:** Skipped');
  }

  if (runUploadPrep) {
    const status = uploadPrepFailCount === 0 ? '✅' : '❌';
    lines.push(`${status} **Upload Prep:** ${uploadPrepFailCount === 0 ? 'Passed' : 'Failed'}`);
  } else {
    lines.push('⏭️  **Upload Prep:** Skipped');
  }
  lines.push('');

  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review validation reports (if present)');
  lines.push('2. Review upload prep payloads (if present)');
  lines.push('3. Check APPROVAL.md for workflow reminders');
  lines.push('4. Use approved connector/path for Drive upload');
  lines.push('5. Never auto-upload without human approval');
  lines.push('');

  lines.push('## Approval Gates');
  lines.push('');
  lines.push('- **Drive Upload:** Via approved connector/path only (REQUIRED)');
  lines.push('- **Human Review:** Grant must review before any upload (BLOCKING)');
  lines.push('- **No Auto-Upload:** Never auto-upload (NEVER)');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate APPROVAL.md document
 */
function generateApprovalDocument(): string {
  const lines: string[] = [];

  lines.push('# Drive Upload Prep Pipeline Pack — Approval Gates');
  lines.push('');
  lines.push('This pipeline pack is **offline only**. No Drive API calls. No uploads. No invented URLs.');
  lines.push('');

  lines.push('## Hard Rules');
  lines.push('');
  lines.push('1. **Never uploads to Drive** — No Drive API calls, no MCP calls');
  lines.push('2. **Never invents URLs/IDs** — No fabricated Drive links or file IDs');
  lines.push('3. **Offline only** — Metadata + checklist assembly only');
  lines.push('4. **Human approval required** — Grant must review before any upload');
  lines.push('5. **Approved connector only** — Use approved connector/path for upload');
  lines.push('');

  lines.push('## Workflow');
  lines.push('');
  lines.push('1. **Pipeline pack created** ← You are here');
  lines.push('2. **Human review** — Review PACK.md and outputs');
  lines.push('3. **Approval** — Grant approves upload plan');
  lines.push('4. **Upload via connector** — Use approved connector/path only');
  lines.push('5. **Verify upload** — Confirm files landed correctly');
  lines.push('');

  lines.push('## What This Tool Does NOT Do');
  lines.push('');
  lines.push('- ❌ No Drive API calls');
  lines.push('- ❌ No Drive uploads');
  lines.push('- ❌ No invented Drive URLs or file IDs');
  lines.push('- ❌ No browser automation');
  lines.push('- ❌ No auto-send of any kind');
  lines.push('');

  lines.push('## What This Tool DOES');
  lines.push('');
  lines.push('- ✅ Validates payloads (optional, when --run-validate)');
  lines.push('- ✅ Prepares upload payloads (default, drive-pdf-upload-prep)');
  lines.push('- ✅ Generates PACK.md index listing only files actually present');
  lines.push('- ✅ Generates manifest.json with accurate file inventory');
  lines.push('- ✅ Reminds about approval gates and offline-only nature');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate pipeline pack manifest
 */
function generateManifest(
  sourceFile: string,
  title: string | undefined,
  asOf: string | undefined,
  validateRan: boolean,
  uploadPrepRan: boolean,
  pipelinePackDir: string,
  validationFailCount: number,
  uploadPrepFailCount: number
): PipelineManifest {
  // Always include these files
  const files = ['PACK.md', 'APPROVAL.md', 'manifest.json'];

  // Add source file
  const sourceBasename = path.basename(sourceFile);
  if (fs.existsSync(path.join(pipelinePackDir, sourceBasename))) {
    files.push(sourceBasename);
  }

  // Validation files (only if validation ran)
  if (validateRan) {
    const validateFiles = ['validate-valid.json', 'validate-invalid.json', 'validate-report.md'];
    for (const file of validateFiles) {
      if (fs.existsSync(path.join(pipelinePackDir, file))) {
        files.push(file);
      }
    }
  }

  // Upload prep files (only if upload prep ran)
  if (uploadPrepRan) {
    const uploadPrepFiles = fs.readdirSync(pipelinePackDir).filter(f => f.startsWith('upload-prep-'));
    files.push(...uploadPrepFiles);
  }

  const allChecksPassed = validationFailCount === 0 && uploadPrepFailCount === 0;

  return {
    tool: 'drive-upload-prep-pipeline-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    sourceFile,
    title,
    asOf: asOf || new Date().toISOString().split('T')[0],
    validateRan,
    uploadPrepRan,
    allChecksPassed,
    validationFailCount,
    uploadPrepFailCount,
    files
  };
}
