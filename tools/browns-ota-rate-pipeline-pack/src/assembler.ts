/**
 * Browns OTA Rate Pipeline Pack Assembler
 * 
 * Orchestrates browns-ota-rate-worksheet for SA Ops / CoS
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { CliOptions, PipelineResult, PipelineManifest, ManifestFile, StageOutput } from './types.js';

const TOOL_NAME = 'browns-ota-rate-pipeline-pack';
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
 * Run browns-ota-rate-worksheet
 */
function runOtaRateWorksheet(ratesPath: string, promoPath: string | undefined): StageOutput {
  const toolName = 'browns-ota-rate-worksheet';
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
  const tempOutdir = path.join(toolPath, 'out', 'worksheet-temp');
  
  try {
    console.log(`Running ${toolName}...`);
    
    let cmd = `npm run worksheet -- --rates ${ratesPath} --outdir ${tempOutdir}`;
    if (promoPath) {
      cmd += ` --promo ${promoPath}`;
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
 * Verify pack files exist (light post-checklist)
 */
function verifyPackFiles(packDir: string): string[] {
  const warnings: string[] = [];
  
  // Check for key files
  const requiredFiles = ['PACK.md', 'APPROVAL.md', 'worksheet.csv', 'worksheet.md'];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(packDir, file))) {
      warnings.push(`Missing expected file: ${file}`);
    }
  }
  
  // Check for APPROVAL.md presence (without parsing content)
  const approvalPath = path.join(packDir, 'APPROVAL.md');
  if (fs.existsSync(approvalPath)) {
    const content = fs.readFileSync(approvalPath, 'utf-8');
    if (!content.includes('APPROVAL')) {
      warnings.push('APPROVAL.md exists but may be incomplete');
    }
  }
  
  return warnings;
}

/**
 * Assemble the pipeline pack
 */
export async function assemblePipeline(options: CliOptions): Promise<PipelineResult> {
  const warnings: string[] = [];
  const date = options.asOf || new Date().toISOString().split('T')[0];
  
  // Validate required options
  if (!options.rates) {
    throw new Error('--rates or --rate-card is required');
  }
  
  // Resolve paths
  const ratesPath = path.resolve(options.rates);
  const promoPath = options.promo ? path.resolve(options.promo) : undefined;
  
  if (!fs.existsSync(ratesPath)) {
    throw new Error(`Rates file not found: ${ratesPath}`);
  }
  
  if (promoPath && !fs.existsSync(promoPath)) {
    warnings.push(`Promo file not found: ${promoPath}`);
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
    ranWorksheet: options.runWorksheet ?? true
  };
  
  const stageOutputs: Record<string, StageOutput> = {};
  
  // Stage 1: browns-ota-rate-worksheet (default ON)
  if (runOptions.ranWorksheet) {
    console.log('=== Stage 1: browns-ota-rate-worksheet ===\n');
    stageOutputs.worksheet = runOtaRateWorksheet(ratesPath, promoPath);
    
    if (!stageOutputs.worksheet.success) {
      warnings.push(`OTA rate worksheet failed: ${stageOutputs.worksheet.error}`);
    }
  } else {
    console.log('=== Stage 1: browns-ota-rate-worksheet (SKIPPED) ===\n');
  }
  
  // Copy outputs to pack directory
  console.log('=== Assembling Pipeline Pack ===\n');
  
  const copiedFiles: string[] = [];
  
  // Copy worksheet outputs
  if (stageOutputs.worksheet?.success && stageOutputs.worksheet.outputDir) {
    const files = discoverOutputFiles(stageOutputs.worksheet.outputDir);
    for (const file of files) {
      const src = path.join(stageOutputs.worksheet.outputDir, file);
      const dest = path.join(packDir, file);
      
      try {
        copyFile(src, dest);
        copiedFiles.push(file);
      } catch (error) {
        warnings.push(`Failed to copy ${file}: ${error}`);
      }
    }
  }
  
  // Generate PACK.md
  const packMd = generatePackMd(date, runOptions, warnings, copiedFiles, ratesPath, promoPath);
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);
  copiedFiles.push('PACK.md');
  
  // Generate APPROVAL.md
  const approvalMd = generateApprovalMd(date, runOptions);
  fs.writeFileSync(path.join(packDir, 'APPROVAL.md'), approvalMd);
  copiedFiles.push('APPROVAL.md');
  
  // Post-checklist verification (light)
  const verifyWarnings = verifyPackFiles(packDir);
  warnings.push(...verifyWarnings);
  
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
    } else if (file === 'worksheet.csv') {
      fileType = 'worksheet-csv';
      description = 'Machine-readable OTA rate worksheet';
    } else if (file === 'worksheet.md') {
      fileType = 'worksheet-md';
      description = 'Human-friendly OTA rate worksheet checklist';
    } else if (file === 'manifest.json') {
      fileType = 'manifest';
      description = 'Pack metadata summary';
    }
    
    manifestFiles.push({ filename: file, type: fileType, description });
  }
  
  const manifest: PipelineManifest = {
    tool: TOOL_NAME,
    version: VERSION,
    timestamp: new Date().toISOString(),
    date,
    inputs: {
      ratesPath,
      promoPath: promoPath || null
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
  runOptions: { ranWorksheet: boolean },
  warnings: string[],
  files: string[],
  ratesPath: string,
  promoPath: string | undefined
): string {
  const sections: string[] = [];
  
  sections.push('# Browns OTA Rate Pipeline Pack\n');
  sections.push(`**Date:** ${date}\n`);
  sections.push(`**Generated:** ${new Date().toISOString()}\n`);
  sections.push('**Property:** Dullstroom The Browns Luxury Guest Suites\n');
  sections.push('## Purpose\n');
  sections.push('Orchestrated pack from rate card CSV → OTA promotional rate worksheet (CSV + Markdown) for Nightsbridge/Grant review.\n');
  sections.push('**SAFETY:** Never invents rates or discounts. Never writes to Nightsbridge/Booking.com. Never auto-sends. Offline only.\n');
  
  sections.push('## Pipeline Summary\n');
  sections.push(`- **browns-ota-rate-worksheet:** ${runOptions.ranWorksheet ? '✅ Run' : '⏭️ Skipped'}\n`);
  
  sections.push('## Inputs\n');
  sections.push(`- **Rate Card:** \`${path.basename(ratesPath)}\`\n`);
  if (promoPath) {
    sections.push(`- **Promotions:** \`${path.basename(promoPath)}\`\n`);
  } else {
    sections.push(`- **Promotions:** None (base rates only)\n`);
  }
  
  if (warnings.length > 0) {
    sections.push('## ⚠️ Warnings\n');
    for (const warning of warnings) {
      sections.push(`- ${warning}\n`);
    }
    sections.push('');
  }
  
  sections.push('## Pack Contents\n');
  
  const worksheetFiles = files.filter(f => f.startsWith('worksheet') || f.includes('worksheet'));
  const otherFiles = files.filter(f => !f.startsWith('worksheet') && !f.includes('worksheet') && f !== 'PACK.md' && f !== 'APPROVAL.md' && f !== 'manifest.json');
  
  if (worksheetFiles.length > 0) {
    sections.push('### OTA Rate Worksheet\n');
    for (const file of worksheetFiles) {
      sections.push(`- \`${file}\`\n`);
    }
    sections.push('');
  }
  
  if (otherFiles.length > 0) {
    sections.push('### Other Files\n');
    for (const file of otherFiles) {
      sections.push(`- \`${file}\`\n`);
    }
    sections.push('');
  }
  
  sections.push('## Next Steps\n');
  sections.push('1. Review this PACK.md index\n');
  sections.push('2. Read APPROVAL.md for safety checklist\n');
  sections.push('3. Review worksheet.md for OTA rate checklist\n');
  sections.push('4. Verify worksheet.csv data accuracy\n');
  sections.push('5. Confirm all rates from approved rate card (never invented)\n');
  sections.push('6. Get Grant approval before any Nightsbridge/OTA changes\n');
  sections.push('7. Never auto-apply — manual Nightsbridge entry only\n');
  
  sections.push('## Safety Reminders\n');
  sections.push('- ✅ Offline only\n');
  sections.push('- ✅ Never auto-send\n');
  sections.push('- ✅ Never invent rates, promos, or amounts (blanks stay blank)\n');
  sections.push('- ✅ Dullstroom / The Browns only\n');
  sections.push('- ⚠️ Grant approval required before any OTA changes\n');
  sections.push('- ⚠️ Never write to Nightsbridge/Booking.com directly\n');
  
  return sections.join('');
}

/**
 * Generate APPROVAL.md
 */
function generateApprovalMd(
  date: string,
  runOptions: { ranWorksheet: boolean }
): string {
  const sections: string[] = [];
  
  sections.push('# Browns OTA Rate Pipeline - APPROVAL CHECKLIST\n');
  sections.push(`**Date:** ${date}\n`);
  sections.push('## Hard Gates\n');
  sections.push('### Never Invent Rates\n');
  sections.push('☐ **Rates source:** All rates from approved rate card only\n');
  sections.push('☐ **No invention:** Never invented or estimated rates\n');
  sections.push('☐ **Blanks stay blank:** Missing rates left blank, not filled\n');
  sections.push('☐ **Promo discounts:** Only from approved promo file\n');
  
  sections.push('### Never Auto-Apply\n');
  sections.push('☐ **Offline only:** No Nightsbridge or Booking.com API calls\n');
  sections.push('☐ **Manual entry:** Worksheet.md is checklist, not automation\n');
  sections.push('☐ **Grant approval:** Required before any OTA changes\n');
  sections.push('☐ **No auto-send:** Never automatically updates live systems\n');
  
  sections.push('## Pipeline Summary\n');
  sections.push(`- **OTA Rate Worksheet:** ${runOptions.ranWorksheet ? 'Generated' : 'Skipped'}\n`);
  
  sections.push('## Data Verification\n');
  sections.push('☐ **Rate card accuracy:** Verified against approved rate card\n');
  sections.push('☐ **Promo discounts:** Verified against approved promo file\n');
  sections.push('☐ **Suites/units:** Confirmed correct suite names\n');
  sections.push('☐ **Seasons:** Confirmed correct season labels\n');
  sections.push('☐ **Currency:** Verified currency code (ZAR for The Browns)\n');
  sections.push('☐ **Missing fields:** Flagged, not invented\n');
  
  sections.push('## Safety Reminders\n');
  sections.push('- ✅ Offline only\n');
  sections.push('- ✅ Never auto-apply\n');
  sections.push('- ✅ Dullstroom / The Browns only\n');
  sections.push('- ⚠️ Grant approval required\n');
  sections.push('- ⚠️ Never write to live OTA systems\n');
  sections.push('- ⚠️ Never invent rates/promos/amounts\n');
  
  sections.push('## Approval\n');
  sections.push('☐ All hard gates checked\n');
  sections.push('☐ Data verified\n');
  sections.push('☐ No invented rates or discounts\n');
  sections.push('☐ Manual Nightsbridge entry only\n');
  sections.push('☐ Ready to proceed with manual OTA updates (Grant approval)\n');
  
  sections.push(`\n**Approval phrase:**\n`);
  sections.push('```\n');
  sections.push(`APPROVE OTA RATE PACK ${date}\n`);
  sections.push('```\n');
  
  return sections.join('');
}
