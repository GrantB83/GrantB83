/**
 * Pack assembly logic for family-school-pipeline-pack
 * 
 * SAFETY:
 * - Never invents due dates
 * - Never opens email bodies or attachments
 * - Never sends WhatsApp/email
 * - Offline only
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { CliOptions, PackResult, StageResult, PackManifest } from './types.js';

/**
 * Ensure sibling tool is built
 */
function ensureSiblingBuilt(toolName: string, toolPath: string): void {
  const distPath = path.join(toolPath, 'dist', 'index.js');
  
  if (!fs.existsSync(distPath)) {
    console.log(`⚙️  Building ${toolName} (dist missing)...`);
    
    // Install dependencies if node_modules missing
    const nodeModulesPath = path.join(toolPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('   Installing dependencies...');
      execSync('npm install', {
        cwd: toolPath,
        stdio: 'inherit'
      });
    }
    
    // Build the tool
    execSync('npm run build', {
      cwd: toolPath,
      stdio: 'inherit'
    });
    console.log(`✅ ${toolName} built successfully\n`);
  }
}

/**
 * Run family-school-subject-digest stage
 */
function runDigestStage(subjects: string, date: string, timezone: string, packDir: string): StageResult {
  try {
    const digestTool = path.join(process.cwd(), '../family-school-subject-digest');
    
    if (!fs.existsSync(digestTool)) {
      throw new Error('family-school-subject-digest not found. Ensure sibling tool exists.');
    }
    
    ensureSiblingBuilt('family-school-subject-digest', digestTool);
    
    const digestOutdir = path.join(packDir, 'digest-temp');
    
    console.log('Running family-school-subject-digest...');
    execSync(
      `cd ${digestTool} && npm run digest -- --input ${path.resolve(subjects)} --outdir ${path.resolve(digestOutdir)} --date ${date} --timezone ${timezone}`,
      { stdio: 'inherit' }
    );
    
    // Discover real output directory structure
    let digestRealOut: string;
    const digestSubdirs = fs.readdirSync(digestOutdir).filter(f => 
      fs.statSync(path.join(digestOutdir, f)).isDirectory()
    );
    
    if (digestSubdirs.length > 0) {
      // Output was in subdirectory
      digestRealOut = path.join(digestOutdir, digestSubdirs[0]);
    } else {
      // Output was flat
      digestRealOut = digestOutdir;
    }
    
    return { success: true, outputDir: digestRealOut };
  } catch (error) {
    return { 
      success: false, 
      message: `family-school-subject-digest failed: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Run family-school-due-queue stage
 */
function runDueQueueStage(subjects: string | undefined, filenames: string | undefined, date: string, packDir: string): StageResult {
  try {
    const queueTool = path.join(process.cwd(), '../family-school-due-queue');
    
    if (!fs.existsSync(queueTool)) {
      throw new Error('family-school-due-queue not found. Ensure sibling tool exists.');
    }
    
    ensureSiblingBuilt('family-school-due-queue', queueTool);
    
    const queueOutdir = path.join(packDir, 'queue-temp');
    
    let queueCmd = `cd ${queueTool} && npm run queue -- --outdir ${path.resolve(queueOutdir)} --as-of ${date}`;
    
    if (subjects) {
      queueCmd += ` --subjects ${path.resolve(subjects)}`;
    }
    if (filenames) {
      queueCmd += ` --files ${path.resolve(filenames)}`;
    }
    
    if (!subjects && !filenames) {
      return { success: false, message: 'family-school-due-queue requires --subjects or --filenames' };
    }
    
    console.log('Running family-school-due-queue...');
    execSync(queueCmd, { stdio: 'inherit' });
    
    // Discover real output directory
    let queueRealOut: string;
    const queueFiles = fs.readdirSync(queueOutdir);
    
    if (queueFiles.includes('queue.md')) {
      // Output was flat
      queueRealOut = queueOutdir;
    } else {
      // Output was in subdirectory
      const queueSubdirs = queueFiles.filter(f => 
        fs.statSync(path.join(queueOutdir, f)).isDirectory()
      );
      if (queueSubdirs.length > 0) {
        queueRealOut = path.join(queueOutdir, queueSubdirs[0]);
      } else {
        queueRealOut = queueOutdir;
      }
    }
    
    return { success: true, outputDir: queueRealOut };
  } catch (error) {
    return { 
      success: false, 
      message: `family-school-due-queue failed: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Run family-calendar-ics-digest stage
 */
function runCalendarStage(ics: string, date: string, timezone: string, packDir: string): StageResult {
  try {
    const calendarTool = path.join(process.cwd(), '../family-calendar-ics-digest');
    
    if (!fs.existsSync(calendarTool)) {
      throw new Error('family-calendar-ics-digest not found. Ensure sibling tool exists.');
    }
    
    ensureSiblingBuilt('family-calendar-ics-digest', calendarTool);
    
    const calendarOutdir = path.join(packDir, 'calendar-temp');
    
    // Calculate date range (date to date + 7 days)
    const fromDate = new Date(date);
    const toDate = new Date(date);
    toDate.setDate(toDate.getDate() + 7);
    
    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];
    
    console.log('Running family-calendar-ics-digest...');
    execSync(
      `cd ${calendarTool} && npm run digest -- --ics ${path.resolve(ics)} --from ${fromStr} --to ${toStr} --outdir ${path.resolve(calendarOutdir)} --timezone ${timezone}`,
      { stdio: 'inherit' }
    );
    
    // Discover real output directory
    let calendarRealOut: string;
    const calendarSubdirs = fs.readdirSync(calendarOutdir).filter(f => 
      fs.statSync(path.join(calendarOutdir, f)).isDirectory()
    );
    
    if (calendarSubdirs.length > 0) {
      // Output was in subdirectory
      calendarRealOut = path.join(calendarOutdir, calendarSubdirs[0]);
    } else {
      // Output was flat
      calendarRealOut = calendarOutdir;
    }
    
    return { success: true, outputDir: calendarRealOut };
  } catch (error) {
    return { 
      success: false, 
      message: `family-calendar-ics-digest failed: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Copy stage outputs to pack directory
 */
function copyStageOutputs(stageDir: string, packDir: string, prefix: string, filesToCopy: string[]): void {
  for (const file of filesToCopy) {
    const src = path.join(stageDir, file);
    if (fs.existsSync(src)) {
      const destName = prefix ? `${prefix}-${file}` : file;
      const dest = path.join(packDir, destName);
      fs.copyFileSync(src, dest);
    }
  }
}

/**
 * Generate PACK.md index
 */
function generatePackMd(
  date: string,
  digestRan: boolean,
  dueQueueRan: boolean,
  calendarRan: boolean,
  packDir: string,
  warnings: string[]
): string {
  const lines: string[] = [];
  
  lines.push(`# Family School Pipeline Pack — ${date}`);
  lines.push('');
  lines.push('Orchestrated school morning pack for Family / CoS AISD workflows.');
  lines.push('');
  lines.push('**Never opens email bodies. Never invents due dates. Never auto-sends.**');
  lines.push('');
  
  lines.push('## Contents');
  lines.push('');
  
  if (digestRan) {
    lines.push('### ✅ School Subject Digest');
    const digestFiles = ['digest-digest.md', 'digest-items.json', 'digest-missing-fields.md'];
    for (const file of digestFiles) {
      if (fs.existsSync(path.join(packDir, file))) {
        lines.push(`- **${file}** — From family-school-subject-digest`);
      }
    }
    lines.push('');
  } else {
    lines.push('### ⚠️  School Subject Digest');
    lines.push('- Skipped (--run-digest=false)');
    lines.push('');
  }
  
  if (dueQueueRan) {
    lines.push('### ✅ School Due Queue');
    const queueFiles = ['queue-queue.md', 'queue-queue.json', 'queue-missing-signals.md'];
    for (const file of queueFiles) {
      if (fs.existsSync(path.join(packDir, file))) {
        lines.push(`- **${file}** — From family-school-due-queue`);
      }
    }
    lines.push('');
  } else {
    lines.push('### ⚠️  School Due Queue');
    lines.push('- Skipped (--run-due-queue=false)');
    lines.push('');
  }
  
  if (calendarRan) {
    lines.push('### ✅ Calendar Digest');
    const calendarFiles = ['calendar-digest.md', 'calendar-events.json', 'calendar-missing-fields.md'];
    for (const file of calendarFiles) {
      if (fs.existsSync(path.join(packDir, file))) {
        lines.push(`- **${file}** — From family-calendar-ics-digest`);
      }
    }
    lines.push('');
  } else {
    lines.push('### ⚠️  Calendar Digest');
    lines.push('- Skipped (--run-calendar=false or no --ics)');
    lines.push('');
  }
  
  if (warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    warnings.forEach(w => lines.push(`- ${w}`));
    lines.push('');
  }
  
  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review digest outputs for accuracy');
  lines.push('2. Check missing-fields / missing-signals files');
  lines.push('3. Review APPROVAL.md for safety gates');
  lines.push('4. Verify no invented due dates');
  lines.push('5. Family / CoS owns WhatsApp send workflow');
  lines.push('');
  
  lines.push('## Safety Reminders');
  lines.push('');
  lines.push('- **Never opens** email bodies or attachments');
  lines.push('- **Never invents** due dates or school facts');
  lines.push('- **Offline only** — No Gmail API, no network calls');
  lines.push('- **Never auto-sends** — Manual review required');
  lines.push('- **Family / CoS owns send** workflow');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate APPROVAL.md checklist
 */
function generateApprovalMd(): string {
  const lines: string[] = [];
  
  lines.push('# Family School Pipeline Pack - APPROVAL CHECKLIST');
  lines.push('');
  lines.push('## Hard Gates');
  lines.push('');
  lines.push('### Never Open Email Bodies');
  lines.push('☐ **Verified:** Pack generated from subjects/filenames only (never opened bodies/attachments)');
  lines.push('');
  lines.push('### Never Invent Due Dates');
  lines.push('☐ **Verified:** All due dates extracted from explicit signals (never invented)');
  lines.push('☐ **Check:** missing-signals.md for items needing manual review');
  lines.push('');
  lines.push('### Never Auto-Send');
  lines.push('☐ **Verified:** No automatic WhatsApp/email sends configured');
  lines.push('☐ **Manual review required** before any Family bot post');
  lines.push('');
  lines.push('## Data Verification');
  lines.push('');
  lines.push('☐ Review digest outputs for accuracy');
  lines.push('☐ Check missing-fields files for incomplete data');
  lines.push('☐ Verify AISD vs Family separation');
  lines.push('☐ Confirm no school facts invented');
  lines.push('');
  lines.push('## Safety Reminders');
  lines.push('');
  lines.push('- ✅ Offline only');
  lines.push('- ✅ Never opens email bodies/attachments');
  lines.push('- ✅ Never invents due dates');
  lines.push('- ✅ Never auto-sends');
  lines.push('- ⚠️  Family / CoS owns send workflow');
  lines.push('- ⚠️  Manual review required before every post');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate manifest.json
 */
function generateManifest(
  date: string,
  digestRan: boolean,
  dueQueueRan: boolean,
  calendarRan: boolean,
  packDir: string,
  warnings: string[]
): PackManifest {
  const files: string[] = ['PACK.md', 'APPROVAL.md', 'manifest.json'];
  
  // Collect actual present files
  const allFiles = fs.readdirSync(packDir);
  for (const file of allFiles) {
    const filePath = path.join(packDir, file);
    if (fs.statSync(filePath).isFile() && !files.includes(file)) {
      files.push(file);
    }
  }
  
  return {
    tool: 'family-school-pipeline-pack',
    version: '1.0.0',
    date,
    generatedAt: new Date().toISOString(),
    stages: {
      digest: digestRan,
      dueQueue: dueQueueRan,
      calendar: calendarRan
    },
    files,
    warnings
  };
}

/**
 * Assemble pipeline pack
 */
export async function assemblePack(options: CliOptions): Promise<PackResult> {
  const warnings: string[] = [];
  const date = options.date || new Date().toISOString().split('T')[0];
  const timezone = options.timezone || 'America/Chicago';
  const outdir = options.outdir || './out';
  
  const packDir = path.join(outdir, `pack-${date}`);
  
  // Ensure output directory exists
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }
  
  let digestRan = false;
  let dueQueueRan = false;
  let calendarRan = false;
  
  // Stage 1: family-school-subject-digest (default ON)
  if (options.runDigest !== false) {
    const subjects = options.subjects || options.input;
    if (subjects) {
      const digestResult = runDigestStage(subjects, date, timezone, packDir);
      
      if (digestResult.success && digestResult.outputDir) {
        copyStageOutputs(
          digestResult.outputDir,
          packDir,
          'digest',
          ['digest.md', 'items.json', 'missing-fields.md', 'APPROVAL.md']
        );
        digestRan = true;
        
        // Clean up temp directory
        fs.rmSync(path.join(packDir, 'digest-temp'), { recursive: true, force: true });
      } else {
        warnings.push(digestResult.message || 'family-school-subject-digest failed');
      }
    } else {
      warnings.push('family-school-subject-digest skipped (no --subjects/--input)');
    }
  } else {
    warnings.push('family-school-subject-digest skipped (--run-digest=false)');
  }
  
  // Stage 2: family-school-due-queue (default ON)
  if (options.runDueQueue !== false) {
    const subjects = options.subjects || options.input;
    const filenames = options.filenames;
    
    if (subjects || filenames) {
      const queueResult = runDueQueueStage(subjects, filenames, date, packDir);
      
      if (queueResult.success && queueResult.outputDir) {
        copyStageOutputs(
          queueResult.outputDir,
          packDir,
          'queue',
          ['queue.md', 'queue.json', 'missing-signals.md', 'APPROVAL.md', 'manifest.json']
        );
        dueQueueRan = true;
        
        // Clean up temp directory
        fs.rmSync(path.join(packDir, 'queue-temp'), { recursive: true, force: true });
      } else {
        warnings.push(queueResult.message || 'family-school-due-queue failed');
      }
    } else {
      warnings.push('family-school-due-queue skipped (no --subjects/--input or --filenames)');
    }
  } else {
    warnings.push('family-school-due-queue skipped (--run-due-queue=false)');
  }
  
  // Stage 3: family-calendar-ics-digest (default OFF)
  if (options.runCalendar === true && options.ics) {
    const calendarResult = runCalendarStage(options.ics, date, timezone, packDir);
    
    if (calendarResult.success && calendarResult.outputDir) {
      copyStageOutputs(
        calendarResult.outputDir,
        packDir,
        'calendar',
        ['digest.md', 'events.json', 'missing-fields.md', 'APPROVAL.md', 'manifest.json']
      );
      calendarRan = true;
      
      // Clean up temp directory
      fs.rmSync(path.join(packDir, 'calendar-temp'), { recursive: true, force: true });
    } else {
      warnings.push(calendarResult.message || 'family-calendar-ics-digest failed');
    }
  } else if (options.runCalendar === true && !options.ics) {
    warnings.push('family-calendar-ics-digest skipped (--run-calendar=true but no --ics)');
  }
  
  // Generate PACK.md
  const packMd = generatePackMd(date, digestRan, dueQueueRan, calendarRan, packDir, warnings);
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);
  
  // Generate APPROVAL.md
  const approvalMd = generateApprovalMd();
  fs.writeFileSync(path.join(packDir, 'APPROVAL.md'), approvalMd);
  
  // Generate manifest.json
  const manifest = generateManifest(date, digestRan, dueQueueRan, calendarRan, packDir, warnings);
  fs.writeFileSync(
    path.join(packDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  return {
    success: true,
    message: `Pack assembled successfully at ${packDir}`,
    outdir: packDir,
    warnings
  };
}
