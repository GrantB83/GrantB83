/**
 * browns-ct-pack-pipeline-pack Assembler
 * 
 * Orchestrates Browns CT pack pipeline tools into one pack
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type {
  CliOptions,
  PipelineResult,
  PipelineManifest
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Assemble the pipeline pack
 */
export async function assemblePipeline(options: CliOptions): Promise<PipelineResult> {
  const warnings: string[] = [];
  const outdir = path.resolve(options.outdir!);

  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  const manifest: PipelineManifest = {
    tool: 'browns-ct-pack-pipeline-pack',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    date: options.date!,
    inputs: {
      bookingsPath: options.bookings || null,
      changeCheckPath: options.changeCheck || null,
      packPath: options.pack || null,
      beforePath: options.before || null,
      afterPath: options.after || null
    },
    runOptions: {
      ranChangeCheck: false,
      ranAssemble: false,
      ranPostChecklist: false
    },
    files: []
  };

  let packDir: string;

  // Step 1: Optionally run booking-change-check
  if (options.runChangeCheck) {
    if (!options.before || !options.after) {
      throw new Error('--run-change-check requires --before and --after paths');
    }
    await runBookingChangeCheck(options.before, options.after, options.date!, warnings);
    manifest.runOptions.ranChangeCheck = true;
  }

  // Step 2: Run ct-pack-assemble or use existing pack
  if (options.pack) {
    packDir = path.resolve(options.pack);
    if (!fs.existsSync(packDir)) {
      throw new Error(`Pack directory not found: ${packDir}`);
    }
    
    if (!fs.existsSync(path.join(packDir, 'PACK.md'))) {
      throw new Error(`PACK.md not found in pack directory: ${packDir}`);
    }
  } else {
    if (!options.bookings) {
      throw new Error('Either --pack or --bookings is required');
    }
    
    packDir = await runCtPackAssemble(options.date!, options.bookings, options.before, options.after, warnings);
    manifest.runOptions.ranAssemble = true;
  }

  // Step 3: Optionally run ct-pack-post-checklist
  let checklistDir: string | null = null;
  
  if (options.runPostChecklist !== false) {
    checklistDir = await runPostChecklist(packDir, warnings);
    manifest.runOptions.ranPostChecklist = true;
  }

  // Copy files to pipeline pack directory
  copyPackFiles(packDir, outdir, manifest);
  
  if (checklistDir && options.runPostChecklist !== false) {
    copyChecklistFiles(checklistDir, outdir, manifest);
  }

  // Generate PACK.md index
  const packMd = generatePackMd(options.date!, manifest, warnings);
  fs.writeFileSync(path.join(outdir, 'PACK.md'), packMd);
  manifest.files.push({
    filename: 'PACK.md',
    type: 'index',
    description: 'Pipeline pack index with workflow summary'
  });

  // Write manifest
  fs.writeFileSync(
    path.join(outdir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  manifest.files.push({
    filename: 'manifest.json',
    type: 'manifest',
    description: 'Machine-readable pipeline metadata'
  });

  return {
    success: true,
    outdir,
    manifest,
    warnings
  };
}

/**
 * Run browns-booking-change-check tool
 */
async function runBookingChangeCheck(
  before: string,
  after: string,
  date: string,
  warnings: string[]
): Promise<void> {
  const toolDir = path.resolve(__dirname, '../../browns-booking-change-check');
  
  if (!fs.existsSync(toolDir)) {
    warnings.push('browns-booking-change-check tool not found - skipping change check');
    return;
  }

  const tempOut = path.join(toolDir, 'out', `change-check-${Date.now()}`);
  
  try {
    execSync(
      `cd "${toolDir}" && npm run check -- --before "${path.resolve(before)}" --after "${path.resolve(after)}" --day "${date}" --outdir "${tempOut}"`,
      { stdio: 'inherit' }
    );
  } catch (error) {
    warnings.push(`Failed to run browns-booking-change-check: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Run browns-ct-pack-assemble tool
 */
async function runCtPackAssemble(
  date: string,
  bookings: string,
  before: string | undefined,
  after: string | undefined,
  warnings: string[]
): Promise<string> {
  const toolDir = path.resolve(__dirname, '../../browns-ct-pack-assemble');
  
  if (!fs.existsSync(toolDir)) {
    throw new Error('browns-ct-pack-assemble tool not found. Ensure sibling tool is installed.');
  }

  const tempOut = path.join(toolDir, 'out', `ct-pack-${date}`);
  
  let cmd = `cd "${toolDir}" && npm run assemble -- --day "${date}" --outdir "${tempOut}" --bookings "${path.resolve(bookings)}"`;
  
  if (before) {
    cmd += ` --before "${path.resolve(before)}"`;
  }
  
  if (after) {
    cmd += ` --after "${path.resolve(after)}"`;
  }
  
  try {
    execSync(cmd, { stdio: 'inherit' });
    
    if (!fs.existsSync(path.join(tempOut, 'PACK.md'))) {
      throw new Error('browns-ct-pack-assemble did not produce PACK.md');
    }
    
    return tempOut;
  } catch (error) {
    throw new Error(`Failed to run browns-ct-pack-assemble: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Run browns-ct-pack-post-checklist tool
 */
async function runPostChecklist(packDir: string, warnings: string[]): Promise<string> {
  const toolDir = path.resolve(__dirname, '../../browns-ct-pack-post-checklist');
  
  if (!fs.existsSync(toolDir)) {
    warnings.push('browns-ct-pack-post-checklist tool not found - skipping post-checklist');
    return '';
  }

  const tempOut = path.join(toolDir, 'out', `checklist-${Date.now()}`);
  
  try {
    execSync(
      `cd "${toolDir}" && npm run checklist -- --pack "${path.resolve(packDir)}" --outdir "${tempOut}"`,
      { stdio: 'inherit' }
    );
    
    return tempOut;
  } catch (error) {
    warnings.push(`Failed to run browns-ct-pack-post-checklist: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

/**
 * Copy files from ct-pack-assemble output
 */
function copyPackFiles(packDir: string, outdir: string, manifest: PipelineManifest): void {
  const filesToCopy = [
    { name: 'PACK.md', type: 'ct-pack-index', desc: 'CT pack index from assemble' },
    { name: 'APPROVAL.md', type: 'ct-pack-approval', desc: 'CT pack approval gates' },
    { name: 'changes.md', type: 'changes', desc: 'Booking changes report' },
    { name: 'daily-ops.md', type: 'daily-ops', desc: 'Daily operations brief' },
    { name: 'manifest.json', type: 'ct-pack-manifest', desc: 'CT pack manifest' }
  ];

  for (const file of filesToCopy) {
    const srcPath = path.join(packDir, file.name);
    if (fs.existsSync(srcPath)) {
      const destName = file.name === 'PACK.md' ? 'CT-PACK.md' : 
                       file.name === 'APPROVAL.md' ? 'CT-PACK-APPROVAL.md' :
                       file.name === 'manifest.json' ? 'ct-pack-manifest.json' :
                       file.name;
      fs.copyFileSync(srcPath, path.join(outdir, destName));
      manifest.files.push({
        filename: destName,
        type: file.type,
        description: file.desc
      });
    }
  }

  const files = fs.readdirSync(packDir);
  for (const file of files) {
    if (file.match(/^(guest|welcome|queue|unknown-time).*\.md$/)) {
      const srcPath = path.join(packDir, file);
      fs.copyFileSync(srcPath, path.join(outdir, file));
      manifest.files.push({
        filename: file,
        type: 'guest-draft',
        description: 'Guest communication draft'
      });
    }
  }
}

/**
 * Copy files from ct-pack-post-checklist output
 */
function copyChecklistFiles(checklistDir: string, outdir: string, manifest: PipelineManifest): void {
  const filesToCopy = [
    { name: 'POST-CHECKLIST.md', type: 'post-checklist', desc: 'Pre-WhatsApp post checklist' },
    { name: 'ISSUES.md', type: 'issues', desc: 'Pack validation issues and warnings' },
    { name: 'APPROVAL.md', type: 'checklist-approval', desc: 'Post-checklist approval gates' }
  ];

  for (const file of filesToCopy) {
    const srcPath = path.join(checklistDir, file.name);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(outdir, file.name));
      manifest.files.push({
        filename: file.name,
        type: file.type,
        description: file.desc
      });
    }
  }
}

/**
 * Generate pipeline PACK.md index
 */
function generatePackMd(date: string, manifest: PipelineManifest, warnings: string[]): string {
  let md = `# Browns CT Pack Pipeline\n\n`;
  md += `**Date:** ${date}\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  md += `**Purpose:** Orchestrated Browns CT pack for CoS WhatsApp Admin drafts.\n\n`;
  
  md += `---\n\n`;
  md += `## Pipeline Summary\n\n`;
  
  md += `**Stages:**\n\n`;
  md += `1. **Booking Change Check:** ${manifest.runOptions.ranChangeCheck ? '✅ Run' : '⏭️ Skipped'}\n`;
  md += `2. **CT Pack Assemble:** ${manifest.runOptions.ranAssemble ? '✅ Run' : '📦 Used existing pack'}\n`;
  md += `3. **Post-Checklist:** ${manifest.runOptions.ranPostChecklist ? '✅ Run' : '⏭️ Skipped'}\n\n`;
  
  md += `---\n\n`;
  md += `## Pack Contents\n\n`;
  
  md += `**Pipeline Files:**\n`;
  for (const file of manifest.files) {
    if (file.type === 'index' || file.type === 'manifest') continue;
    md += `- \`${file.filename}\` - ${file.description}\n`;
  }
  md += `\n`;
  
  if (warnings.length > 0) {
    md += `---\n\n`;
    md += `## ⚠️ Warnings\n\n`;
    for (const warning of warnings) {
      md += `- ${warning}\n`;
    }
    md += `\n`;
  }
  
  md += `---\n\n`;
  md += `## Next Steps\n\n`;
  
  if (manifest.runOptions.ranPostChecklist) {
    md += `1. Review \`POST-CHECKLIST.md\` for go/no-go items\n`;
    md += `2. Check \`ISSUES.md\` for any validation warnings\n`;
    md += `3. Review \`CT-PACK.md\` for timed checklist (20:00 / 09:00 / 21:00 CT)\n`;
    md += `4. Manual WhatsApp Admin post (CoS approval required)\n\n`;
  } else {
    md += `1. Review \`CT-PACK.md\` for timed checklist (20:00 / 09:00 / 21:00 CT)\n`;
    md += `2. Review \`CT-PACK-APPROVAL.md\` for approval gates\n`;
    md += `3. Manual WhatsApp Admin post (CoS approval required)\n\n`;
  }
  
  md += `---\n\n`;
  md += `## Safety Reminders\n\n`;
  md += `- ✅ **Offline only** - No WhatsApp send, no invented data\n`;
  md += `- ✅ **Drafts only** - All outputs for CoS manual approval\n`;
  md += `- ✅ **CoS owns WhatsApp** - Never auto-send\n`;
  md += `- ⚠️ **Review before posting** - Every file, every time\n\n`;
  
  md += `---\n\n`;
  md += `**Tool:** browns-ct-pack-pipeline-pack v1.0.0  \n`;
  md += `**Property:** Dullstroom The Browns Luxury Guest Suites  \n`;
  md += `**Timezone:** America/Chicago (CT)\n`;
  
  return md;
}
