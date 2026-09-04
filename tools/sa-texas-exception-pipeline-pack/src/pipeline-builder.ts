/**
 * Pipeline Pack Builder
 * Assembles sa-texas-morning-exception-pack output with sa-texas-exception-post-checklist validation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { ChecklistOutput, PipelineManifest } from './types.js';

/**
 * Build pipeline pack from existing morning exception pack
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
  const requiredFiles = ['PACK.md', 'hospitality.md', 'heavy-metal.md', 'APPROVAL.md'];
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

  // Copy morning exception pack files to pipeline pack
  for (const file of ['hospitality.md', 'heavy-metal.md', 'APPROVAL.md', 'manifest.json']) {
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
      '../../sa-texas-exception-post-checklist'
    );

    // Auto-install and auto-build sibling tool if dist missing
    const distPath = path.join(checklistToolPath, 'dist', 'index.js');
    if (!fs.existsSync(distPath)) {
      console.log('⚙️  Building sa-texas-exception-post-checklist (dist missing)...');
      
      // Install dependencies if node_modules missing
      const nodeModulesPath = path.join(checklistToolPath, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        console.log('   Installing dependencies...');
        try {
          execSync('npm install', {
            cwd: checklistToolPath,
            stdio: 'inherit'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            message: `Failed to install sa-texas-exception-post-checklist dependencies: ${errorMessage}`
          };
        }
      }
      
      // Build the tool
      try {
        execSync('npm run build', {
          cwd: checklistToolPath,
          stdio: 'inherit'
        });
        console.log('✅ sa-texas-exception-post-checklist built successfully\n');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Failed to build sa-texas-exception-post-checklist: ${errorMessage}`
        };
      }
    }

    const absolutePackPath = path.resolve(packPath);

    try {
      execSync(
        `npm run checklist -- --pack "${absolutePackPath}" --date "${date}" --outdir "${checklistDir}"`,
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
        
        // Derive allPassed, failCount, and warningCount from checks structure
        // Match post-checklist semantics: packWarnings is non-blocking, other failed checks are critical
        const checks = manifest.checks || {};
        const criticalChecks = Object.entries(checks).filter(([name]) => name !== 'packWarnings');
        const allCriticalPassed = criticalChecks.every(([_, check]: [string, any]) => check.passed === true);
        const failedCriticalChecks = criticalChecks.filter(([_, check]: [string, any]) => check.passed !== true);
        const warnings = checks.packWarnings && !checks.packWarnings.passed ? [checks.packWarnings] : [];
        
        // Fall back to manifest.allPassed if present (forward compatible)
        const derivedAllPassed = manifest.allPassed !== undefined ? manifest.allPassed : allCriticalPassed;
        
        checklistOutput = {
          allPassed: derivedAllPassed,
          checks: [],
          failures: failedCriticalChecks.length > 0 ? ['See ISSUES.md for details'] : [],
          warnings: warnings.length > 0 ? ['See ISSUES.md for warnings'] : []
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
 * Build pipeline pack by running morning exception pack first
 */
export function buildPipelineWithMorningPack(
  date: string,
  brownsBookings: string | undefined,
  hmQuotesDir: string | undefined,
  notes: string | undefined,
  runPostChecklist: boolean,
  outdir: string
): { success: boolean; message: string; checklistOutput?: ChecklistOutput } {
  // Build morning exception pack first
  const morningPackDir = path.join(outdir, 'morning-pack-temp');
  fs.mkdirSync(morningPackDir, { recursive: true });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const morningPackToolPath = path.resolve(
    __dirname,
    '../../sa-texas-morning-exception-pack'
  );

  let morningPackCmd = `npm run pack -- --date "${date}" --outdir "${morningPackDir}"`;

  if (brownsBookings) {
    morningPackCmd += ` --browns-bookings "${brownsBookings}"`;
  }
  if (hmQuotesDir) {
    morningPackCmd += ` --hm-quotes-dir "${hmQuotesDir}"`;
  }
  if (notes) {
    morningPackCmd += ` --notes "${notes}"`;
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
      message: `Morning exception pack generation failed: ${errorMessage}`
    };
  }

  // Find the generated morning exception pack
  const morningPackPath = path.join(morningPackDir, `pack-${date}`);
  if (!fs.existsSync(morningPackPath)) {
    return {
      success: false,
      message: `Morning exception pack not found at expected location: ${morningPackPath}`
    };
  }

  // Now build pipeline pack from the morning exception pack
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

  lines.push(`# SA Texas Exception Pipeline Pack — ${date}`);
  lines.push('');
  lines.push('Assembled pipeline pack combining Texas-morning exception digest and post-checklist validation.');
  lines.push('');
  lines.push('**Never sends. Never invents rates, volumes, or guest facts. Heavy Metal + hospitality only. Perfect Water excluded.**');
  lines.push('');

  lines.push('## Contents');
  lines.push('');

  // List files from morning exception pack
  lines.push('### Morning Exception Pack Files');
  lines.push('');
  const morningFiles = ['hospitality.md', 'heavy-metal.md', 'APPROVAL.md'];
  for (const file of morningFiles) {
    const filePath = path.join(pipelinePackPath, file);
    if (fs.existsSync(filePath)) {
      lines.push(`- **${file}** — From morning exception pack`);
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
  } else if (!checklistOutput) {
    // Note that checklist was not run (only when files don't exist)
    lines.push('*(Post-checklist files not generated - run with default options to include validation)*');
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
  lines.push('3. Review hospitality.md and heavy-metal.md for accuracy');
  lines.push('4. Confirm no invented rates, volumes, or guest facts');
  lines.push('5. Verify Heavy Metal + hospitality only (Perfect Water excluded)');
  lines.push('6. CoS / SA Ops posts to WhatsApp Admin');
  lines.push('');

  lines.push('## Safety Reminders');
  lines.push('');
  lines.push('- **Never auto-send** to WhatsApp');
  lines.push('- **Never invent** Heavy Metal rates, volumes, or Browns guest facts');
  lines.push('- **Offline only** — No WhatsApp API, Gmail API, or network calls');
  lines.push('- **CoS / SA Ops owns send** workflow');
  lines.push('- **Manual review required** before every post');
  lines.push('- **Perfect Water excluded** from scope');
  lines.push('- **Heavy Metal + hospitality only** — USA hours');
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
  
  // Core morning exception pack files (always present)
  const morningPackFiles = [
    'hospitality.md',
    'heavy-metal.md',
    'APPROVAL.md'
  ];

  // Post-checklist files (only when post-checklist ran) - PR #116 pattern
  const checklistFiles = postChecklistRan ? ['POST-CHECKLIST.md', 'ISSUES.md'] : [];
  
  const possibleFiles = [...morningPackFiles, ...checklistFiles];

  return {
    tool: 'sa-texas-exception-pipeline-pack',
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
