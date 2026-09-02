/**
 * Pipeline Pack Builder
 * Orchestrates studio-lyric-package-stub → studio-suno-package-validate → studio-youtube-preflight-pack
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { CliOptions, PipelineManifest, PipelineResult, StageResult } from './types.js';

/**
 * Build pipeline pack from existing lyric package
 */
export function buildPipelineFromExistingPack(
  packPath: string,
  runSunoValidate: boolean,
  runYoutubePreflight: boolean,
  driveUrl: string | undefined,
  driveUrlFile: string | undefined,
  video: string | undefined,
  outdir: string
): PipelineResult {
  // Validate pack path exists
  if (!fs.existsSync(packPath)) {
    return { success: false, message: `Pack path does not exist: ${packPath}` };
  }

  if (!fs.statSync(packPath).isDirectory()) {
    return { success: false, message: `Pack path is not a directory: ${packPath}` };
  }

  // Validate required lyric package files
  const requiredFiles = ['lyrics.cleaned.txt', 'checklist.md', 'manifest.json'];
  for (const file of requiredFiles) {
    const filePath = path.join(packPath, file);
    if (!fs.existsSync(filePath)) {
      return { success: false, message: `Missing required file in pack: ${file}` };
    }
  }

  // Create pipeline pack output directory
  const timestamp = new Date().toISOString().split('T')[0];
  const pipelinePackDir = path.resolve(outdir, `brownie-pipeline-pack-${timestamp}`);
  if (!fs.existsSync(pipelinePackDir)) {
    fs.mkdirSync(pipelinePackDir, { recursive: true });
  }

  // Copy core lyric package files to pipeline pack
  for (const file of ['lyrics.cleaned.txt', 'meta.json', 'checklist.md', 'manifest.json']) {
    const srcPath = path.join(packPath, file);
    const destPath = path.join(pipelinePackDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  let validationCheckCount = 0;
  let validationPassCount = 0;
  let validationFailCount = 0;
  let preflightCheckCount = 0;
  let preflightPassCount = 0;
  let preflightFailCount = 0;

  // Run suno-package-validate if requested
  if (runSunoValidate) {
    const validateResult = runSunoPackageValidate(packPath, pipelinePackDir);
    if (!validateResult.success) {
      return { success: false, message: validateResult.message };
    }

    // Copy validation outputs
    if (validateResult.outputDir) {
      for (const file of ['report.json', 'report.md', 'APPROVAL.md']) {
        const srcPath = path.join(validateResult.outputDir, file);
        if (fs.existsSync(srcPath)) {
          const destPath = path.join(pipelinePackDir, `validate-${file}`);
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Extract validation summary
      const reportPath = path.join(validateResult.outputDir, 'report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        validationCheckCount = report.summary?.total_checks || 0;
        validationPassCount = report.summary?.passed || 0;
        validationFailCount = report.summary?.failed || 0;
      }

      // Clean up temporary validate directory
      fs.rmSync(validateResult.outputDir, { recursive: true, force: true });
    }
  }

  // Run youtube-preflight-pack if requested
  if (runYoutubePreflight) {
    const preflightResult = runYoutubePreflightPack(
      packPath,
      pipelinePackDir,
      driveUrl,
      driveUrlFile,
      video
    );
    if (!preflightResult.success) {
      return { success: false, message: preflightResult.message };
    }

    // Copy preflight outputs
    if (preflightResult.outputDir) {
      for (const file of ['PREFLIGHT.md', 'APPROVAL.md', 'missing.md', 'manifest.json']) {
        const srcPath = path.join(preflightResult.outputDir, file);
        if (fs.existsSync(srcPath)) {
          const destPath = path.join(pipelinePackDir, `preflight-${file}`);
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Extract preflight summary
      const manifestPath = path.join(preflightResult.outputDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        preflightCheckCount = manifest.summary?.total_checks || 0;
        preflightPassCount = manifest.summary?.passed || 0;
        preflightFailCount = manifest.summary?.failed || 0;
      }

      // Clean up temporary preflight directory
      fs.rmSync(preflightResult.outputDir, { recursive: true, force: true });
    }
  }

  // Generate PACK.md index
  const packMd = generatePackIndex(
    pipelinePackDir,
    runSunoValidate,
    runYoutubePreflight,
    validationPassCount,
    validationCheckCount,
    preflightPassCount,
    preflightCheckCount
  );
  fs.writeFileSync(path.join(pipelinePackDir, 'PACK.md'), packMd);

  // Generate APPROVAL.md
  const approvalMd = generateApprovalDocument();
  fs.writeFileSync(path.join(pipelinePackDir, 'APPROVAL.md'), approvalMd);

  // Generate manifest
  const manifest = generateManifest(
    packPath,
    false,
    runSunoValidate,
    runYoutubePreflight,
    pipelinePackDir,
    validationCheckCount,
    validationPassCount,
    validationFailCount,
    preflightCheckCount,
    preflightPassCount,
    preflightFailCount
  );
  fs.writeFileSync(
    path.join(pipelinePackDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  const allChecksPassed =
    (!runSunoValidate || validationFailCount === 0) &&
    (!runYoutubePreflight || preflightFailCount === 0);

  return {
    success: true,
    message: `Pipeline pack created successfully: ${pipelinePackDir}`,
    manifest,
    pipelinePackDir
  };
}

/**
 * Build pipeline pack by running lyric-package-stub first
 */
export function buildPipelineWithLyricStub(
  lyrics: string,
  title: string | undefined,
  artist: string | undefined,
  mood: string | undefined,
  notes: string | undefined,
  runSunoValidate: boolean,
  runYoutubePreflight: boolean,
  driveUrl: string | undefined,
  driveUrlFile: string | undefined,
  video: string | undefined,
  outdir: string
): PipelineResult {
  // Create temporary lyric package
  const tempPackDir = path.join(outdir, 'temp-lyric-package');
  fs.mkdirSync(tempPackDir, { recursive: true });

  const stubResult = runLyricPackageStub(
    lyrics,
    title,
    artist,
    mood,
    notes,
    tempPackDir
  );

  if (!stubResult.success || !stubResult.outputDir) {
    return { success: false, message: stubResult.message };
  }

  // Now build pipeline pack from the stub
  const result = buildPipelineFromExistingPack(
    stubResult.outputDir,
    runSunoValidate,
    runYoutubePreflight,
    driveUrl,
    driveUrlFile,
    video,
    outdir
  );

  // Clean up temporary stub directory
  fs.rmSync(tempPackDir, { recursive: true, force: true });

  return result;
}

/**
 * Run studio-lyric-package-stub
 */
function runLyricPackageStub(
  lyrics: string,
  title: string | undefined,
  artist: string | undefined,
  mood: string | undefined,
  notes: string | undefined,
  outdir: string
): StageResult {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const stubToolPath = path.resolve(__dirname, '../../studio-lyric-package-stub');

  let cmd = `npm run stub -- --lyrics "${lyrics}" --outdir "${outdir}"`;
  if (title) cmd += ` --title "${title}"`;
  if (artist) cmd += ` --artist "${artist}"`;
  if (mood) cmd += ` --mood "${mood}"`;
  if (notes) cmd += ` --notes "${notes}"`;

  try {
    execSync(cmd, {
      cwd: stubToolPath,
      stdio: 'inherit'
    });

    // Find the generated package directory
    const dirs = fs.readdirSync(outdir);
    const outputDir = dirs.length > 0 ? path.join(outdir, dirs[0]) : undefined;

    return {
      success: true,
      message: 'Lyric package stub created successfully',
      outputDir
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Lyric package stub failed: ${errorMessage}`
    };
  }
}

/**
 * Run studio-suno-package-validate
 */
function runSunoPackageValidate(
  packageDir: string,
  tempOutdir: string
): StageResult {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const validateToolPath = path.resolve(__dirname, '../../studio-suno-package-validate');

  const validateOutdir = path.join(tempOutdir, 'validate-temp');
  fs.mkdirSync(validateOutdir, { recursive: true });

  try {
    execSync(
      `npm run validate -- --dir "${packageDir}" --outdir "${validateOutdir}"`,
      {
        cwd: validateToolPath,
        stdio: 'inherit'
      }
    );

    return {
      success: true,
      message: 'Suno package validation completed successfully',
      outputDir: validateOutdir
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Suno package validation failed: ${errorMessage}`
    };
  }
}

/**
 * Run studio-youtube-preflight-pack
 */
function runYoutubePreflightPack(
  packageDir: string,
  tempOutdir: string,
  driveUrl: string | undefined,
  driveUrlFile: string | undefined,
  video: string | undefined
): StageResult {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const preflightToolPath = path.resolve(__dirname, '../../studio-youtube-preflight-pack');

  const preflightOutdir = path.join(tempOutdir, 'preflight-temp');
  fs.mkdirSync(preflightOutdir, { recursive: true });

  let cmd = `npm run preflight -- --dir "${packageDir}" --outdir "${preflightOutdir}"`;
  if (driveUrl) cmd += ` --drive-url "${driveUrl}"`;
  if (driveUrlFile) cmd += ` --drive-url-file "${driveUrlFile}"`;
  if (video) cmd += ` --video "${video}"`;

  try {
    execSync(cmd, {
      cwd: preflightToolPath,
      stdio: 'inherit'
    });

    return {
      success: true,
      message: 'YouTube preflight pack completed successfully',
      outputDir: preflightOutdir
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `YouTube preflight pack failed: ${errorMessage}`
    };
  }
}

/**
 * Generate PACK.md index
 */
function generatePackIndex(
  pipelinePackDir: string,
  runSunoValidate: boolean,
  runYoutubePreflight: boolean,
  validationPassCount: number,
  validationCheckCount: number,
  preflightPassCount: number,
  preflightCheckCount: number
): string {
  const lines: string[] = [];

  lines.push('# BrownieTunez Pipeline Pack');
  lines.push('');
  lines.push('Offline orchestrator assembling lyric package validation and YouTube preflight checks.');
  lines.push('');
  lines.push('**Never uploads to YouTube. Never invents lyrics. Kids BrownieTunez only.**');
  lines.push('');

  lines.push('## Contents');
  lines.push('');

  // Core files
  lines.push('### Core Lyric Package Files');
  lines.push('');
  const coreFiles = ['lyrics.cleaned.txt', 'meta.json', 'checklist.md'];
  for (const file of coreFiles) {
    if (fs.existsSync(path.join(pipelinePackDir, file))) {
      lines.push(`- **${file}** — From lyric package`);
    }
  }
  lines.push('');

  // Validation files
  if (runSunoValidate) {
    lines.push('### Validation Reports');
    lines.push('');
    const validateFiles = ['validate-report.json', 'validate-report.md', 'validate-APPROVAL.md'];
    for (const file of validateFiles) {
      if (fs.existsSync(path.join(pipelinePackDir, file))) {
        lines.push(`- **${file}** — From studio-suno-package-validate`);
      }
    }
    lines.push('');
  }

  // Preflight files
  if (runYoutubePreflight) {
    lines.push('### Preflight Reports');
    lines.push('');
    const preflightFiles = ['preflight-PREFLIGHT.md', 'preflight-APPROVAL.md', 'preflight-missing.md'];
    for (const file of preflightFiles) {
      if (fs.existsSync(path.join(pipelinePackDir, file))) {
        lines.push(`- **${file}** — From studio-youtube-preflight-pack`);
      }
    }
    lines.push('');
  }

  lines.push('## Pipeline Status');
  lines.push('');

  if (runSunoValidate) {
    const status = validationPassCount === validationCheckCount ? '✅' : '❌';
    lines.push(`${status} **Validation:** ${validationPassCount}/${validationCheckCount} checks passed`);
  } else {
    lines.push('⏭️  **Validation:** Skipped');
  }

  if (runYoutubePreflight) {
    const status = preflightPassCount === preflightCheckCount ? '✅' : '❌';
    lines.push(`${status} **Preflight:** ${preflightPassCount}/${preflightCheckCount} checks passed`);
  } else {
    lines.push('⏭️  **Preflight:** Skipped');
  }
  lines.push('');

  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review validation reports (if present)');
  lines.push('2. Review preflight reports (if present)');
  lines.push('3. Check APPROVAL.md for workflow reminders');
  lines.push('4. Finished video goes on thebrownsusa Drive');
  lines.push('5. Grant approves in CoS chat before any YouTube upload');
  lines.push('');

  lines.push('## Approval Gates');
  lines.push('');
  lines.push('- **Drive Upload:** Finished video → thebrownsusa Drive (REQUIRED)');
  lines.push('- **CoS Approval:** Grant must approve in CoS chat (BLOCKING)');
  lines.push('- **YouTube Upload:** Only after Grant approval (NEVER AUTO-UPLOAD)');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate APPROVAL.md document
 */
function generateApprovalDocument(): string {
  const lines: string[] = [];

  lines.push('# BrownieTunez Pipeline Pack — Approval Gates');
  lines.push('');
  lines.push('This pipeline pack is **offline only**. No YouTube upload. No Suno API spend. No invented lyrics.');
  lines.push('');

  lines.push('## Hard Rules');
  lines.push('');
  lines.push('1. **Never uploads to YouTube** — No YouTube API calls, no browser automation');
  lines.push('2. **Never invents lyrics** — Exact copy from input only');
  lines.push('3. **Kids BrownieTunez only** — Follow brownietunez-pipeline skill gates');
  lines.push('4. **Drive approval required** — Finished video → thebrownsusa Drive');
  lines.push('5. **Grant approval required** — Grant must approve in CoS chat before any YouTube upload');
  lines.push('');

  lines.push('## Workflow');
  lines.push('');
  lines.push('1. **Pipeline pack created** ← You are here');
  lines.push('2. **Video production** — Manual Suno paste + video creation');
  lines.push('3. **Upload to Drive** — Finished video → thebrownsusa Drive (REQUIRED)');
  lines.push('4. **Request approval** — Share Drive link with Grant in CoS chat');
  lines.push('5. **Grant reviews** — Grant approves or requests changes');
  lines.push('6. **YouTube upload** — Only after Grant approval (NEVER AUTO-UPLOAD)');
  lines.push('');

  lines.push('## What This Tool Does NOT Do');
  lines.push('');
  lines.push('- ❌ No YouTube uploads');
  lines.push('- ❌ No Suno API calls (official or unofficial)');
  lines.push('- ❌ No Google Drive uploads');
  lines.push('- ❌ No browser automation');
  lines.push('- ❌ No invented lyrics or titles');
  lines.push('- ❌ No auto-send of any kind');
  lines.push('');

  lines.push('## What This Tool DOES');
  lines.push('');
  lines.push('- ✅ Assembles offline pipeline pack from existing lyric package');
  lines.push('- ✅ Runs studio-suno-package-validate (optional, default ON)');
  lines.push('- ✅ Runs studio-youtube-preflight-pack (optional, default ON)');
  lines.push('- ✅ Generates PACK.md index listing only files actually present');
  lines.push('- ✅ Generates manifest.json with accurate file inventory');
  lines.push('- ✅ Reminds about Drive approval and CoS approval gates');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate pipeline pack manifest
 */
function generateManifest(
  packPath: string | undefined,
  lyricStubRan: boolean,
  sunoValidateRan: boolean,
  youtubePreflightRan: boolean,
  pipelinePackDir: string,
  validationCheckCount: number,
  validationPassCount: number,
  validationFailCount: number,
  preflightCheckCount: number,
  preflightPassCount: number,
  preflightFailCount: number
): PipelineManifest {
  // Always include these files
  const files = ['PACK.md', 'APPROVAL.md', 'manifest.json'];

  // Core lyric package files (always present)
  const coreFiles = ['lyrics.cleaned.txt', 'meta.json', 'checklist.md'];
  for (const file of coreFiles) {
    if (fs.existsSync(path.join(pipelinePackDir, file))) {
      files.push(file);
    }
  }

  // Validation files (only if validation ran)
  if (sunoValidateRan) {
    const validateFiles = ['validate-report.json', 'validate-report.md', 'validate-APPROVAL.md', 'validate-manifest.json'];
    for (const file of validateFiles) {
      if (fs.existsSync(path.join(pipelinePackDir, file))) {
        files.push(file);
      }
    }
  }

  // Preflight files (only if preflight ran)
  if (youtubePreflightRan) {
    const preflightFiles = ['preflight-PREFLIGHT.md', 'preflight-APPROVAL.md', 'preflight-missing.md', 'preflight-manifest.json'];
    for (const file of preflightFiles) {
      if (fs.existsSync(path.join(pipelinePackDir, file))) {
        files.push(file);
      }
    }
  }

  const allChecksPassed =
    (!sunoValidateRan || validationFailCount === 0) &&
    (!youtubePreflightRan || preflightFailCount === 0);

  return {
    tool: 'studio-brownie-pipeline-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    packPath,
    lyricStubRan,
    sunoValidateRan,
    youtubePreflightRan,
    allChecksPassed,
    validationCheckCount,
    validationPassCount,
    validationFailCount,
    preflightCheckCount,
    preflightPassCount,
    preflightFailCount,
    files
  };
}
