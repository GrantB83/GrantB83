/**
 * Browns Guest Comms Pipeline Pack Assembler
 * 
 * Orchestrates browns-guest-facts-pack (optional) and browns-guest-comms-draft
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { CliOptions, PipelineResult, PipelineManifest, ManifestFile, StageOutput } from './types.js';

const TOOL_NAME = 'browns-guest-comms-pipeline-pack';
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
 * Build a sibling tool if needed (PR #132 pattern)
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
 * Run browns-guest-facts-pack
 */
function runGuestFactsPack(factsMdPath: string, seedsPath: string | undefined): StageOutput {
  const toolName = 'browns-guest-facts-pack';
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
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const tempOutdir = path.join(toolPath, 'out', `facts-${timestamp}`);
  
  try {
    console.log(`Running ${toolName}...`);
    
    let cmd = `npm run pack -- --facts ${factsMdPath} --outdir ${tempOutdir}`;
    if (seedsPath) {
      cmd += ` --seeds ${seedsPath}`;
    }
    
    execSync(cmd, { cwd: toolPath, stdio: 'inherit' });
    
    console.log(`  ${toolName} completed\n`);
    
    // Discover the actual output directory (may be timestamped subdirectory)
    const entries = fs.readdirSync(tempOutdir, { withFileTypes: true });
    const subdir = entries.find(e => e.isDirectory() && e.name.startsWith('facts-pack-'));
    const actualOutputDir = subdir ? path.join(tempOutdir, subdir.name) : tempOutdir;
    
    return { success: true, outputDir: actualOutputDir };
  } catch (error) {
    return { success: false, error: `Failed to run ${toolName}: ${error}` };
  }
}

/**
 * Run browns-guest-comms-draft
 */
function runGuestCommsDraft(
  bookingPath: string,
  factsPath: string | undefined,
  seedsPath: string | undefined
): StageOutput {
  const toolName = 'browns-guest-comms-draft';
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
  const tempOutdir = path.join(toolPath, 'out', `comms-temp`);
  
  try {
    console.log(`Running ${toolName}...`);
    
    let cmd = `npm run draft -- --booking ${bookingPath} --outdir ${tempOutdir}`;
    if (factsPath) {
      cmd += ` --facts ${factsPath}`;
    }
    if (seedsPath) {
      cmd += ` --seeds ${seedsPath}`;
    }
    
    execSync(cmd, { cwd: toolPath, stdio: 'inherit' });
    
    console.log(`  ${toolName} completed\n`);
    
    // Discover the actual output directory (timestamped job folder)
    const entries = fs.readdirSync(tempOutdir, { withFileTypes: true });
    const subdir = entries.find(e => e.isDirectory());
    const actualOutputDir = subdir ? path.join(tempOutdir, subdir.name) : tempOutdir;
    
    return { success: true, outputDir: actualOutputDir };
  } catch (error) {
    return { success: false, error: `Failed to run ${toolName}: ${error}` };
  }
}

/**
 * Discover files in a directory (flat or with subdirectories)
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
      // Recurse one level for subdirectories like snippets/
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
  const date = options.asOf || new Date().toISOString().split('T')[0];
  
  // Validate required options
  if (!options.booking) {
    throw new Error('--booking is required');
  }
  
  // Resolve paths
  const bookingPath = path.resolve(options.booking);
  const factsMdPath = options.factsMd ? path.resolve(options.factsMd) : undefined;
  const factsJsonPath = options.factsJson ? path.resolve(options.factsJson) : undefined;
  const seedsPath = options.seeds ? path.resolve(options.seeds) : undefined;
  
  if (!fs.existsSync(bookingPath)) {
    throw new Error(`Booking file not found: ${bookingPath}`);
  }
  
  if (factsMdPath && !fs.existsSync(factsMdPath)) {
    warnings.push(`Facts markdown file not found: ${factsMdPath}`);
  }
  
  if (factsJsonPath && !fs.existsSync(factsJsonPath)) {
    warnings.push(`Facts JSON file not found: ${factsJsonPath}`);
  }
  
  if (seedsPath && !fs.existsSync(seedsPath)) {
    warnings.push(`Seeds directory not found: ${seedsPath}`);
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
    ranFacts: options.runFacts ?? false,
    ranComms: options.runComms ?? true
  };
  
  const stageOutputs: Record<string, StageOutput> = {};
  let derivedFactsPath: string | undefined = factsJsonPath;
  
  // Stage 1: browns-guest-facts-pack (optional, default OFF)
  if (runOptions.ranFacts && factsMdPath) {
    console.log('=== Stage 1: browns-guest-facts-pack ===\n');
    stageOutputs.facts = runGuestFactsPack(factsMdPath, seedsPath);
    
    if (!stageOutputs.facts.success) {
      warnings.push(`Guest facts pack failed: ${stageOutputs.facts.error}`);
    } else if (stageOutputs.facts.outputDir) {
      // Use the generated facts.json for comms stage
      const factsJsonFile = path.join(stageOutputs.facts.outputDir, 'facts.json');
      if (fs.existsSync(factsJsonFile)) {
        derivedFactsPath = factsJsonFile;
      }
    }
  } else if (runOptions.ranFacts) {
    console.log('=== Stage 1: browns-guest-facts-pack (SKIPPED - no --facts-md) ===\n');
    warnings.push('Facts stage requested but no --facts-md provided');
  } else {
    console.log('=== Stage 1: browns-guest-facts-pack (SKIPPED) ===\n');
  }
  
  // Stage 2: browns-guest-comms-draft (default ON)
  if (runOptions.ranComms) {
    console.log('=== Stage 2: browns-guest-comms-draft ===\n');
    stageOutputs.comms = runGuestCommsDraft(bookingPath, derivedFactsPath, seedsPath);
    
    if (!stageOutputs.comms.success) {
      warnings.push(`Guest comms draft failed: ${stageOutputs.comms.error}`);
    }
  } else {
    console.log('=== Stage 2: browns-guest-comms-draft (SKIPPED) ===\n');
  }
  
  // Copy outputs to pack directory
  console.log('=== Assembling Pipeline Pack ===\n');
  
  const copiedFiles: string[] = [];
  
  // Copy facts outputs
  if (stageOutputs.facts?.success && stageOutputs.facts.outputDir) {
    const files = discoverOutputFiles(stageOutputs.facts.outputDir);
    for (const file of files) {
      const src = path.join(stageOutputs.facts.outputDir, file);
      const destFile = file.startsWith('facts.json') ? 'facts.json' :
                       file.startsWith('snippets/') ? file :
                       file.startsWith('missing-fields.md') ? 'facts-missing-fields.md' :
                       file.startsWith('APPROVAL.md') ? 'facts-APPROVAL.md' :
                       `facts-${file}`;
      const dest = path.join(packDir, destFile);
      
      try {
        copyFile(src, dest);
        copiedFiles.push(destFile);
      } catch (error) {
        warnings.push(`Failed to copy ${file}: ${error}`);
      }
    }
  }
  
  // Copy comms outputs
  if (stageOutputs.comms?.success && stageOutputs.comms.outputDir) {
    const files = discoverOutputFiles(stageOutputs.comms.outputDir);
    for (const file of files) {
      const src = path.join(stageOutputs.comms.outputDir, file);
      // Don't rename comms outputs - keep original names
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
  const packMd = generatePackMd(date, runOptions, warnings, copiedFiles, bookingPath);
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);
  copiedFiles.push('PACK.md');
  
  // Generate APPROVAL.md
  const approvalMd = generateApprovalMd(date, runOptions);
  fs.writeFileSync(path.join(packDir, 'APPROVAL.md'), approvalMd);
  copiedFiles.push('APPROVAL.md');
  
  // Generate manifest.json (PR #116: only list files that actually exist)
  const manifestFiles: ManifestFile[] = [];
  
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
    } else if (file.startsWith('facts')) {
      fileType = 'facts-output';
      description = `Guest facts pack output: ${file}`;
    } else if (file.startsWith('draft-')) {
      fileType = 'comms-output';
      description = `Guest communications draft: ${file}`;
    } else if (file === 'manifest.json') {
      fileType = 'manifest';
      description = 'Pipeline metadata';
    }
    
    manifestFiles.push({ filename: file, type: fileType, description });
  }
  
  const manifest: PipelineManifest = {
    tool: TOOL_NAME,
    version: VERSION,
    timestamp: new Date().toISOString(),
    date,
    inputs: {
      bookingPath,
      factsMdPath: factsMdPath || null,
      factsJsonPath: factsJsonPath || null,
      seedsPath: seedsPath || null
    },
    runOptions,
    files: manifestFiles
  };
  
  fs.writeFileSync(path.join(packDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  return {
    success: true,
    outdir: packDir,
    message: 'Pipeline pack assembled successfully',
    warnings,
    manifest
  };
}

/**
 * Generate PACK.md index
 */
function generatePackMd(
  date: string,
  runOptions: { ranFacts: boolean; ranComms: boolean },
  warnings: string[],
  files: string[],
  bookingPath: string
): string {
  const sections: string[] = [];
  
  sections.push('# Browns Guest Comms Pipeline Pack\n');
  sections.push(`**Date:** ${date}\n`);
  sections.push(`**Generated:** ${new Date().toISOString()}\n`);
  sections.push('**Property:** Dullstroom The Browns Luxury Guest Suites\n');
  sections.push('## Purpose\n');
  sections.push('One dated pipeline pack: optional knowledge-md → facts.json/snippets → draft WhatsApp/email/late/team notes from booking JSON.\n');
  sections.push('**SAFETY:** Never invents rates, Wi-Fi passwords, phones, or amenities. Never auto-sends WhatsApp/email. Offline only. WhatsApp stays on CoS send path — drafts only for Grant approval.\n');
  
  sections.push('## Pipeline Summary\n');
  sections.push(`- **browns-guest-facts-pack:** ${runOptions.ranFacts ? '✅ Run' : '⏭️ Skipped'}\n`);
  sections.push(`- **browns-guest-comms-draft:** ${runOptions.ranComms ? '✅ Run' : '⏭️ Skipped'}\n`);
  
  if (warnings.length > 0) {
    sections.push('## ⚠️ Warnings\n');
    for (const warning of warnings) {
      sections.push(`- ${warning}\n`);
    }
    sections.push('');
  }
  
  sections.push('## Pack Contents\n');
  
  const factsFiles = files.filter(f => f.startsWith('facts') || f.startsWith('snippets/'));
  const commsFiles = files.filter(f => f.startsWith('draft-'));
  const metaFiles = files.filter(f => f === 'PACK.md' || f === 'APPROVAL.md' || f === 'manifest.json');
  
  if (factsFiles.length > 0) {
    sections.push('### Guest Facts Pack\n');
    for (const file of factsFiles) {
      sections.push(`- \`${file}\`\n`);
    }
    sections.push('');
  }
  
  if (commsFiles.length > 0) {
    sections.push('### Guest Communications Draft\n');
    for (const file of commsFiles) {
      sections.push(`- \`${file}\`\n`);
    }
    sections.push('');
  }
  
  if (metaFiles.length > 0) {
    sections.push('### Pack Metadata\n');
    for (const file of metaFiles) {
      sections.push(`- \`${file}\`\n`);
    }
    sections.push('');
  }
  
  sections.push('## Next Steps\n');
  sections.push('1. Review this PACK.md index\n');
  sections.push('2. Read APPROVAL.md for safety checklist\n');
  sections.push('3. Review guest communications drafts (if present)\n');
  sections.push('4. Confirm no invented rates, passwords, or amenities\n');
  sections.push('5. Get approval before any WhatsApp/email send\n');
  sections.push('6. Never auto-send — manual CoS posting required\n');
  
  sections.push('## Safety Reminders\n');
  sections.push('- ✅ Offline only\n');
  sections.push('- ✅ Never auto-send\n');
  sections.push('- ✅ Never invent rates, Wi-Fi passwords, phones, or amenities\n');
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
  runOptions: { ranFacts: boolean; ranComms: boolean }
): string {
  const sections: string[] = [];
  
  sections.push('# Browns Guest Comms Pipeline - APPROVAL CHECKLIST\n');
  sections.push(`**Date:** ${date}\n`);
  sections.push('## Hard Gates\n');
  sections.push('### Never Auto-Send\n');
  sections.push('☐ **Draft only:** All outputs are drafts for manual review\n');
  sections.push('☐ **WhatsApp:** CoS owns WhatsApp Admin - The Browns\n');
  sections.push('☐ **Email:** Never auto-sends email\n');
  sections.push('☐ **Approval required:** Grant/Liana approval before any guest send\n');
  
  sections.push('### Never Invent Data\n');
  sections.push('☐ **Rates:** Never invented — only from approved rate card\n');
  sections.push('☐ **Wi-Fi passwords:** Never invented — only from knowledge files\n');
  sections.push('☐ **Phone numbers:** Never invented — only from booking data\n');
  sections.push('☐ **Amenities:** Never invented — only from approved knowledge\n');
  sections.push('☐ **Times/ETAs:** Never invented — only from booking or confirmation\n');
  
  sections.push('## Pipeline Summary\n');
  sections.push(`- **Facts extraction:** ${runOptions.ranFacts ? 'Generated' : 'Skipped'}\n`);
  sections.push(`- **Communications draft:** ${runOptions.ranComms ? 'Generated' : 'Skipped'}\n`);
  
  sections.push('## Data Verification\n');
  sections.push('☐ **Guest names:** Verified against booking\n');
  sections.push('☐ **Dates:** Check-in and check-out dates confirmed\n');
  sections.push('☐ **Suite:** Suite assignment confirmed\n');
  sections.push('☐ **Contact info:** Phone/email from booking only (never invented)\n');
  sections.push('☐ **Facts:** All facts from approved knowledge files (never invented)\n');
  
  sections.push('## Safety Reminders\n');
  sections.push('- ✅ Offline only\n');
  sections.push('- ✅ Never auto-send\n');
  sections.push('- ✅ Dullstroom / The Browns only\n');
  sections.push('- ⚠️ Grant/Liana approval required\n');
  sections.push('- ⚠️ CoS owns WhatsApp\n');
  sections.push('- ⚠️ Never invent rates/passwords/amenities/phones\n');
  
  sections.push('## Approval\n');
  sections.push('☐ All hard gates checked\n');
  sections.push('☐ Data verified\n');
  sections.push('☐ No invented data\n');
  sections.push('☐ Ready to proceed with manual posting (Grant/Liana approval)\n');
  
  sections.push(`\n**Approval phrase:**\n`);
  sections.push('```\n');
  sections.push(`APPROVE SEND GUEST COMMS PACK ${date}\n`);
  sections.push('```\n');
  
  return sections.join('');
}
