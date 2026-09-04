/**
 * Browns Welcome Late Pipeline Pack Assembler
 * 
 * Orchestrates browns-welcome-draft-pack, browns-late-checkin-queue, and optional browns-daily-ops-brief
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { CliOptions, PipelineResult, PipelineManifest, ManifestFile, StageOutput } from './types.js';

const TOOL_NAME = 'browns-welcome-late-pipeline-pack';
const VERSION = '1.0.0';

/**
 * Get the absolute path to a sibling tool
 */
function getSiblingToolPath(toolName: string): string {
  const toolsDir = path.resolve(process.cwd(), '..');
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
 * Run browns-welcome-draft-pack
 */
function runWelcomeDraftPack(bookingsPath: string, day: string, factsPath: string | undefined): StageOutput {
  const toolName = 'browns-welcome-draft-pack';
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
  const tempOutdir = path.join(toolPath, 'out', `welcome-${day}`);
  
  try {
    console.log(`Running ${toolName}...`);
    
    let cmd = `npm run draft-pack -- --bookings ${bookingsPath} --as-of ${day} --outdir ${tempOutdir}`;
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
      // Check for dated subdirectory (e.g., "pack-2026-09-20")
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
  if (!options.bookings) {
    throw new Error('--bookings is required');
  }
  
  if (!options.day && !options.asOf) {
    throw new Error('Either --day or --as-of is required');
  }
  
  // Resolve paths
  const bookingsPath = path.resolve(options.bookings);
  const factsPath = options.facts ? path.resolve(options.facts) : undefined;
  
  if (!fs.existsSync(bookingsPath)) {
    throw new Error(`Bookings file not found: ${bookingsPath}`);
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
    ranWelcome: options.runWelcome ?? true,
    ranLate: options.runLate ?? true,
    ranDailyOps: options.runDailyOps ?? false
  };
  
  const stageOutputs: Record<string, StageOutput> = {};
  
  // Stage 1: browns-welcome-draft-pack (default ON)
  if (runOptions.ranWelcome) {
    console.log('=== Stage 1: browns-welcome-draft-pack ===\n');
    stageOutputs.welcome = runWelcomeDraftPack(bookingsPath, date, factsPath);
    
    if (!stageOutputs.welcome.success) {
      warnings.push(`Welcome draft pack failed: ${stageOutputs.welcome.error}`);
    }
  } else {
    console.log('=== Stage 1: browns-welcome-draft-pack (SKIPPED) ===\n');
  }
  
  // Stage 2: browns-late-checkin-queue (default ON)
  if (runOptions.ranLate) {
    console.log('=== Stage 2: browns-late-checkin-queue ===\n');
    stageOutputs.late = runLateCheckinQueue(bookingsPath, date);
    
    if (!stageOutputs.late.success) {
      warnings.push(`Late checkin queue failed: ${stageOutputs.late.error}`);
    }
  } else {
    console.log('=== Stage 2: browns-late-checkin-queue (SKIPPED) ===\n');
  }
  
  // Stage 3: browns-daily-ops-brief (default OFF)
  if (runOptions.ranDailyOps) {
    console.log('=== Stage 3: browns-daily-ops-brief ===\n');
    stageOutputs.dailyOps = runDailyOpsBrief(bookingsPath, date, factsPath);
    
    if (!stageOutputs.dailyOps.success) {
      warnings.push(`Daily ops brief failed: ${stageOutputs.dailyOps.error}`);
    }
  } else {
    console.log('=== Stage 3: browns-daily-ops-brief (SKIPPED) ===\n');
  }
  
  // Copy outputs to pack directory
  console.log('=== Assembling Pipeline Pack ===\n');
  
  const copiedFiles: string[] = [];
  
  // Copy welcome outputs
  if (stageOutputs.welcome?.success && stageOutputs.welcome.outputDir) {
    const files = discoverOutputFiles(stageOutputs.welcome.outputDir);
    for (const file of files) {
      const src = path.join(stageOutputs.welcome.outputDir, file);
      const destFile = file.startsWith('queue.md') ? 'welcome-queue.md' : 
                       file.startsWith('drafts/') ? file.replace('drafts/', 'welcome-') :
                       `welcome-${file}`;
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
      const destFile = file.startsWith('queue.md') ? 'late-queue.md' : 
                       file.startsWith('unknown-time.md') ? 'late-unknown-time.md' :
                       `late-${file}`;
      const dest = path.join(packDir, destFile);
      
      try {
        copyFile(src, dest);
        copiedFiles.push(destFile);
      } catch (error) {
        warnings.push(`Failed to copy ${file}: ${error}`);
      }
    }
  }
  
  // Copy daily ops outputs
  if (stageOutputs.dailyOps?.success && stageOutputs.dailyOps.outputDir) {
    const files = discoverOutputFiles(stageOutputs.dailyOps.outputDir);
    for (const file of files) {
      const src = path.join(stageOutputs.dailyOps.outputDir, file);
      const destFile = file.startsWith('draft-team-group-whatsapp.txt') ? 'daily-ops-brief.txt' : 
                       `daily-ops-${file}`;
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
    } else if (file.startsWith('welcome-')) {
      fileType = 'welcome-output';
      description = `Welcome draft pack output: ${file}`;
    } else if (file.startsWith('late-')) {
      fileType = 'late-checkin-output';
      description = `Late checkin queue output: ${file}`;
    } else if (file.startsWith('daily-ops-')) {
      fileType = 'daily-ops-output';
      description = `Daily ops brief output: ${file}`;
    }
    
    manifestFiles.push({ filename: file, type: fileType, description });
  }
  
  const manifest: PipelineManifest = {
    tool: TOOL_NAME,
    version: VERSION,
    timestamp: new Date().toISOString(),
    date,
    inputs: {
      bookingsPath,
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
  runOptions: { ranWelcome: boolean; ranLate: boolean; ranDailyOps: boolean },
  warnings: string[],
  files: string[]
): string {
  const sections: string[] = [];
  
  sections.push('# Browns Welcome Late Pipeline Pack\n');
  sections.push(`**Date:** ${date}\n`);
  sections.push(`**Generated:** ${new Date().toISOString()}\n`);
  sections.push('**Property:** Dullstroom The Browns Luxury Guest Suites\n');
  sections.push('## Purpose\n');
  sections.push('Orchestrated pack for same-day guest welcome drafts and late/after-hours check-in queue.\n');
  sections.push('**SAFETY:** Never invents guest phone, ETA, rates, or amounts. Never auto-sends WhatsApp/email. Offline only.\n');
  
  sections.push('## Pipeline Summary\n');
  sections.push(`- **browns-welcome-draft-pack:** ${runOptions.ranWelcome ? '✅ Run' : '⏭️ Skipped'}\n`);
  sections.push(`- **browns-late-checkin-queue:** ${runOptions.ranLate ? '✅ Run' : '⏭️ Skipped'}\n`);
  sections.push(`- **browns-daily-ops-brief:** ${runOptions.ranDailyOps ? '✅ Run' : '⏭️ Skipped'}\n`);
  
  if (warnings.length > 0) {
    sections.push('## ⚠️ Warnings\n');
    for (const warning of warnings) {
      sections.push(`- ${warning}\n`);
    }
    sections.push('');
  }
  
  sections.push('## Pack Contents\n');
  
  const welcomeFiles = files.filter(f => f.startsWith('welcome-'));
  const lateFiles = files.filter(f => f.startsWith('late-'));
  const dailyOpsFiles = files.filter(f => f.startsWith('daily-ops-'));
  
  if (welcomeFiles.length > 0) {
    sections.push('### Welcome Draft Pack\n');
    for (const file of welcomeFiles) {
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
  
  if (dailyOpsFiles.length > 0) {
    sections.push('### Daily Ops Brief\n');
    for (const file of dailyOpsFiles) {
      sections.push(`- \`${file}\`\n`);
    }
    sections.push('');
  }
  
  sections.push('## Next Steps\n');
  sections.push('1. Review this PACK.md index\n');
  sections.push('2. Read APPROVAL.md for safety checklist\n');
  sections.push('3. Review welcome drafts (if present)\n');
  sections.push('4. Review late check-in queue (if present)\n');
  sections.push('5. Confirm missing fields filled from approved sources\n');
  sections.push('6. Get approval before any WhatsApp/email send\n');
  sections.push('7. Never auto-send — manual CoS posting required\n');
  
  sections.push('## Safety Reminders\n');
  sections.push('- ✅ Offline only\n');
  sections.push('- ✅ Never auto-send\n');
  sections.push('- ✅ Never invent guest phone, ETA, rates, or amounts\n');
  sections.push('- ✅ Dullstroom / The Browns only\n');
  sections.push('- ⚠️ Approval required before any send\n');
  sections.push('- ⚠️ CoS owns WhatsApp\n');
  
  return sections.join('');
}

/**
 * Generate APPROVAL.md
 */
function generateApprovalMd(
  date: string,
  runOptions: { ranWelcome: boolean; ranLate: boolean; ranDailyOps: boolean }
): string {
  const sections: string[] = [];
  
  sections.push('# Browns Welcome Late Pipeline - APPROVAL CHECKLIST\n');
  sections.push(`**Date:** ${date}\n`);
  sections.push('## Hard Gates\n');
  sections.push('### Never Auto-Send\n');
  sections.push('☐ **Draft only:** All outputs are drafts for manual review\n');
  sections.push('☐ **WhatsApp:** CoS owns WhatsApp Admin - The Browns\n');
  sections.push('☐ **Email:** Never auto-sends email\n');
  sections.push('☐ **Approval required:** Grant/Liana approval before any guest send\n');
  
  sections.push('### Never Invent Data\n');
  sections.push('☐ **Guest phone:** Never invented — `[GUEST_PHONE]` when missing\n');
  sections.push('☐ **ETA/times:** Never invented — `[ETA REQUIRED]` when missing\n');
  sections.push('☐ **Rates:** Never invented — `[RATE CARD REQUIRED]` when missing\n');
  sections.push('☐ **Amounts:** Never invented — only from bookings or approved rate card\n');
  
  sections.push('## Pipeline Summary\n');
  sections.push(`- **Welcome drafts:** ${runOptions.ranWelcome ? 'Generated' : 'Skipped'}\n`);
  sections.push(`- **Late check-in queue:** ${runOptions.ranLate ? 'Generated' : 'Skipped'}\n`);
  sections.push(`- **Daily ops brief:** ${runOptions.ranDailyOps ? 'Generated' : 'Skipped'}\n`);
  
  sections.push('## Data Verification\n');
  sections.push('☐ **Guest names:** Verified against bookings\n');
  sections.push('☐ **Dates:** Check-in and check-out dates confirmed\n');
  sections.push('☐ **Suites:** Suite assignments confirmed\n');
  sections.push('☐ **Missing fields:** Resolved from approved sources (never invented)\n');
  
  sections.push('## Safety Reminders\n');
  sections.push('- ✅ Offline only\n');
  sections.push('- ✅ Never auto-send\n');
  sections.push('- ✅ Dullstroom / The Browns only\n');
  sections.push('- ⚠️ Grant/Liana approval required\n');
  sections.push('- ⚠️ CoS owns WhatsApp\n');
  sections.push('- ⚠️ Never invent phone/ETA/rates/amounts\n');
  
  sections.push('## Approval\n');
  sections.push('☐ All hard gates checked\n');
  sections.push('☐ Data verified\n');
  sections.push('☐ Missing fields resolved\n');
  sections.push('☐ No invented data\n');
  sections.push('☐ Ready to proceed with manual posting (Grant/Liana approval)\n');
  
  sections.push(`\n**Approval phrase:**\n`);
  sections.push('```\n');
  sections.push(`APPROVE SEND WELCOME LATE PACK ${date}\n`);
  sections.push('```\n');
  
  return sections.join('');
}
