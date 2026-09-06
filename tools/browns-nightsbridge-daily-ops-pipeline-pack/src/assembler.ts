/**
 * Browns Nightsbridge Daily Ops Pipeline Pack Assembler
 * 
 * Orchestrates browns-nightsbridge-bookings-adapter → browns-daily-ops-brief → optional browns-booking-change-check → optional browns-late-checkin-queue
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { CliOptions, PipelineResult, PipelineManifest, ManifestFile, StageOutput } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOOL_NAME = 'browns-nightsbridge-daily-ops-pipeline-pack';
const VERSION = '1.0.0';

/**
 * Get the absolute path to a sibling tool
 */
function getSiblingToolPath(toolName: string): string {
  const toolsDir = path.resolve(__dirname, '../..');
  return path.join(toolsDir, toolName);
}

/**
 * Check if sibling tool exists and has dist/index.js
 */
function checkSiblingTool(toolName: string): { exists: boolean; needsBuild: boolean } {
  const toolPath = getSiblingToolPath(toolName);
  const distPath = path.join(toolPath, 'dist', 'index.js');
  
  if (!fs.existsSync(toolPath)) {
    return { exists: false, needsBuild: false };
  }
  
  if (!fs.existsSync(distPath)) {
    return { exists: true, needsBuild: true };
  }
  
  return { exists: true, needsBuild: false };
}

/**
 * Build a sibling tool if needed
 */
function buildSiblingTool(toolName: string): void {
  const toolPath = getSiblingToolPath(toolName);
  
  console.log(`Building ${toolName}...`);
  
  // Check if node_modules exists, if not run npm install
  const nodeModulesPath = path.join(toolPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`  Installing dependencies for ${toolName}...`);
    execSync('npm install', { cwd: toolPath, stdio: 'inherit' });
  }
  
  // Run npm run build
  execSync('npm run build', { cwd: toolPath, stdio: 'inherit' });
  console.log(`  ${toolName} built successfully\n`);
}

/**
 * Run browns-nightsbridge-bookings-adapter
 */
function runNightsbridgeAdapter(inputPath: string, day: string, paste: boolean): StageOutput {
  const toolName = 'browns-nightsbridge-bookings-adapter';
  const toolCheck = checkSiblingTool(toolName);
  
  if (!toolCheck.exists) {
    return { success: false, error: `Sibling tool ${toolName} not found` };
  }
  
  if (toolCheck.needsBuild) {
    try {
      buildSiblingTool(toolName);
    } catch (error) {
      return { success: false, error: `Failed to build ${toolName}: ${error}` };
    }
  }
  
  const toolPath = getSiblingToolPath(toolName);
  const tempOutdir = path.join(toolPath, 'out', `adapter-${day}`);
  
  try {
    console.log(`Running ${toolName}...`);
    
    let cmd: string;
    if (paste) {
      cmd = `npm run adapt -- --day ${day} --paste --outdir ${tempOutdir}`;
    } else {
      cmd = `npm run adapt -- --day ${day} --input ${inputPath} --outdir ${tempOutdir}`;
    }
    
    execSync(cmd, { cwd: toolPath, stdio: 'inherit' });
    
    console.log(`  ${toolName} completed\n`);
    return { success: true, outputDir: tempOutdir };
  } catch (error) {
    return { success: false, error: `Failed to run ${toolName}: ${error}` };
  }
}

/**
 * Run browns-daily-ops-brief
 */
function runDailyOpsBrief(bookingsPath: string, day: string, factsPath: string | undefined): StageOutput {
  const toolName = 'browns-daily-ops-brief';
  const toolCheck = checkSiblingTool(toolName);
  
  if (!toolCheck.exists) {
    return { success: false, error: `Sibling tool ${toolName} not found` };
  }
  
  if (toolCheck.needsBuild) {
    try {
      buildSiblingTool(toolName);
    } catch (error) {
      return { success: false, error: `Failed to build ${toolName}: ${error}` };
    }
  }
  
  const toolPath = getSiblingToolPath(toolName);
  const tempOutdir = path.join(toolPath, 'out', `brief-${day}`);
  
  try {
    console.log(`Running ${toolName}...`);
    
    let cmd = `npm run brief -- --day ${day} --bookings ${bookingsPath} --outdir ${tempOutdir}`;
    if (factsPath) {
      cmd += ` --facts ${factsPath}`;
    }
    
    execSync(cmd, { cwd: toolPath, stdio: 'inherit' });
    
    console.log(`  ${toolName} completed\n`);
    return { success: true, outputDir: tempOutdir };
  } catch (error) {
    return { success: false, error: `Failed to run ${toolName}: ${error}` };
  }
}

/**
 * Run browns-booking-change-check
 */
function runBookingChangeCheck(beforePath: string, afterPath: string, day: string): StageOutput {
  const toolName = 'browns-booking-change-check';
  const toolCheck = checkSiblingTool(toolName);
  
  if (!toolCheck.exists) {
    return { success: false, error: `Sibling tool ${toolName} not found` };
  }
  
  if (toolCheck.needsBuild) {
    try {
      buildSiblingTool(toolName);
    } catch (error) {
      return { success: false, error: `Failed to build ${toolName}: ${error}` };
    }
  }
  
  const toolPath = getSiblingToolPath(toolName);
  const tempOutdir = path.join(toolPath, 'out', `change-check-${day}`);
  
  try {
    console.log(`Running ${toolName}...`);
    
    const cmd = `npm run check -- --before ${beforePath} --after ${afterPath} --day ${day} --outdir ${tempOutdir}`;
    
    execSync(cmd, { cwd: toolPath, stdio: 'inherit' });
    
    console.log(`  ${toolName} completed\n`);
    return { success: true, outputDir: tempOutdir };
  } catch (error) {
    return { success: false, error: `Failed to run ${toolName}: ${error}` };
  }
}

/**
 * Run browns-late-checkin-queue
 */
function runLateCheckinQueue(bookingsPath: string, day: string): StageOutput {
  const toolName = 'browns-late-checkin-queue';
  const toolCheck = checkSiblingTool(toolName);
  
  if (!toolCheck.exists) {
    return { success: false, error: `Sibling tool ${toolName} not found` };
  }
  
  if (toolCheck.needsBuild) {
    try {
      buildSiblingTool(toolName);
    } catch (error) {
      return { success: false, error: `Failed to build ${toolName}: ${error}` };
    }
  }
  
  const toolPath = getSiblingToolPath(toolName);
  const tempOutdir = path.join(toolPath, 'out', `late-${day}`);
  
  try {
    console.log(`Running ${toolName}...`);
    
    const cmd = `npm run queue -- --bookings ${bookingsPath} --day ${day} --outdir ${tempOutdir}`;
    
    execSync(cmd, { cwd: toolPath, stdio: 'inherit' });
    
    console.log(`  ${toolName} completed\n`);
    return { success: true, outputDir: tempOutdir };
  } catch (error) {
    return { success: false, error: `Failed to run ${toolName}: ${error}` };
  }
}

/**
 * Discover files in a directory (flat or with dated subdirectory)
 */
function discoverOutputFiles(outputDir: string): string[] {
  if (!fs.existsSync(outputDir)) {
    return [];
  }
  
  const files: string[] = [];
  const entries = fs.readdirSync(outputDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isFile()) {
      files.push(entry.name);
    } else if (entry.isDirectory()) {
      // Check for dated subdirectory or nested dirs
      const subPath = path.join(outputDir, entry.name);
      const subEntries = fs.readdirSync(subPath, { withFileTypes: true });
      for (const subEntry of subEntries) {
        if (subEntry.isFile()) {
          files.push(path.join(entry.name, subEntry.name));
        }
      }
    }
  }
  
  return files;
}

/**
 * Copy file from source to destination
 */
function copyFile(src: string, dest: string): void {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

/**
 * Assemble the pipeline pack
 */
export async function assemblePipeline(options: CliOptions): Promise<PipelineResult> {
  const warnings: string[] = [];
  const date = options.day || options.asOf || new Date().toISOString().split('T')[0];
  
  // Validate required options
  if (!options.input && !options.paste) {
    throw new Error('Either --input or --paste is required');
  }
  
  if (!options.day && !options.asOf) {
    throw new Error('Either --day or --as-of is required');
  }
  
  // Resolve paths
  const inputPath = options.input ? path.resolve(options.input) : '';
  const priorBookingsPath = options.priorBookings ? path.resolve(options.priorBookings) : undefined;
  const factsPath = options.facts ? path.resolve(options.facts) : undefined;
  
  if (inputPath && !fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  
  if (priorBookingsPath && !fs.existsSync(priorBookingsPath)) {
    warnings.push(`Prior bookings file not found: ${priorBookingsPath} (change check will be skipped)`);
  }
  
  if (factsPath && !fs.existsSync(factsPath)) {
    warnings.push(`Facts file not found: ${factsPath}`);
  }
  
  // Create output directory
  const outdir = path.resolve(options.outdir || './out');
  const packDir = path.join(outdir, `pack-${date}`);
  
  if (fs.existsSync(packDir)) {
    fs.rmSync(packDir, { recursive: true });
  }
  fs.mkdirSync(packDir, { recursive: true });
  
  // Track stage results
  const runOptions = {
    ranAdapter: options.runAdapter ?? true,
    ranBrief: options.runBrief ?? true,
    ranChangeCheck: (options.runChangeCheck ?? true) && !!priorBookingsPath,
    ranLate: options.runLate ?? false
  };
  
  const stageOutputs: Record<string, StageOutput> = {};
  let bookingsJsonPath = '';
  
  // Stage 1: browns-nightsbridge-bookings-adapter (default ON)
  if (runOptions.ranAdapter) {
    console.log('=== Stage 1: browns-nightsbridge-bookings-adapter ===\n');
    stageOutputs.adapter = runNightsbridgeAdapter(inputPath, date, !!options.paste);
    
    if (!stageOutputs.adapter.success) {
      warnings.push(`Nightsbridge adapter failed: ${stageOutputs.adapter.error}`);
    } else if (stageOutputs.adapter.outputDir) {
      // Find bookings.json in adapter output
      bookingsJsonPath = path.join(stageOutputs.adapter.outputDir, 'bookings.json');
      if (!fs.existsSync(bookingsJsonPath)) {
        warnings.push('Adapter did not produce bookings.json');
      }
    }
  } else {
    console.log('=== Stage 1: browns-nightsbridge-bookings-adapter (SKIPPED) ===\n');
  }
  
  // Stage 2: browns-daily-ops-brief (default ON)
  if (runOptions.ranBrief && bookingsJsonPath && fs.existsSync(bookingsJsonPath)) {
    console.log('=== Stage 2: browns-daily-ops-brief ===\n');
    stageOutputs.brief = runDailyOpsBrief(bookingsJsonPath, date, factsPath);
    
    if (!stageOutputs.brief.success) {
      warnings.push(`Daily ops brief failed: ${stageOutputs.brief.error}`);
    }
  } else if (runOptions.ranBrief) {
    console.log('=== Stage 2: browns-daily-ops-brief (SKIPPED - no bookings.json) ===\n');
    warnings.push('Daily ops brief skipped: bookings.json not available');
  } else {
    console.log('=== Stage 2: browns-daily-ops-brief (SKIPPED) ===\n');
  }
  
  // Stage 3: browns-booking-change-check (default ON when --prior-bookings given)
  if (runOptions.ranChangeCheck && priorBookingsPath && bookingsJsonPath && fs.existsSync(bookingsJsonPath)) {
    console.log('=== Stage 3: browns-booking-change-check ===\n');
    stageOutputs.changeCheck = runBookingChangeCheck(priorBookingsPath, bookingsJsonPath, date);
    
    if (!stageOutputs.changeCheck.success) {
      warnings.push(`Booking change check failed: ${stageOutputs.changeCheck.error}`);
    }
  } else if (runOptions.ranChangeCheck) {
    console.log('=== Stage 3: browns-booking-change-check (SKIPPED - no prior bookings or bookings.json) ===\n');
  } else {
    console.log('=== Stage 3: browns-booking-change-check (SKIPPED) ===\n');
  }
  
  // Stage 4: browns-late-checkin-queue (default OFF)
  if (runOptions.ranLate && bookingsJsonPath && fs.existsSync(bookingsJsonPath)) {
    console.log('=== Stage 4: browns-late-checkin-queue ===\n');
    stageOutputs.late = runLateCheckinQueue(bookingsJsonPath, date);
    
    if (!stageOutputs.late.success) {
      warnings.push(`Late checkin queue failed: ${stageOutputs.late.error}`);
    }
  } else if (runOptions.ranLate) {
    console.log('=== Stage 4: browns-late-checkin-queue (SKIPPED - no bookings.json) ===\n');
    warnings.push('Late checkin queue skipped: bookings.json not available');
  } else {
    console.log('=== Stage 4: browns-late-checkin-queue (SKIPPED) ===\n');
  }
  
  // Copy outputs to pack directory
  console.log('=== Assembling Pipeline Pack ===\n');
  
  const copiedFiles: string[] = [];
  
  // Copy adapter outputs
  if (stageOutputs.adapter?.success && stageOutputs.adapter.outputDir) {
    const files = discoverOutputFiles(stageOutputs.adapter.outputDir);
    for (const file of files) {
      const src = path.join(stageOutputs.adapter.outputDir, file);
      const destFile = file.startsWith('bookings.') ? file : `adapter-${file}`;
      const dest = path.join(packDir, destFile);
      
      try {
        copyFile(src, dest);
        copiedFiles.push(destFile);
      } catch (error) {
        warnings.push(`Failed to copy ${file}: ${error}`);
      }
    }
  }
  
  // Copy brief outputs
  if (stageOutputs.brief?.success && stageOutputs.brief.outputDir) {
    const files = discoverOutputFiles(stageOutputs.brief.outputDir);
    for (const file of files) {
      const src = path.join(stageOutputs.brief.outputDir, file);
      const destFile = file.startsWith('draft-team-group-whatsapp.txt') ? 'daily-ops-brief.txt' : 
                       file.startsWith('draft-guest-welcome-stubs') ? file.replace('draft-guest-welcome-stubs', 'ops-brief-stubs') :
                       `brief-${file}`;
      const dest = path.join(packDir, destFile);
      
      try {
        copyFile(src, dest);
        copiedFiles.push(destFile);
      } catch (error) {
        warnings.push(`Failed to copy ${file}: ${error}`);
      }
    }
  }
  
  // Copy change check outputs
  if (stageOutputs.changeCheck?.success && stageOutputs.changeCheck.outputDir) {
    const files = discoverOutputFiles(stageOutputs.changeCheck.outputDir);
    for (const file of files) {
      const src = path.join(stageOutputs.changeCheck.outputDir, file);
      const destFile = `change-check-${file}`;
      const dest = path.join(packDir, destFile);
      
      try {
        copyFile(src, dest);
        copiedFiles.push(destFile);
      } catch (error) {
        warnings.push(`Failed to copy ${file}: ${error}`);
      }
    }
  }
  
  // Copy late checkin outputs
  if (stageOutputs.late?.success && stageOutputs.late.outputDir) {
    const files = discoverOutputFiles(stageOutputs.late.outputDir);
    for (const file of files) {
      const src = path.join(stageOutputs.late.outputDir, file);
      const destFile = `late-${file}`;
      const dest = path.join(packDir, destFile);
      
      try {
        copyFile(src, dest);
        copiedFiles.push(destFile);
      } catch (error) {
        warnings.push(`Failed to copy ${file}: ${error}`);
      }
    }
  }
  
  // Generate PACK.md
  const packMd = generatePackMd(date, runOptions, warnings, copiedFiles);
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);
  copiedFiles.push('PACK.md');
  
  // Generate APPROVAL.md
  const approvalMd = generateApprovalMd(date, runOptions);
  fs.writeFileSync(path.join(packDir, 'APPROVAL.md'), approvalMd);
  copiedFiles.push('APPROVAL.md');
  
  // Generate manifest.json (only list files that actually exist)
  const manifestFiles: ManifestFile[] = [];
  
  // Only add files that were actually copied
  const actualFiles = fs.readdirSync(packDir).filter(f => !f.startsWith('.'));
  
  for (const file of actualFiles) {
    let fileType = 'output';
    let description = file;
    
    if (file === 'PACK.md') {
      fileType = 'index';
      description = 'Pipeline pack index with workflow summary';
    } else if (file === 'APPROVAL.md') {
      fileType = 'approval';
      description = 'Approval checklist and safety gates';
    } else if (file.startsWith('adapter-') || file.startsWith('bookings.')) {
      fileType = 'adapter-output';
      description = `Nightsbridge adapter output: ${file}`;
    } else if (file.startsWith('brief-') || file === 'daily-ops-brief.txt' || file.startsWith('ops-brief-stubs')) {
      fileType = 'daily-ops-output';
      description = `Daily ops brief output: ${file}`;
    } else if (file.startsWith('change-check-')) {
      fileType = 'change-check-output';
      description = `Booking change check output: ${file}`;
    } else if (file.startsWith('late-')) {
      fileType = 'late-checkin-output';
      description = `Late checkin queue output: ${file}`;
    }
    
    manifestFiles.push({ filename: file, type: fileType, description });
  }
  
  const manifest: PipelineManifest = {
    tool: TOOL_NAME,
    version: VERSION,
    timestamp: new Date().toISOString(),
    date,
    inputs: {
      inputPath: inputPath || null,
      priorBookingsPath: priorBookingsPath || null,
      factsPath: factsPath || null
    },
    runOptions,
    files: manifestFiles
  };
  
  fs.writeFileSync(path.join(packDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  return {
    success: true,
    outdir: packDir,
    message: `Pipeline pack assembled successfully`,
    warnings,
    manifest
  };
}

/**
 * Generate PACK.md index
 */
function generatePackMd(
  date: string,
  runOptions: { ranAdapter: boolean; ranBrief: boolean; ranChangeCheck: boolean; ranLate: boolean },
  warnings: string[],
  files: string[]
): string {
  const sections: string[] = [];
  
  sections.push('# Browns Nightsbridge Daily Ops Pipeline Pack\n');
  sections.push(`**Date:** ${date}\n`);
  sections.push(`**Generated:** ${new Date().toISOString()}\n`);
  sections.push('**Property:** Dullstroom The Browns Luxury Guest Suites\n');
  sections.push('## Purpose\n');
  sections.push('Orchestrated pack from Nightsbridge day-sheet export → bookings.json → daily ops brief → optional change check → optional late queue for SA Ops / CoS.\n');
  sections.push('**SAFETY:** Never invents guest phone, ETA, rates, or amounts. Never auto-sends WhatsApp/email. Offline only.\n');
  
  sections.push('## Pipeline Summary\n');
  sections.push(`- **browns-nightsbridge-bookings-adapter:** ${runOptions.ranAdapter ? '✅ Run' : '⏭️ Skipped'}\n`);
  sections.push(`- **browns-daily-ops-brief:** ${runOptions.ranBrief ? '✅ Run' : '⏭️ Skipped'}\n`);
  sections.push(`- **browns-booking-change-check:** ${runOptions.ranChangeCheck ? '✅ Run' : '⏭️ Skipped'}\n`);
  sections.push(`- **browns-late-checkin-queue:** ${runOptions.ranLate ? '✅ Run' : '⏭️ Skipped'}\n`);
  
  if (warnings.length > 0) {
    sections.push('## ⚠️ Warnings\n');
    for (const warning of warnings) {
      sections.push(`- ${warning}\n`);
    }
    sections.push('');
  }
  
  sections.push('## Pack Contents\n');
  
  const adapterFiles = files.filter(f => f.startsWith('adapter-') || f.startsWith('bookings.'));
  const briefFiles = files.filter(f => f.startsWith('brief-') || f === 'daily-ops-brief.txt' || f.startsWith('ops-brief-stubs'));
  const changeCheckFiles = files.filter(f => f.startsWith('change-check-'));
  const lateFiles = files.filter(f => f.startsWith('late-'));
  
  if (adapterFiles.length > 0) {
    sections.push('### Nightsbridge Adapter\n');
    for (const file of adapterFiles) {
      sections.push(`- \`${file}\`\n`);
    }
    sections.push('');
  }
  
  if (briefFiles.length > 0) {
    sections.push('### Daily Ops Brief\n');
    for (const file of briefFiles) {
      sections.push(`- \`${file}\`\n`);
    }
    sections.push('');
  }
  
  if (changeCheckFiles.length > 0) {
    sections.push('### Booking Change Check\n');
    for (const file of changeCheckFiles) {
      sections.push(`- \`${file}\`\n`);
    }
    sections.push('');
  }
  
  if (lateFiles.length > 0) {
    sections.push('### Late Check-In Queue\n');
    for (const file of lateFiles) {
      sections.push(`- \`${file}\`\n`);
    }
    sections.push('');
  }
  
  sections.push('## Next Steps\n');
  sections.push('1. Review this PACK.md index\n');
  sections.push('2. Read APPROVAL.md for safety checklist\n');
  sections.push('3. Review bookings.json (if adapter ran)\n');
  sections.push('4. Review daily ops brief (if ran)\n');
  sections.push('5. Review change check report (if ran)\n');
  sections.push('6. Review late checkin queue (if ran)\n');
  sections.push('7. Confirm missing fields filled from approved sources\n');
  sections.push('8. Get approval before any WhatsApp/email send\n');
  sections.push('9. Never auto-send — manual SA Ops / CoS posting required\n');
  
  sections.push('## Safety Reminders\n');
  sections.push('- ✅ Offline only\n');
  sections.push('- ✅ Never auto-send\n');
  sections.push('- ✅ Never invent guest phone, ETA, rates, or amounts\n');
  sections.push('- ✅ Dullstroom / The Browns only\n');
  sections.push('- ⚠️ Approval required before any send\n');
  sections.push('- ⚠️ SA Ops / CoS owns WhatsApp\n');
  
  return sections.join('');
}

/**
 * Generate APPROVAL.md
 */
function generateApprovalMd(
  date: string,
  runOptions: { ranAdapter: boolean; ranBrief: boolean; ranChangeCheck: boolean; ranLate: boolean }
): string {
  const sections: string[] = [];
  
  sections.push('# Browns Nightsbridge Daily Ops Pipeline - APPROVAL CHECKLIST\n');
  sections.push(`**Date:** ${date}\n`);
  sections.push('## Hard Gates\n');
  sections.push('### Never Auto-Send\n');
  sections.push('☐ **Draft only:** All outputs are drafts for manual review\n');
  sections.push('☐ **WhatsApp:** SA Ops / CoS owns WhatsApp posting\n');
  sections.push('☐ **Email:** Never auto-sends email\n');
  sections.push('☐ **Approval required:** SA Ops / CoS approval before any send\n');
  
  sections.push('### Never Invent Data\n');
  sections.push('☐ **Guest phone:** Never invented — `[GUEST_PHONE]` when missing\n');
  sections.push('☐ **ETA/times:** Never invented — `[ETA REQUIRED]` when missing\n');
  sections.push('☐ **Rates:** Never invented — `[RATE CARD REQUIRED]` when missing\n');
  sections.push('☐ **Amounts:** Never invented — only from bookings or approved rate card\n');
  
  sections.push('## Pipeline Summary\n');
  sections.push(`- **Adapter (Nightsbridge → bookings.json):** ${runOptions.ranAdapter ? 'Generated' : 'Skipped'}\n`);
  sections.push(`- **Daily ops brief:** ${runOptions.ranBrief ? 'Generated' : 'Skipped'}\n`);
  sections.push(`- **Change check:** ${runOptions.ranChangeCheck ? 'Generated' : 'Skipped'}\n`);
  sections.push(`- **Late checkin queue:** ${runOptions.ranLate ? 'Generated' : 'Skipped'}\n`);
  
  sections.push('## Data Verification\n');
  sections.push('☐ **Guest names:** Verified against Nightsbridge\n');
  sections.push('☐ **Dates:** Check-in and check-out dates confirmed\n');
  sections.push('☐ **Suites:** Suite assignments confirmed\n');
  sections.push('☐ **Missing fields:** Resolved from approved sources (never invented)\n');
  
  sections.push('## Safety Reminders\n');
  sections.push('- ✅ Offline only\n');
  sections.push('- ✅ Never auto-send\n');
  sections.push('- ✅ Dullstroom / The Browns only\n');
  sections.push('- ⚠️ SA Ops / CoS approval required\n');
  sections.push('- ⚠️ SA Ops / CoS owns WhatsApp\n');
  sections.push('- ⚠️ Never invent phone/ETA/rates/amounts\n');
  
  sections.push('## Approval\n');
  sections.push('☐ All hard gates checked\n');
  sections.push('☐ Data verified\n');
  sections.push('☐ Missing fields resolved\n');
  sections.push('☐ No invented data\n');
  sections.push('☐ Ready to proceed with manual posting (SA Ops / CoS approval)\n');
  
  sections.push(`\n**Approval phrase:**\n`);
  sections.push('```\n');
  sections.push(`APPROVE SEND NIGHTSBRIDGE DAILY OPS PACK ${date}\n`);
  sections.push('```\n');
  
  return sections.join('');
}
