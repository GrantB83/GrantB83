/**
 * Pipeline builder for pw-grv-stocktake-pipeline-pack
 * 
 * Orchestrates:
 * 1. pw-grv-csv-normalize (optional, if raw GRV provided)
 * 2. pw-stocktake-csv-normalize (optional, if raw stocktake provided)
 * 3. pw-grv-vs-stocktake-diff (required for meaningful pack)
 * 4. pw-inventory-recon-pack (optional, default ON if it works)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import type { PipelineManifest, AssembleResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build pipeline pack from normalized CSV inputs
 */
export function buildPipelineFromNormalizedCsvs(
  grvNormPath: string,
  stockNormPath: string,
  runInventoryRecon: boolean,
  skipDiff: boolean,
  outdir: string
): AssembleResult {
  console.log('📂 Using normalized CSV inputs');
  console.log(`   GRV: ${grvNormPath}`);
  console.log(`   Stocktake: ${stockNormPath}\n`);
  
  // Validate inputs
  if (!fs.existsSync(grvNormPath)) {
    return {
      success: false,
      message: `GRV normalized CSV not found: ${grvNormPath}`,
      outdir,
      files: []
    };
  }
  
  if (!fs.existsSync(stockNormPath)) {
    return {
      success: false,
      message: `Stocktake normalized CSV not found: ${stockNormPath}`,
      outdir,
      files: []
    };
  }
  
  return assemblePipelinePack({
    grvNorm: grvNormPath,
    stockNorm: stockNormPath,
    grvRaw: null,
    stockRaw: null,
    diffOutdir: null,
    runNormalize: false,
    runDiff: !skipDiff,
    runInventoryRecon,
    outdir
  });
}

/**
 * Build pipeline pack from raw CSV inputs (runs normalization first)
 */
export function buildPipelineFromRawCsvs(
  grvRawPath: string,
  stockRawPath: string,
  runInventoryRecon: boolean,
  skipDiff: boolean,
  outdir: string
): AssembleResult {
  console.log('📂 Using raw CSV inputs (will normalize first)');
  console.log(`   Raw GRV: ${grvRawPath}`);
  console.log(`   Raw Stocktake: ${stockRawPath}\n`);
  
  // Validate inputs
  if (!fs.existsSync(grvRawPath)) {
    return {
      success: false,
      message: `Raw GRV CSV not found: ${grvRawPath}`,
      outdir,
      files: []
    };
  }
  
  if (!fs.existsSync(stockRawPath)) {
    return {
      success: false,
      message: `Raw stocktake CSV not found: ${stockRawPath}`,
      outdir,
      files: []
    };
  }
  
  return assemblePipelinePack({
    grvNorm: null,
    stockNorm: null,
    grvRaw: grvRawPath,
    stockRaw: stockRawPath,
    diffOutdir: null,
    runNormalize: true,
    runDiff: !skipDiff,
    runInventoryRecon,
    outdir
  });
}

/**
 * Build pipeline pack from prebuilt diff outputs
 */
export function buildPipelineFromDiffOutputs(
  diffOutdir: string,
  runInventoryRecon: boolean,
  outdir: string
): AssembleResult {
  console.log(`📂 Using prebuilt diff outputs: ${diffOutdir}\n`);
  
  // Validate diff output directory
  if (!fs.existsSync(diffOutdir)) {
    return {
      success: false,
      message: `Diff output directory not found: ${diffOutdir}`,
      outdir,
      files: []
    };
  }
  
  const diffMd = path.join(diffOutdir, 'diff.md');
  if (!fs.existsSync(diffMd)) {
    return {
      success: false,
      message: `diff.md not found in ${diffOutdir}`,
      outdir,
      files: []
    };
  }
  
  return assemblePipelinePack({
    grvNorm: null,
    stockNorm: null,
    grvRaw: null,
    stockRaw: null,
    diffOutdir,
    runNormalize: false,
    runDiff: false,
    runInventoryRecon,
    outdir
  });
}

/**
 * Assemble pipeline pack
 */
function assemblePipelinePack(config: {
  grvNorm: string | null;
  stockNorm: string | null;
  grvRaw: string | null;
  stockRaw: string | null;
  diffOutdir: string | null;
  runNormalize: boolean;
  runDiff: boolean;
  runInventoryRecon: boolean;
  outdir: string;
}): AssembleResult {
  console.log('📦 Assembling pipeline pack...\n');
  
  // Create output directory
  const packDir = path.join(config.outdir, 'pw-grv-stocktake-pack');
  fs.mkdirSync(packDir, { recursive: true });
  
  const generatedFiles: string[] = [];
  let grvNormalized = false;
  let stocktakeNormalized = false;
  let diffGenerated = false;
  let inventoryReconRan = false;
  
  let grvNormPath = config.grvNorm;
  let stockNormPath = config.stockNorm;
  let diffOutdir = config.diffOutdir;
  
  // Step 1: Normalize GRV if raw provided
  if (config.runNormalize && config.grvRaw) {
    console.log('🔨 Running pw-grv-csv-normalize...');
    
    try {
      const grvNormDir = path.join(config.outdir, 'temp-grv-normalized');
      fs.mkdirSync(grvNormDir, { recursive: true });
      
      const grvToolDir = path.resolve(__dirname, '../../pw-grv-csv-normalize');
      const grvCmd = `cd ${grvToolDir} && npm run normalize -- --in ${path.resolve(config.grvRaw)} --outdir ${path.resolve(grvNormDir)}`;
      
      execSync(grvCmd, { stdio: 'inherit' });
      grvNormPath = path.join(grvNormDir, 'grv-normalized.csv');
      grvNormalized = true;
      
      console.log('✅ GRV normalized\n');
    } catch (error) {
      return {
        success: false,
        message: `Failed to normalize GRV: ${error instanceof Error ? error.message : String(error)}`,
        outdir: packDir,
        files: []
      };
    }
  }
  
  // Step 2: Normalize stocktake if raw provided
  if (config.runNormalize && config.stockRaw) {
    console.log('🔨 Running pw-stocktake-csv-normalize...');
    
    try {
      const stockNormDir = path.join(config.outdir, 'temp-stocktake-normalized');
      fs.mkdirSync(stockNormDir, { recursive: true });
      
      const stockToolDir = path.resolve(__dirname, '../../pw-stocktake-csv-normalize');
      const stockCmd = `cd ${stockToolDir} && npm run normalize -- --input ${path.resolve(config.stockRaw!)} --outdir ${path.resolve(stockNormDir)}`;
      
      execSync(stockCmd, { stdio: 'inherit' });
      stockNormPath = path.join(stockNormDir, 'stocktake-normalized.csv');
      stocktakeNormalized = true;
      
      console.log('✅ Stocktake normalized\n');
    } catch (error) {
      return {
        success: false,
        message: `Failed to normalize stocktake: ${error instanceof Error ? error.message : String(error)}`,
        outdir: packDir,
        files: []
      };
    }
  }
  
  // Step 3: Generate diff (required for meaningful pack)
  if (config.runDiff && !diffOutdir) {
    if (!grvNormPath || !stockNormPath) {
      return {
        success: false,
        message: 'Cannot run diff without normalized GRV and stocktake CSVs',
        outdir: packDir,
        files: []
      };
    }
    
    console.log('🔨 Running pw-grv-vs-stocktake-diff...');
    
    try {
      const tempDiffDir = path.join(config.outdir, 'temp-diff');
      fs.mkdirSync(tempDiffDir, { recursive: true });
      
      const diffToolDir = path.resolve(__dirname, '../../pw-grv-vs-stocktake-diff');
      const diffCmd = `cd ${diffToolDir} && npm run diff -- --grv ${path.resolve(grvNormPath)} --stocktake ${path.resolve(stockNormPath)} --outdir ${path.resolve(tempDiffDir)}`;
      
      execSync(diffCmd, { stdio: 'inherit' });
      diffOutdir = tempDiffDir;
      diffGenerated = true;
      
      console.log('✅ Diff generated\n');
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate diff: ${error instanceof Error ? error.message : String(error)}`,
        outdir: packDir,
        files: []
      };
    }
  }
  
  // Copy diff outputs
  if (diffOutdir) {
    console.log('  Copying diff outputs...');
    const diffFiles = ['diff.md', 'diff.json', 'missing-keys.md', 'APPROVAL.md'];
    
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
  
  // Step 4: Run pw-inventory-recon-pack (optional, default ON)
  if (config.runInventoryRecon && diffOutdir) {
    console.log('\n🔨 Running pw-inventory-recon-pack...');
    
    try {
      const reconToolDir = path.resolve(__dirname, '../../pw-inventory-recon-pack');
      const reconCmd = `cd ${reconToolDir} && npm run pack -- --diff-outdir ${path.resolve(diffOutdir)} --outdir ${path.resolve(packDir)}/temp-recon`;
      
      execSync(reconCmd, { stdio: 'inherit' });
      
      // Copy recon pack outputs
      const reconOutdir = path.join(packDir, 'temp-recon');
      if (fs.existsSync(reconOutdir)) {
        const reconFiles = fs.readdirSync(reconOutdir);
        console.log('  Copying inventory-recon-pack outputs...');
        
        for (const file of reconFiles) {
          if (file.startsWith('PACK') || file.startsWith('manifest')) continue; // Skip to avoid conflicts
          
          const srcPath = path.join(reconOutdir, file);
          if (fs.statSync(srcPath).isFile()) {
            const destFile = file.startsWith('APPROVAL') ? 'APPROVAL-RECON.md' : file;
            const destPath = path.join(packDir, destFile);
            
            // Don't overwrite existing APPROVAL.md from diff
            if (!fs.existsSync(destPath)) {
              fs.copyFileSync(srcPath, destPath);
              generatedFiles.push(destFile);
              console.log(`    ✓ ${destFile}`);
            }
          }
        }
        
        // Clean up temp recon directory
        fs.rmSync(reconOutdir, { recursive: true, force: true });
      }
      
      inventoryReconRan = true;
      console.log('✅ Inventory recon pack completed\n');
    } catch (error) {
      console.error(`⚠ Failed to run inventory-recon-pack: ${error instanceof Error ? error.message : String(error)}`);
      console.error('  Continuing without inventory-recon outputs...\n');
      inventoryReconRan = false;
    }
  } else if (config.runInventoryRecon && !diffOutdir) {
    console.log('\n⚠ Cannot run inventory-recon-pack without diff outputs\n');
  } else if (!config.runInventoryRecon) {
    console.log('\n⏭  Skipping pw-inventory-recon-pack (disabled)\n');
  }
  
  // Generate PACK.md
  console.log('  Generating PACK.md...');
  const packMd = generatePackMd({
    inventoryReconRan,
    inventoryReconAttempted: config.runInventoryRecon
  });
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);
  generatedFiles.unshift('PACK.md');
  console.log('    ✓ PACK.md');
  
  // Generate manifest.json (PR #116 - only list files actually present)
  console.log('  Generating manifest.json (pipeline)...');
  const manifest: PipelineManifest = {
    tool: 'pw-grv-stocktake-pipeline-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    operations: {
      grvNormalized,
      stocktakeNormalized,
      diffGenerated,
      inventoryReconRan
    },
    inputs: {
      grvNorm: config.grvNorm,
      stockNorm: config.stockNorm,
      grvRaw: config.grvRaw,
      stockRaw: config.stockRaw,
      diffOutdir: config.diffOutdir
    },
    files: generatedFiles
  };
  
  const manifestPath = path.join(packDir, 'PACK-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  generatedFiles.push('PACK-manifest.json');
  console.log('    ✓ PACK-manifest.json');
  
  // Clean up temporary directories
  if (grvNormalized) {
    const grvNormDir = path.join(config.outdir, 'temp-grv-normalized');
    if (fs.existsSync(grvNormDir)) {
      fs.rmSync(grvNormDir, { recursive: true, force: true });
    }
  }
  
  if (stocktakeNormalized) {
    const stockNormDir = path.join(config.outdir, 'temp-stocktake-normalized');
    if (fs.existsSync(stockNormDir)) {
      fs.rmSync(stockNormDir, { recursive: true, force: true });
    }
  }
  
  if (diffGenerated) {
    const tempDiffDir = path.join(config.outdir, 'temp-diff');
    if (fs.existsSync(tempDiffDir)) {
      fs.rmSync(tempDiffDir, { recursive: true, force: true });
    }
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
  inventoryReconRan: boolean;
  inventoryReconAttempted: boolean;
}): string {
  const dateGenerated = new Date().toISOString();
  
  let content = `# Perfect Water GRV + Stocktake Pipeline Pack

Assembled pipeline pack orchestrating \`pw-grv-csv-normalize\` → \`pw-stocktake-csv-normalize\` → \`pw-grv-vs-stocktake-diff\` → optional \`pw-inventory-recon-pack\` for offline Perfect Water inventory reconciliation.

**Never invents stock quantities or rand amounts. Never pays. Offline validation only.**

## Contents

### Core Diff Files

- **diff.md** — Human-readable diff report (Store, Item, Received, Counted, Delta)
- **diff.json** — Machine-readable diff data with totals
- **missing-keys.md** — Items in GRV but not stocktake, or vice versa
- **APPROVAL.md** — Approval gates and PW ownership reminder
`;

  if (config.inventoryReconRan) {
    content += `
### Inventory Recon Pack Files

✅ **pw-inventory-recon-pack** ran successfully. Additional outputs included.

Check this pack directory for additional recon files.
`;
  } else if (config.inventoryReconAttempted && !config.inventoryReconRan) {
    content += `
### Inventory Recon Pack

⚠️ **pw-inventory-recon-pack** attempted but failed or was skipped.

See logs above for details. The core diff files above are still available for manual review.
`;
  } else {
    content += `
### Inventory Recon Pack

⏭ **pw-inventory-recon-pack** was disabled. Use diff files above for reconciliation.
`;
  }

  content += `
### Pipeline Metadata

- **PACK.md** — This file (pipeline pack index)
- **PACK-manifest.json** — Machine-readable pipeline metadata

## Workflow Integration

This pack orchestrates the Perfect Water inventory reconciliation workflow:

\`\`\`
Raw/Normalized GRV + Stocktake → pw-grv-vs-stocktake-diff → [optional pw-inventory-recon-pack] → H3 approval → PW inventory decisions
\`\`\`

## Next Steps

1. Review **diff.md** for Store + SKU/Item deltas (amounts in file, not chat)
2. Check **missing-keys.md** for items in one side but not the other
3. Review **APPROVAL.md** for approval gates and ownership
4. Perfect Water team makes inventory adjustment decisions (H3 gate)
5. Archive this pack in Drive: \`30_PerfectWater/InventoryRecon/YYYY-MM/\`

## Safety Reminders

- ✅ **Offline only** — No Loyverse API, no network calls
- ✅ **Read-only** — Never modifies source CSVs or inventory systems
- ✅ **No invented quantities** — All amounts from source CSVs only
- ✅ **Perfect Water owns ops** — PW team makes all inventory decisions
- ✅ **H3 approval required** — Per \`docs/automation/approval-gates.md\`
- ⚠️ **Amounts stay in files** — Never paste quantities into chat

---

*Generated: ${dateGenerated}*
`;

  return content;
}
