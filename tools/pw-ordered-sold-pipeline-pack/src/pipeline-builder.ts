/**
 * Pipeline builder for pw-ordered-sold-pipeline-pack
 * 
 * Orchestrates:
 * 1. pw-loyverse-daily-sales-digest (optional, default OFF)
 * 2. pw-ordered-vs-sold-diff (default ON)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import type { PipelineManifest, AssembleResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Ensure sibling tool is built
 */
function ensureSiblingBuilt(toolName: string): void {
  const toolDir = path.resolve(__dirname, '..', '..', toolName);
  
  if (!fs.existsSync(toolDir)) {
    throw new Error(`Sibling tool not found: ${toolName} at ${toolDir}`);
  }
  
  const distDir = path.join(toolDir, 'dist');
  const indexJs = path.join(distDir, 'index.js');
  
  // Check if dist/index.js exists
  if (!fs.existsSync(indexJs)) {
    console.log(`🔨 Auto-building ${toolName}...`);
    
    // Check if node_modules exists, if not, run npm install
    const nodeModules = path.join(toolDir, 'node_modules');
    if (!fs.existsSync(nodeModules)) {
      console.log(`   Installing dependencies for ${toolName}...`);
      execSync('npm install', { cwd: toolDir, stdio: 'inherit' });
    }
    
    // Build the tool
    console.log(`   Building ${toolName}...`);
    execSync('npm run build', { cwd: toolDir, stdio: 'inherit' });
    console.log(`   ✓ ${toolName} built\n`);
  }
}

/**
 * Assemble pipeline pack
 */
export function assemblePipelinePack(config: {
  orderedCsv: string | null;
  soldCsv: string | null;
  salesCsv: string | null;
  store: string | null;
  asOf: string;
  runSales: boolean;
  runDiff: boolean;
  outdir: string;
}): AssembleResult {
  console.log('📦 Assembling pipeline pack...\n');
  
  // Create output directory
  const packDir = path.join(config.outdir, `pw-ordered-sold-pack-${config.asOf}`);
  fs.mkdirSync(packDir, { recursive: true });
  
  const generatedFiles: string[] = [];
  let salesDigestRan = false;
  let diffRan = false;
  
  let salesDigestOutdir: string | null = null;
  let diffOutdir: string | null = null;
  
  // Step 1: Run pw-loyverse-daily-sales-digest (optional)
  if (config.runSales && config.salesCsv) {
    console.log('🔨 Running pw-loyverse-daily-sales-digest...');
    
    try {
      ensureSiblingBuilt('pw-loyverse-daily-sales-digest');
      
      const salesToolDir = path.resolve(__dirname, '..', '..', 'pw-loyverse-daily-sales-digest');
      const tempSalesDir = path.join(config.outdir, 'temp-sales-digest');
      fs.mkdirSync(tempSalesDir, { recursive: true });
      
      const salesCmd = `cd ${salesToolDir} && npm run digest -- --csv ${path.resolve(config.salesCsv)} --outdir ${path.resolve(tempSalesDir)}`;
      
      execSync(salesCmd, { stdio: 'inherit' });
      salesDigestOutdir = tempSalesDir;
      salesDigestRan = true;
      
      console.log('✅ Sales digest generated\n');
    } catch (error) {
      return {
        success: false,
        message: `Failed to run sales digest: ${error instanceof Error ? error.message : String(error)}`,
        outdir: packDir,
        files: []
      };
    }
  } else if (config.runSales && !config.salesCsv) {
    console.log('⚠️  --run-sales enabled but no --sales-csv provided, skipping sales digest\n');
  }
  
  // Step 2: Run pw-ordered-vs-sold-diff (default ON)
  if (config.runDiff) {
    if (!config.orderedCsv || !config.soldCsv) {
      return {
        success: false,
        message: 'Cannot run diff without both --ordered-csv and --sold-csv (or --sales-csv)',
        outdir: packDir,
        files: []
      };
    }
    
    console.log('🔨 Running pw-ordered-vs-sold-diff...');
    
    try {
      ensureSiblingBuilt('pw-ordered-vs-sold-diff');
      
      const diffToolDir = path.resolve(__dirname, '..', '..', 'pw-ordered-vs-sold-diff');
      const tempDiffDir = path.join(config.outdir, 'temp-diff');
      fs.mkdirSync(tempDiffDir, { recursive: true });
      
      let diffCmd = `cd ${diffToolDir} && npm run diff -- --ordered ${path.resolve(config.orderedCsv)} --sold ${path.resolve(config.soldCsv)} --outdir ${path.resolve(tempDiffDir)}`;
      
      // Add store filter if provided
      if (config.store) {
        diffCmd += ` --store-col Store`;
      }
      
      execSync(diffCmd, { stdio: 'inherit' });
      diffOutdir = tempDiffDir;
      diffRan = true;
      
      console.log('✅ Diff generated\n');
    } catch (error) {
      return {
        success: false,
        message: `Failed to run diff: ${error instanceof Error ? error.message : String(error)}`,
        outdir: packDir,
        files: []
      };
    }
  } else {
    console.log('⏭  Skipping pw-ordered-vs-sold-diff (disabled)\n');
  }
  
  // Copy sales digest outputs (if ran)
  if (salesDigestOutdir) {
    console.log('  Copying sales digest outputs...');
    const salesFiles = ['digest.md', 'digest.json', 'missing-fields.md', 'manifest.json'];
    
    for (const file of salesFiles) {
      const srcPath = path.join(salesDigestOutdir, file);
      if (fs.existsSync(srcPath)) {
        const destFile = file === 'manifest.json' ? 'sales-manifest.json' : file;
        const destPath = path.join(packDir, destFile);
        fs.copyFileSync(srcPath, destPath);
        generatedFiles.push(destFile);
        console.log(`    ✓ ${destFile}`);
      } else {
        console.log(`    ⚠ ${file} not found (skipping)`);
      }
    }
  }
  
  // Copy diff outputs (if ran)
  if (diffOutdir) {
    console.log('  Copying diff outputs...');
    const diffFiles = ['diff.md', 'diff.json', 'missing-keys.md'];
    
    for (const file of diffFiles) {
      const srcPath = path.join(diffOutdir, file);
      if (fs.existsSync(srcPath)) {
        const destPath = path.join(packDir, file);
        fs.copyFileSync(srcPath, destPath);
        generatedFiles.push(file);
        console.log(`    ✓ ${file}`);
      } else {
        console.log(`    ⚠ ${file} not found (skipping)`);
      }
    }
  }
  
  // Generate PACK.md
  console.log('  Generating PACK.md...');
  const packMd = generatePackMd({
    asOf: config.asOf,
    store: config.store,
    salesDigestRan,
    diffRan
  });
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);
  generatedFiles.unshift('PACK.md');
  console.log('    ✓ PACK.md');
  
  // Generate APPROVAL.md
  console.log('  Generating APPROVAL.md...');
  const approvalMd = generateApprovalMd({
    asOf: config.asOf,
    salesDigestRan,
    diffRan
  });
  fs.writeFileSync(path.join(packDir, 'APPROVAL.md'), approvalMd);
  generatedFiles.push('APPROVAL.md');
  console.log('    ✓ APPROVAL.md');
  
  // Generate manifest.json (PR #116 - only list files actually present)
  console.log('  Generating manifest.json (pipeline)...');
  const manifest: PipelineManifest = {
    tool: 'pw-ordered-sold-pipeline-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    operations: {
      salesDigestRan,
      diffRan
    },
    inputs: {
      orderedCsv: config.orderedCsv,
      soldCsv: config.soldCsv,
      salesCsv: config.salesCsv,
      store: config.store,
      asOf: config.asOf
    },
    files: generatedFiles
  };
  
  const manifestPath = path.join(packDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  generatedFiles.push('manifest.json');
  console.log('    ✓ manifest.json');
  
  // Clean up temporary directories
  if (salesDigestOutdir && fs.existsSync(salesDigestOutdir)) {
    fs.rmSync(salesDigestOutdir, { recursive: true, force: true });
  }
  
  if (diffOutdir && fs.existsSync(diffOutdir)) {
    fs.rmSync(diffOutdir, { recursive: true, force: true });
  }
  
  return {
    success: true,
    message: `Pipeline pack created: ${packDir}`,
    outdir: packDir,
    files: generatedFiles
  };
}

/**
 * Generate PACK.md index file
 */
function generatePackMd(config: {
  asOf: string;
  store: string | null;
  salesDigestRan: boolean;
  diffRan: boolean;
}): string {
  const dateGenerated = new Date().toISOString();
  
  let content = `# Perfect Water Ordered-Sold Pipeline Pack — ${config.asOf}

One dated pipeline pack for Perfect Water / CoS: optional Loyverse daily sales digest → ordered-vs-sold diff pack with PACK.md + APPROVAL.md.

**Never invents quantities, prices, SKUs, or store names. Offline CSV only. Never writes to Loyverse/Xero. Never sends mail.**

## Contents

`;

  if (config.salesDigestRan) {
    content += `### Sales Digest Files

✅ **pw-loyverse-daily-sales-digest** ran successfully.

- **digest.md** — Human-readable daily sales digest
- **digest.json** — Machine-readable rollup data
- **missing-fields.md** — Data quality report

`;
  } else {
    content += `### Sales Digest

⏭ **pw-loyverse-daily-sales-digest** was skipped (default OFF unless --sales-csv or --run-sales).

`;
  }

  if (config.diffRan) {
    content += `### Diff Files

✅ **pw-ordered-vs-sold-diff** ran successfully.

- **diff.md** — Human-readable ordered vs sold diff
- **diff.json** — Machine-readable diff data
- **missing-keys.md** — Items in one side but not the other

`;
  } else {
    content += `### Diff Files

⏭ **pw-ordered-vs-sold-diff** was skipped (disabled with --no-run-diff).

`;
  }

  content += `### Pipeline Metadata

- **PACK.md** — This file (pipeline pack index)
- **APPROVAL.md** — Approval gates, never invents, never writes live systems
- **manifest.json** — Machine-readable pipeline metadata

`;

  if (config.store) {
    content += `## Store Filter

**Store:** ${config.store}

All outputs are filtered to this store only.

`;
  }

  content += `## Workflow Integration

This pack orchestrates the Perfect Water cost-of-sales reconciliation workflow:

\`\`\`
Optional: Loyverse Sales CSV → pw-loyverse-daily-sales-digest → digest.md/json
Required: Ordered CSV + Sold CSV → pw-ordered-vs-sold-diff → diff.md/json + missing-keys.md
\`\`\`

## Next Steps

1. Review **PACK.md** for pipeline pack contents (no invented quantities)
`;

  if (config.diffRan) {
    content += `2. Open **diff.md** for ordered vs sold deltas (amounts in file, not chat)
3. Check **missing-keys.md** for items in one side but not the other
`;
  }

  if (config.salesDigestRan) {
    content += `4. Review **digest.md** for daily sales rollup
`;
  }

  content += `5. Review **APPROVAL.md** for approval gates and ownership
6. Perfect Water team makes CoS reconciliation decisions
7. Archive this pack in Drive: \`30_PerfectWater/CoS/YYYY-MM/\`

## Safety Reminders

- ✅ **Offline only** — No Loyverse/Xero API, no network calls
- ✅ **Read-only** — Never modifies source CSVs or live systems
- ✅ **No invented quantities** — All amounts from source CSVs only
- ✅ **Perfect Water owns ops** — PW team makes all CoS decisions
- ⚠️ **Amounts stay in files** — Never paste quantities into chat
- ⚠️ **Never writes to live systems** — No Loyverse writes, no Xero writes, no mail

---

*Generated: ${dateGenerated}*
`;

  return content;
}

/**
 * Generate APPROVAL.md
 */
function generateApprovalMd(config: {
  asOf: string;
  salesDigestRan: boolean;
  diffRan: boolean;
}): string {
  const dateGenerated = new Date().toISOString();
  
  let content = `# Perfect Water Ordered-Sold Pipeline Pack — APPROVAL

## Purpose

Offline cost-of-sales reconciliation pipeline pack for Perfect Water.

**Date:** ${config.asOf}

## Operations Performed

`;

  if (config.salesDigestRan) {
    content += `✅ **Sales Digest:** pw-loyverse-daily-sales-digest ran
`;
  } else {
    content += `⏭ **Sales Digest:** Skipped (default OFF)
`;
  }

  if (config.diffRan) {
    content += `✅ **Diff:** pw-ordered-vs-sold-diff ran
`;
  } else {
    content += `⏭ **Diff:** Skipped
`;
  }

  content += `
## Hard Constraints

### Never Invents

- ❌ **No invented quantities** — All amounts from source CSVs only
- ❌ **No invented prices** — Tool never calculates or estimates prices
- ❌ **No invented SKUs** — Only SKUs from source data
- ❌ **No invented store names** — Only stores from source data

### Never Writes

- ❌ **No Loyverse writes** — Offline tool, read-only on Loyverse exports
- ❌ **No Xero writes** — Tool never touches accounting systems
- ❌ **No mail sends** — Tool never emails or messages anyone

### Offline Only

- ✅ **CSV-based** — All inputs from CSV exports
- ✅ **No API calls** — No Loyverse API, no Xero API, no network
- ✅ **File outputs only** — All results stay in files

## Perfect Water Ownership

**Perfect Water owns all cost-of-sales decisions.**

This tool:
- Presents data from CSVs
- Calculates deltas (ordered - sold)
- Flags missing keys
- **NEVER makes inventory adjustments**
- **NEVER posts to accounting**

PW team reviews pack outputs and decides:
- Which deltas require investigation
- Which missing keys are expected
- What CoS adjustments to make (if any)
- Whether to post to Xero (manual, not this tool)

## Approval Gates

Per \`docs/automation/approval-gates.md\`:

- **H3 gate:** Before using pack data for PW CoS decisions
- **Grant approval required:** Before any inventory or CoS adjustments based on pack outputs

## Bot Reminder

**Amounts stay in files.** Never paste quantity figures or amounts into chat unless explicitly requested by Grant.

## Quality Gates

Before using this pack for CoS decisions:

1. ☐ **Verify date range** — Ordered and sold CSVs cover same period
2. ☐ **Check store filter** — If using --store, verify correct store
3. ☐ **Review missing-keys.md** — Understand items in one side but not other
4. ☐ **Investigate large deltas** — Large ordered-sold gaps need explanation
5. ☐ **PW team review** — Perfect Water team approves any CoS adjustments

## Safety Checklist

- ☐ All amounts from source CSVs (no invented quantities)
- ☐ Tool output reviewed, not auto-applied
- ☐ No Loyverse or Xero writes planned
- ☐ PW team makes final CoS decisions
- ☐ Pack archived in Drive: \`30_PerfectWater/CoS/YYYY-MM/\`

---

*Generated: ${dateGenerated}*
`;

  return content;
}
