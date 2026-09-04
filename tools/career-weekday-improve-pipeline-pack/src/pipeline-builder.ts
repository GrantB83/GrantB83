/**
 * Pipeline Pack Builder
 * Assembles career-weekday-improve-pack with optional digest and hunt-log
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { PipelineResult, DigestOutput, HuntLogOutput, PipelineManifest } from './types.js';

/**
 * Build pipeline pack from existing improve pack
 */
export function buildPipelineFromExistingPack(
  packPath: string,
  runDigest: boolean,
  runHuntLog: boolean,
  outdir: string,
  date: string,
  log?: string,
  summary?: string,
  since?: string
): PipelineResult {
  // Validate pack path exists
  if (!fs.existsSync(packPath)) {
    return { success: false, message: `Pack path does not exist: ${packPath}` };
  }

  if (!fs.statSync(packPath).isDirectory()) {
    return { success: false, message: `Pack path is not a directory: ${packPath}` };
  }

  // Validate required improve pack files
  const requiredFiles = ['PACK.md', 'LEARNING-DRAFT.md', 'APPROVAL.md'];
  for (const file of requiredFiles) {
    const filePath = path.join(packPath, file);
    if (!fs.existsSync(filePath)) {
      return { success: false, message: `Missing required file in pack: ${file}` };
    }
  }

  // Create pipeline pack output directory
  const pipelinePack = path.resolve(outdir, `pipeline-pack-${date}`);
  if (!fs.existsSync(pipelinePack)) {
    fs.mkdirSync(pipelinePack, { recursive: true });
  }

  // Copy improve pack files to pipeline pack
  const improvePackFiles = ['PACK.md', 'LEARNING-DRAFT.md', 'stats.json', 'runs.md', 'APPROVAL.md'];
  for (const file of improvePackFiles) {
    const srcPath = path.join(packPath, file);
    const destPath = path.join(pipelinePack, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  const warnings: string[] = [];
  let digestOutput: DigestOutput | undefined;
  let huntLogOutput: HuntLogOutput | undefined;

  // Run digest if requested (default ON)
  if (runDigest) {
    const digestResult = runDigestTool(packPath, pipelinePack, log, summary, since);
    if (!digestResult.success) {
      return digestResult;
    }
    digestOutput = digestResult.digestOutput;
    if (digestOutput?.warnings) {
      warnings.push(...digestOutput.warnings);
    }
  }

  // Run hunt-log if requested (default OFF)
  if (runHuntLog) {
    if (!log && !summary) {
      return { 
        success: false, 
        message: 'Hunt log requires --log or --summary input' 
      };
    }
    const huntLogResult = runHuntLogTool(date, log, summary, pipelinePack);
    if (!huntLogResult.success) {
      return huntLogResult;
    }
    huntLogOutput = huntLogResult.huntLogOutput;
    if (huntLogOutput?.warnings) {
      warnings.push(...huntLogOutput.warnings);
    }
  }

  // Generate pipeline PACK.md index
  const packMd = generatePackIndex(
    packPath, 
    date, 
    runDigest, 
    runHuntLog, 
    digestOutput, 
    huntLogOutput
  );
  fs.writeFileSync(path.join(pipelinePack, 'PACK.md'), packMd);

  // Generate APPROVAL.md
  const approvalMd = generateApprovalDoc();
  fs.writeFileSync(path.join(pipelinePack, 'APPROVAL.md'), approvalMd);

  // Generate manifest
  const manifest = generateManifest(
    packPath,
    date,
    false,
    runDigest,
    runHuntLog,
    pipelinePack,
    log,
    summary,
    since
  );
  fs.writeFileSync(
    path.join(pipelinePack, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  return {
    success: true,
    message: `Pipeline pack created successfully: ${pipelinePack}`,
    pipelinePackPath: pipelinePack,
    warnings: warnings.length > 0 ? warnings : undefined,
    digestOutput,
    huntLogOutput
  };
}

/**
 * Build pipeline pack by running improve pack first
 */
export function buildPipelineWithImprovePack(
  date: string,
  log: string | undefined,
  summary: string | undefined,
  runDigest: boolean,
  runHuntLog: boolean,
  outdir: string,
  since?: string
): PipelineResult {
  // Build improve pack first
  const improvePackDir = path.join(outdir, 'improve-pack-temp');
  fs.mkdirSync(improvePackDir, { recursive: true });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const improvePackToolPath = path.resolve(
    __dirname,
    '../../career-weekday-improve-pack'
  );

  let improvePackCmd = `npm run pack -- --outdir "${improvePackDir}"`;

  // Improve pack needs either --digest-outdir or --run-digest with inputs
  if (log) {
    improvePackCmd += ` --run-digest --log "${log}"`;
  } else if (summary) {
    improvePackCmd += ` --run-digest --summary "${summary}"`;
  } else {
    return {
      success: false,
      message: 'Running improve pack requires --log or --summary input'
    };
  }

  if (since) {
    improvePackCmd += ` --since "${since}"`;
  }

  try {
    execSync(improvePackCmd, {
      cwd: improvePackToolPath,
      stdio: 'inherit'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Improve pack generation failed: ${errorMessage}`
    };
  }

  // Find the generated improve pack
  const improvePackPath = path.join(improvePackDir, `pack-${date}`);
  if (!fs.existsSync(improvePackPath)) {
    // Try without date suffix (improve pack might use different naming)
    const dirs = fs.readdirSync(improvePackDir);
    if (dirs.length === 0) {
      return {
        success: false,
        message: `No improve pack found in ${improvePackDir}`
      };
    }
    // Use first directory found
    const foundPack = path.join(improvePackDir, dirs[0]);
    return buildPipelineFromExistingPack(
      foundPack,
      runDigest,
      runHuntLog,
      outdir,
      date,
      log,
      summary,
      since
    );
  }

  // Now build pipeline pack from the improve pack
  const result = buildPipelineFromExistingPack(
    improvePackPath,
    runDigest,
    runHuntLog,
    outdir,
    date,
    log,
    summary,
    since
  );

  // Clean up temporary improve pack directory
  fs.rmSync(improvePackDir, { recursive: true, force: true });

  return result;
}

/**
 * Run career-live-improve-digest tool
 */
function runDigestTool(
  improvePack: string,
  pipelinePack: string,
  log?: string,
  summary?: string,
  since?: string
): PipelineResult & { digestOutput?: DigestOutput } {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const digestToolPath = path.resolve(
    __dirname,
    '../../career-live-improve-digest'
  );

  // Digest needs either log or summary from improve pack or passed in
  let digestLog = log;
  let digestSummary = summary;

  if (!digestLog && !digestSummary) {
    // Try to find inputs in improve pack
    const logPath = path.join(improvePack, 'runs.jsonl');
    const summaryPath = path.join(improvePack, 'runs.md');
    
    if (fs.existsSync(logPath)) {
      digestLog = logPath;
    } else if (fs.existsSync(summaryPath)) {
      digestSummary = summaryPath;
    } else {
      return {
        success: false,
        message: 'Cannot run digest: no log or summary found in improve pack or provided'
      };
    }
  }

  const digestOutdir = path.join(pipelinePack, 'digest-output-temp');
  fs.mkdirSync(digestOutdir, { recursive: true });

  let digestCmd = `npm run digest -- --outdir "${digestOutdir}"`;
  if (digestLog) {
    digestCmd += ` --log "${digestLog}"`;
  }
  if (digestSummary) {
    digestCmd += ` --summary "${digestSummary}"`;
  }
  if (since) {
    digestCmd += ` --since "${since}"`;
  }

  try {
    execSync(digestCmd, {
      cwd: digestToolPath,
      stdio: 'inherit'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Digest tool failed: ${errorMessage}`
    };
  }

  // Copy digest outputs to pipeline pack
  const digestWarnings: string[] = [];
  let hasLearningDraft = false;
  let hasStats = false;

  const learningDraftPath = path.join(digestOutdir, 'LEARNING-DRAFT.md');
  if (fs.existsSync(learningDraftPath)) {
    fs.copyFileSync(learningDraftPath, path.join(pipelinePack, 'DIGEST-LEARNING-DRAFT.md'));
    hasLearningDraft = true;
  } else {
    digestWarnings.push('Digest did not produce LEARNING-DRAFT.md');
  }

  const statsPath = path.join(digestOutdir, 'stats.json');
  if (fs.existsSync(statsPath)) {
    fs.copyFileSync(statsPath, path.join(pipelinePack, 'DIGEST-stats.json'));
    hasStats = true;
  } else {
    digestWarnings.push('Digest did not produce stats.json');
  }

  // Clean up temporary digest directory
  fs.rmSync(digestOutdir, { recursive: true, force: true });

  return {
    success: true,
    message: 'Digest completed',
    digestOutput: {
      hasLearningDraft,
      hasStats,
      warnings: digestWarnings
    }
  };
}

/**
 * Run career-hunt-run-log tool
 */
function runHuntLogTool(
  date: string,
  log: string | undefined,
  summary: string | undefined,
  pipelinePack: string
): PipelineResult & { huntLogOutput?: HuntLogOutput } {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const huntLogToolPath = path.resolve(
    __dirname,
    '../../career-hunt-run-log'
  );

  const huntLogOutdir = path.join(pipelinePack, 'hunt-log-output-temp');
  fs.mkdirSync(huntLogOutdir, { recursive: true });

  let huntLogCmd = `npm run log -- --date "${date}" --outdir "${huntLogOutdir}"`;
  
  if (log) {
    huntLogCmd += ` --log "${log}"`;
  }
  if (summary) {
    huntLogCmd += ` --summary "${summary}"`;
  }

  try {
    execSync(huntLogCmd, {
      cwd: huntLogToolPath,
      stdio: 'inherit'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Hunt log tool failed: ${errorMessage}`
    };
  }

  // Copy hunt log outputs to pipeline pack
  const huntLogWarnings: string[] = [];
  let entriesAdded = 0;
  let totalLines = 0;

  const runsJsonlPath = path.join(huntLogOutdir, 'runs.jsonl');
  if (fs.existsSync(runsJsonlPath)) {
    fs.copyFileSync(runsJsonlPath, path.join(pipelinePack, 'HUNT-LOG-runs.jsonl'));
  } else {
    huntLogWarnings.push('Hunt log did not produce runs.jsonl');
  }

  const runsMdPath = path.join(huntLogOutdir, 'runs.md');
  if (fs.existsSync(runsMdPath)) {
    fs.copyFileSync(runsMdPath, path.join(pipelinePack, 'HUNT-LOG-runs.md'));
  }

  const manifestPath = path.join(huntLogOutdir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    entriesAdded = manifest.summary?.entriesAdded ?? 0;
    totalLines = manifest.summary?.totalLines ?? 0;
  }

  // Clean up temporary hunt log directory
  fs.rmSync(huntLogOutdir, { recursive: true, force: true });

  return {
    success: true,
    message: 'Hunt log completed',
    huntLogOutput: {
      entriesAdded,
      totalLines,
      warnings: huntLogWarnings
    }
  };
}

/**
 * Generate PACK.md index for pipeline pack
 */
function generatePackIndex(
  improvePack: string,
  date: string,
  digestRan: boolean,
  huntLogRan: boolean,
  digestOutput?: DigestOutput,
  huntLogOutput?: HuntLogOutput
): string {
  const lines: string[] = [];

  lines.push(`# Career Weekday Improve Pipeline Pack — ${date}`);
  lines.push('');
  lines.push('Assembled pipeline pack combining career improve pack with optional digest and hunt-log.');
  lines.push('');
  lines.push('**Offline only. Never invents scores/employers. Career owns apply + learning.md fold-in.**');
  lines.push('');

  lines.push('## Contents');
  lines.push('');

  // List files from improve pack
  lines.push('### Improve Pack Files');
  lines.push('');
  lines.push('- **PACK.md** — From career-weekday-improve-pack');
  lines.push('- **LEARNING-DRAFT.md** — From career-weekday-improve-pack');
  lines.push('- **stats.json** — From career-weekday-improve-pack (if present)');
  lines.push('- **runs.md** — From career-weekday-improve-pack (if present)');
  lines.push('- **APPROVAL.md** — From career-weekday-improve-pack');
  lines.push('');

  // List digest files if ran
  if (digestRan && digestOutput) {
    lines.push('### Digest Files');
    lines.push('');
    if (digestOutput.hasLearningDraft) {
      lines.push('- **DIGEST-LEARNING-DRAFT.md** — From career-live-improve-digest');
    }
    if (digestOutput.hasStats) {
      lines.push('- **DIGEST-stats.json** — From career-live-improve-digest');
    }
    if (digestOutput.warnings.length > 0) {
      lines.push('');
      lines.push('**Digest Warnings:**');
      digestOutput.warnings.forEach(w => lines.push(`- ${w}`));
    }
    lines.push('');
  }

  // List hunt log files if ran
  if (huntLogRan && huntLogOutput) {
    lines.push('### Hunt Log Files');
    lines.push('');
    lines.push('- **HUNT-LOG-runs.jsonl** — From career-hunt-run-log');
    lines.push('- **HUNT-LOG-runs.md** — From career-hunt-run-log (if present)');
    lines.push('');
    if (huntLogOutput.entriesAdded > 0) {
      lines.push(`**Hunt Log Summary:** ${huntLogOutput.entriesAdded} entries added, ${huntLogOutput.totalLines} total lines`);
      lines.push('');
    }
    if (huntLogOutput.warnings.length > 0) {
      lines.push('**Hunt Log Warnings:**');
      huntLogOutput.warnings.forEach(w => lines.push(`- ${w}`));
      lines.push('');
    }
  }

  lines.push('## Pipeline Status');
  lines.push('');
  lines.push(`- **Improve Pack:** Assembled from ${path.basename(improvePack)}`);
  lines.push(`- **Digest:** ${digestRan ? '✅ Ran' : '⏭️  Skipped'}`);
  lines.push(`- **Hunt Log:** ${huntLogRan ? '✅ Ran' : '⏭️  Skipped'}`);
  lines.push('');

  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review LEARNING-DRAFT.md for patterns to fold into learning.md');
  if (digestRan) {
    lines.push('2. Compare DIGEST-LEARNING-DRAFT.md with improve pack insights');
  }
  if (huntLogRan) {
    lines.push('3. Review HUNT-LOG-runs.md for tracking accuracy');
  }
  lines.push('4. Verify no invented scores, employers, or compensation claims');
  lines.push('5. Career manually folds insights into learning.md');
  lines.push('');

  lines.push('## Safety Reminders');
  lines.push('');
  lines.push('- **Never auto-update learning.md** — Manual fold-in required');
  lines.push('- **Never invent** scores, employers, or compensation');
  lines.push('- **Offline only** — No job board APIs or live data');
  lines.push('- **Career owns apply** — This pack is learning input only');
  lines.push('- **Hard gates unchanged** — $180k+ / DNC list / WFH remain');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate APPROVAL.md for pipeline pack
 */
function generateApprovalDoc(): string {
  const lines: string[] = [];

  lines.push('# Career Weekday Improve Pipeline Pack Approval');
  lines.push('');
  lines.push('## Critical Rules');
  lines.push('');
  lines.push('1. **Career owns apply decisions** - This pipeline is for learning only');
  lines.push('2. **Never invents employers** - Only quotes from provided logs');
  lines.push('3. **Never invents scores** - Only processes provided scores');
  lines.push('4. **Never invents compensation** - No salary/comp claims fabricated');
  lines.push('5. **Offline only** - No job board APIs or live data');
  lines.push('6. **Never auto-updates learning.md** - Career reviews and folds manually');
  lines.push('7. **Hard gates unchanged** - $180k+, DNC list, WFH requirements remain');
  lines.push('8. **Never loosens gates** - No relaxation of hard requirements');
  lines.push('9. **Never auto-applies** - Career bot owns apply workflow separately');
  lines.push('');

  lines.push('## Review Checklist');
  lines.push('');
  lines.push('- [ ] All companies/titles quoted from provided logs');
  lines.push('- [ ] No invented skip reasons or patterns');
  lines.push('- [ ] Score bands reflect actual distribution from logs');
  lines.push('- [ ] No compensation claims fabricated');
  lines.push('- [ ] Hard gates ($180k+, DNC, WFH) unchanged');
  lines.push('- [ ] Period filter applied correctly (if --since used)');
  lines.push('- [ ] Digest outputs match improve pack inputs');
  lines.push('- [ ] Hunt log entries (if ran) are append-only');
  lines.push('');

  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review all LEARNING-DRAFT.md files');
  lines.push('2. Validate patterns against source logs');
  lines.push('3. Identify insights for learning.md fold-in');
  lines.push('4. Career manually updates learning.md');
  lines.push('5. Career bot uses updated learning.md for future decisions');
  lines.push('');

  lines.push('## Never');
  lines.push('');
  lines.push('- ❌ Auto-apply insights without Career review');
  lines.push('- ❌ Invent companies, roles, or scores not in logs');
  lines.push('- ❌ Fabricate compensation or gate outcomes');
  lines.push('- ❌ Loosen hard gates ($180k+, DNC, WFH)');
  lines.push('- ❌ Write directly to learning.md');
  lines.push('- ❌ Auto-apply to jobs');
  lines.push('- ❌ Invent Grant facts or work history');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate pipeline pack manifest
 */
function generateManifest(
  packPath: string,
  date: string,
  improvePackRan: boolean,
  digestRan: boolean,
  huntLogRan: boolean,
  pipelinePackPath: string,
  log?: string,
  summary?: string,
  since?: string
): PipelineManifest {
  const files = ['PACK.md', 'manifest.json', 'APPROVAL.md'];

  // Core improve pack files
  const improvePackFiles = ['LEARNING-DRAFT.md', 'stats.json', 'runs.md'];
  for (const file of improvePackFiles) {
    const filePath = path.join(pipelinePackPath, file);
    if (fs.existsSync(filePath)) {
      files.push(file);
    }
  }

  // Digest files (only if ran)
  if (digestRan) {
    const digestFiles = ['DIGEST-LEARNING-DRAFT.md', 'DIGEST-stats.json'];
    for (const file of digestFiles) {
      const filePath = path.join(pipelinePackPath, file);
      if (fs.existsSync(filePath)) {
        files.push(file);
      }
    }
  }

  // Hunt log files (only if ran)
  if (huntLogRan) {
    const huntLogFiles = ['HUNT-LOG-runs.jsonl', 'HUNT-LOG-runs.md'];
    for (const file of huntLogFiles) {
      const filePath = path.join(pipelinePackPath, file);
      if (fs.existsSync(filePath)) {
        files.push(file);
      }
    }
  }

  return {
    tool: 'career-weekday-improve-pipeline-pack',
    version: '1.0.0',
    date,
    generatedAt: new Date().toISOString(),
    packPath,
    improvePackRan,
    digestRan,
    huntLogRan,
    files,
    inputs: {
      improvePack: packPath,
      log,
      summary,
      since
    }
  };
}
