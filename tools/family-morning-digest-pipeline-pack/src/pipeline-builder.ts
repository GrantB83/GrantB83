/**
 * Pipeline Pack Builder
 * Assembles family-morning-digest-pack output with family-digest-post-checklist validation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { ChecklistOutput, PipelineManifest } from './types.js';

/**
 * Build pipeline pack from existing morning pack
 */
export function buildPipelineFromExistingPack(
  packPath: string,
  runPostChecklist: boolean,
  outdir: string,
  date: string
): { success: boolean; message: string; checklistOutput?: ChecklistOutput } {
  // Validate pack path exists
  if (!fs.existsSync(packPath)) {
    return { success: false, message: `Pack path does not exist: ${packPath}` };
  }

  if (!fs.statSync(packPath).isDirectory()) {
    return { success: false, message: `Pack path is not a directory: ${packPath}` };
  }

  // Validate required morning pack files
  const requiredFiles = ['PACK.md', 'school.md', 'family.md', 'APPROVAL.md'];
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

  // Copy morning pack files to pipeline pack
  for (const file of ['school.md', 'family.md', 'calendar.md', 'calendar-events.json', 'school-due-queue.md', 'APPROVAL.md']) {
    const srcPath = path.join(packPath, file);
    const destPath = path.join(pipelinePack, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  let checklistOutput: ChecklistOutput | undefined;

  // Run post-checklist if requested
  if (runPostChecklist) {
    const checklistDir = path.join(pipelinePack, 'checklist-output');
    fs.mkdirSync(checklistDir, { recursive: true });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const checklistToolPath = path.resolve(
      __dirname,
      '../../family-digest-post-checklist'
    );

    const absolutePackPath = path.resolve(packPath);

    try {
      execSync(
        `npm run check -- --pack "${absolutePackPath}" --date "${date}" --outdir "${checklistDir}"`,
        {
          cwd: checklistToolPath,
          stdio: 'inherit'
        }
      );

      // Copy checklist outputs to pipeline pack
      for (const file of ['POST-CHECKLIST.md', 'ISSUES.md']) {
        const srcPath = path.join(checklistDir, file);
        if (fs.existsSync(srcPath)) {
          const destPath = path.join(pipelinePack, file);
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Read checklist manifest if available
      const manifestPath = path.join(checklistDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        checklistOutput = {
          allPassed: manifest.allPassed,
          checks: [],
          failures: manifest.failCount > 0 ? ['See ISSUES.md for details'] : [],
          warnings: manifest.warningCount > 0 ? ['See ISSUES.md for warnings'] : []
        };
      }

      // Clean up temporary checklist directory
      fs.rmSync(checklistDir, { recursive: true, force: true });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Post-checklist failed: ${errorMessage}`
      };
    }
  }

  // Generate PACK.md index
  const packMd = generatePackIndex(packPath, pipelinePack, date, checklistOutput);
  fs.writeFileSync(path.join(pipelinePack, 'PACK.md'), packMd);

  // Generate manifest
  const manifest = generateManifest(packPath, date, false, runPostChecklist, checklistOutput);
  fs.writeFileSync(
    path.join(pipelinePack, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  return {
    success: true,
    message: `Pipeline pack created successfully: ${pipelinePack}`,
    checklistOutput
  };
}

/**
 * Build pipeline pack by running morning pack first
 */
export function buildPipelineWithMorningPack(
  date: string,
  subjects: string | undefined,
  ics: string | undefined,
  timezone: string | undefined,
  runSubjectDigest: boolean,
  runIcsDigest: boolean,
  schoolDueSubjects: string | undefined,
  schoolDueFiles: string | undefined,
  runSchoolDue: boolean,
  runPostChecklist: boolean,
  outdir: string
): { success: boolean; message: string; checklistOutput?: ChecklistOutput } {
  // Build morning pack first
  const morningPackDir = path.join(outdir, 'morning-pack-temp');
  fs.mkdirSync(morningPackDir, { recursive: true });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const morningPackToolPath = path.resolve(
    __dirname,
    '../../family-morning-digest-pack'
  );

  let morningPackCmd = `npm run pack -- --date "${date}" --outdir "${morningPackDir}"`;

  if (subjects) {
    morningPackCmd += ` --subjects "${subjects}"`;
  }
  if (runSubjectDigest) {
    morningPackCmd += ` --run-subject-digest`;
  }
  if (ics) {
    morningPackCmd += ` --ics "${ics}"`;
  }
  if (timezone) {
    morningPackCmd += ` --timezone "${timezone}"`;
  }
  if (runIcsDigest) {
    morningPackCmd += ` --run-ics-digest`;
  }
  if (schoolDueSubjects) {
    morningPackCmd += ` --school-due-subjects "${schoolDueSubjects}"`;
  }
  if (schoolDueFiles) {
    morningPackCmd += ` --school-due-files "${schoolDueFiles}"`;
  }
  if (runSchoolDue) {
    morningPackCmd += ` --run-school-due`;
  }

  try {
    execSync(morningPackCmd, {
      cwd: morningPackToolPath,
      stdio: 'inherit'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Morning pack generation failed: ${errorMessage}`
    };
  }

  // Find the generated morning pack
  const morningPackPath = path.join(morningPackDir, `pack-${date}`);
  if (!fs.existsSync(morningPackPath)) {
    return {
      success: false,
      message: `Morning pack not found at expected location: ${morningPackPath}`
    };
  }

  // Now build pipeline pack from the morning pack
  const result = buildPipelineFromExistingPack(
    morningPackPath,
    runPostChecklist,
    outdir,
    date
  );

  // Clean up temporary morning pack directory
  fs.rmSync(morningPackDir, { recursive: true, force: true });

  return result;
}

/**
 * Generate PACK.md index for pipeline pack
 */
function generatePackIndex(
  morningPackPath: string,
  pipelinePackPath: string,
  date: string,
  checklistOutput?: ChecklistOutput
): string {
  const lines: string[] = [];

  lines.push(`# Family Morning Digest Pipeline Pack — ${date}`);
  lines.push('');
  lines.push('Assembled pipeline pack combining morning digest and post-checklist validation.');
  lines.push('');
  lines.push('**Never sends. Never invents school facts. Kids School vs Family separation preserved.**');
  lines.push('');

  lines.push('## Contents');
  lines.push('');

  // List files from morning pack
  lines.push('### Morning Digest Files');
  lines.push('');
  const morningFiles = ['school.md', 'family.md', 'calendar.md', 'school-due-queue.md', 'APPROVAL.md'];
  for (const file of morningFiles) {
    const filePath = path.join(pipelinePackPath, file);
    if (fs.existsSync(filePath)) {
      lines.push(`- **${file}** — From morning digest pack`);
    }
  }
  lines.push('');

  // List post-checklist files if present
  const checklistFiles = ['POST-CHECKLIST.md', 'ISSUES.md'];
  const hasChecklistFiles = checklistFiles.some(f => 
    fs.existsSync(path.join(pipelinePackPath, f))
  );

  if (hasChecklistFiles) {
    lines.push('### Post-Checklist Files');
    lines.push('');
    for (const file of checklistFiles) {
      const filePath = path.join(pipelinePackPath, file);
      if (fs.existsSync(filePath)) {
        lines.push(`- **${file}** — Pre-WhatsApp validation`);
      }
    }
    lines.push('');
  }

  lines.push('## Post-Checklist Status');
  lines.push('');
  if (checklistOutput) {
    if (checklistOutput.allPassed) {
      lines.push('✅ **All checks PASSED**');
    } else {
      lines.push('❌ **Some checks FAILED**');
      lines.push('');
      lines.push('See ISSUES.md for details.');
    }
  } else {
    lines.push('⚠️  Post-checklist was not run');
  }
  lines.push('');

  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review POST-CHECKLIST.md for go/no-go status (if present)');
  lines.push('2. Check ISSUES.md for any failures or warnings (if present)');
  lines.push('3. Review school.md and family.md for accuracy');
  lines.push('4. Verify Kids School vs Family separation');
  lines.push('5. Confirm no invented school facts or due dates');
  lines.push('6. Family / CoS posts to WhatsApp Admin - Grant & Liana Private');
  lines.push('');

  lines.push('## Safety Reminders');
  lines.push('');
  lines.push('- **Never auto-send** to WhatsApp Admin');
  lines.push('- **Never invent** school facts, due dates, or times');
  lines.push('- **Offline only** — No WhatsApp API, Gmail API, or network calls');
  lines.push('- **Family / CoS owns send** workflow');
  lines.push('- **Manual review required** before every post');
  lines.push('- **Kids School vs Family separation** must be maintained');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate pipeline pack manifest
 */
function generateManifest(
  packPath: string,
  date: string,
  morningPackRan: boolean,
  postChecklistRan: boolean,
  checklistOutput?: ChecklistOutput
): PipelineManifest {
  const files = ['PACK.md', 'manifest.json'];
  
  const possibleFiles = [
    'school.md',
    'family.md',
    'calendar.md',
    'calendar-events.json',
    'school-due-queue.md',
    'APPROVAL.md',
    'POST-CHECKLIST.md',
    'ISSUES.md'
  ];

  return {
    tool: 'family-morning-digest-pipeline-pack',
    version: '1.0.0',
    date,
    generatedAt: new Date().toISOString(),
    packPath,
    morningPackRan,
    postChecklistRan,
    allChecksPassed: checklistOutput?.allPassed ?? true,
    checkCount: postChecklistRan ? (checklistOutput?.checks.length ?? 0) : 0,
    passCount: postChecklistRan && checklistOutput?.allPassed ? (checklistOutput?.checks.length ?? 0) : 0,
    failCount: postChecklistRan && !checklistOutput?.allPassed ? (checklistOutput?.failures.length ?? 0) : 0,
    warningCount: postChecklistRan ? (checklistOutput?.warnings.length ?? 0) : 0,
    files: [...files, ...possibleFiles]
  };
}
