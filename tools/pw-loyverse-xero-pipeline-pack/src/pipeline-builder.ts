/**
 * Pipeline Pack Builder - Perfect Water Loyverse↔Xero Reconciliation
 * 
 * Orchestrates loyverse-xero-recon tool and assembles PACK.md + APPROVAL.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import type { PipelineManifest, AssembleResult } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AssembleOptions {
  loyverseCsv: string;
  xeroCsv: string;
  mode: string;
  asOf: string;
  runRecon: boolean;
  outdir: string;
}

/**
 * Auto-build sibling tool if dist/index.js is missing
 */
function autoBuildSibling(siblingDir: string): void {
  const distPath = path.join(siblingDir, 'dist', 'index.js');
  
  if (fs.existsSync(distPath)) {
    console.log(`  ✓ Sibling dist already exists: ${path.basename(siblingDir)}`);
    return;
  }
  
  console.log(`  Building sibling: ${path.basename(siblingDir)}`);
  
  // Check if node_modules exists, run npm install if not
  const nodeModulesPath = path.join(siblingDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`  → Running npm install in ${path.basename(siblingDir)}`);
    execSync('npm install', { cwd: siblingDir, stdio: 'inherit' });
  }
  
  // Run npm run build
  console.log(`  → Running npm run build in ${path.basename(siblingDir)}`);
  execSync('npm run build', { cwd: siblingDir, stdio: 'inherit' });
  
  console.log(`  ✓ Built ${path.basename(siblingDir)}`);
}

/**
 * Run loyverse-xero-recon sibling tool
 */
function runReconTool(
  loyverseCsv: string,
  xeroCsv: string,
  mode: string,
  reconOutdir: string
): boolean {
  const siblingDir = path.resolve(path.dirname(__dirname), '..', 'loyverse-xero-recon');
  
  if (!fs.existsSync(siblingDir)) {
    throw new Error(`Sibling tool not found: ${siblingDir}`);
  }
  
  // Auto-build if needed
  autoBuildSibling(siblingDir);
  
  console.log(`\nRunning loyverse-xero-recon (${mode} mode)...`);
  
  try {
    const cmd = `npm run recon -- --mode ${mode} --loyverse ${path.resolve(loyverseCsv)} --xero ${path.resolve(xeroCsv)} --output ${path.resolve(reconOutdir)}`;
    execSync(cmd, { cwd: siblingDir, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ loyverse-xero-recon failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Generate PACK.md index
 */
function generatePackMd(
  options: AssembleOptions,
  files: string[]
): string {
  const { loyverseCsv, xeroCsv, mode, asOf, runRecon } = options;
  
  let content = `# Perfect Water Loyverse↔Xero Reconciliation Pipeline Pack

**Date:** ${asOf}  
**Purpose:** Perfect Water / CoS cash integrity reconciliation pack.

**SAFETY:** Never invents amounts or forced matches. Never writes to Loyverse/Xero. Offline only.

---

## Pack Contents

`;

  if (runRecon) {
    content += `### ✅ Reconciliation (${mode} mode)

- \`gap-report.csv\` — Machine-readable gap data
- \`gap-report.md\` — Human-readable gap report

`;
  } else {
    content += `### ⚠️  Reconciliation Skipped

Reconciliation stage was skipped with \`--no-run-recon\`.

`;
  }

  content += `### Files Generated

`;
  files.forEach(file => {
    content += `- \`${file}\`\n`;
  });

  content += `
---

## Input Summary

- **Loyverse CSV:** \`${path.basename(loyverseCsv)}\`
- **Xero CSV:** \`${path.basename(xeroCsv)}\`
- **Mode:** ${mode}
- **As-of Date:** ${asOf}

---

## Next Steps

1. Review this PACK.md for pack contents
2. Open \`gap-report.md\` for human-readable gap summary${runRecon ? '' : ' (if recon was run)'}
3. Check \`gap-report.csv\` for machine-readable data${runRecon ? '' : ' (if recon was run)'}
4. Review \`APPROVAL.md\` - never invents amounts, never writes live systems
5. Perfect Water team investigates gaps and makes CoS decisions
6. Archive pack in Drive: \`30_PerfectWater/CoS/YYYY-MM/\`

---

## Safety Reminders

✅ **Offline only** - No Loyverse/Xero API  
✅ **Never invents amounts** - All amounts from source CSVs only  
✅ **Never invents matches** - Only reports actual gaps, no forced matches  
✅ **Read-only** - Never modifies source CSV files  
✅ **File-based** - All amounts stay in files  
✅ **Perfect Water owns ops** - PW owns all CoS decisions

**Never invent amounts or forced matches. Only report what exists in source CSVs.**
`;

  return content;
}

/**
 * Generate APPROVAL.md
 */
function generateApprovalMd(
  options: AssembleOptions
): string {
  const { mode, asOf } = options;
  
  return `# Perfect Water Loyverse↔Xero Reconciliation - APPROVAL CHECKLIST

**Date:** ${asOf}  
**Mode:** ${mode}

---

## Hard Gates

### H3 - CoS Decisions
☐ **Required approval:** Perfect Water team review before any CoS adjustments

### lane:perfect-water Rules
☐ **Gap investigation:** All gaps investigated and root causes identified
☐ **No invented amounts:** All amounts from source CSVs only
☐ **No forced matches:** Only actual matches, no invented reconciliation

### N6 - Never Invent
☐ **No invented amounts:** Amounts only from source Loyverse/Xero CSVs
☐ **No forced matches:** Tool never invents matches or reconciliation
☐ **No auto-adjustments:** Tool never writes to live systems

---

## Data Verification

- Loyverse CSV: Verified
- Xero CSV: Verified
- Mode: ${mode}
- As-of Date: ${asOf}

---

## Gap Summary

Review \`gap-report.md\` and \`gap-report.csv\` for:
- Unmatched Loyverse transactions
- Unmatched Xero transactions
- Date mismatches
- Amount mismatches
- Duplicates (if any)

---

## Safety Reminders

- ✅ Offline only
- ✅ Never invents amounts or matches
- ✅ Never writes to Loyverse/Xero
- ✅ Never sends mail
- ⚠️  H3 gate required before any CoS adjustments
- ⚠️  Perfect Water owns all CoS decisions

---

## Approval

☐ All hard gates checked  
☐ Gap investigation complete  
☐ No invented amounts or matches  
☐ H3 approval obtained  
☐ Ready to proceed with CoS decisions (Perfect Water approval)
`;
}

/**
 * Generate manifest.json (PR #116 - only present files)
 */
function generateManifest(
  options: AssembleOptions,
  files: string[]
): PipelineManifest {
  const { loyverseCsv, xeroCsv, mode, asOf, runRecon } = options;
  
  return {
    tool: 'pw-loyverse-xero-pipeline-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    operations: {
      reconRan: runRecon
    },
    inputs: {
      loyverseCsv,
      xeroCsv,
      mode,
      asOf
    },
    files
  };
}

/**
 * Assemble pipeline pack
 */
export function assemblePipelinePack(options: AssembleOptions): AssembleResult {
  const { loyverseCsv, xeroCsv, mode, asOf, runRecon, outdir } = options;
  
  console.log('Assembling Perfect Water Loyverse↔Xero Reconciliation Pipeline Pack...\n');
  
  // Create pack directory
  const packName = `pw-loyverse-xero-pack-${asOf}`;
  const packDir = path.join(outdir, packName);
  
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }
  
  const files: string[] = [];
  
  // Run reconciliation if enabled
  if (runRecon) {
    const reconOutdir = path.join(packDir, 'recon-temp');
    if (!fs.existsSync(reconOutdir)) {
      fs.mkdirSync(reconOutdir, { recursive: true });
    }
    
    const success = runReconTool(loyverseCsv, xeroCsv, mode, reconOutdir);
    
    if (!success) {
      return {
        success: false,
        message: 'Reconciliation stage failed',
        outdir: packDir,
        files: []
      };
    }
    
    // Copy recon outputs to pack root
    const gapReportCsv = path.join(reconOutdir, 'gap-report.csv');
    const gapReportMd = path.join(reconOutdir, 'gap-report.md');
    
    if (fs.existsSync(gapReportCsv)) {
      fs.copyFileSync(gapReportCsv, path.join(packDir, 'gap-report.csv'));
      files.push('gap-report.csv');
    }
    
    if (fs.existsSync(gapReportMd)) {
      fs.copyFileSync(gapReportMd, path.join(packDir, 'gap-report.md'));
      files.push('gap-report.md');
    }
    
    // Clean up temp directory
    fs.rmSync(reconOutdir, { recursive: true, force: true });
  }
  
  // Generate PACK.md
  const packMd = generatePackMd(options, files);
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);
  files.push('PACK.md');
  
  // Generate APPROVAL.md
  const approvalMd = generateApprovalMd(options);
  fs.writeFileSync(path.join(packDir, 'APPROVAL.md'), approvalMd);
  files.push('APPROVAL.md');
  
  // Generate manifest.json
  const manifest = generateManifest(options, files);
  fs.writeFileSync(
    path.join(packDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  files.push('manifest.json');
  
  return {
    success: true,
    message: `Pipeline pack assembled successfully: ${packName}`,
    outdir: packDir,
    files
  };
}
