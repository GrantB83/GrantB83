/**
 * Pipeline builder for attachment-filename-index-pipeline-pack
 * 
 * Orchestrates attachment-filename-index into a single offline pipeline pack
 * with PACK.md + APPROVAL.md + manifest.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import type { PipelineManifest, AssembleResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build pipeline pack from filename list
 */
export function buildPipelineFromFiles(
  filesPath: string,
  subjectsPath: string | null,
  runIndex: boolean,
  outdir: string,
  asOf: string | null
): AssembleResult {
  console.log(`📂 Using filename list: ${filesPath}`);
  
  if (!fs.existsSync(filesPath)) {
    return {
      success: false,
      message: `Filename list not found: ${filesPath}`,
      outdir,
      files: [],
      warnings: [],
      manifest: createEmptyManifest(asOf, filesPath, null, null, false)
    };
  }
  
  if (!runIndex) {
    return {
      success: false,
      message: 'Index stage is disabled but required for pipeline pack',
      outdir,
      files: [],
      warnings: [],
      manifest: createEmptyManifest(asOf, filesPath, null, subjectsPath, false)
    };
  }
  
  return assemblePipelinePack(filesPath, null, subjectsPath, runIndex, outdir, asOf);
}

/**
 * Build pipeline pack from directory
 */
export function buildPipelineFromDirectory(
  dirPath: string,
  subjectsPath: string | null,
  runIndex: boolean,
  outdir: string,
  asOf: string | null
): AssembleResult {
  console.log(`📂 Using directory: ${dirPath}`);
  
  if (!fs.existsSync(dirPath)) {
    return {
      success: false,
      message: `Directory not found: ${dirPath}`,
      outdir,
      files: [],
      warnings: [],
      manifest: createEmptyManifest(asOf, null, dirPath, null, false)
    };
  }
  
  if (!runIndex) {
    return {
      success: false,
      message: 'Index stage is disabled but required for pipeline pack',
      outdir,
      files: [],
      warnings: [],
      manifest: createEmptyManifest(asOf, null, dirPath, subjectsPath, false)
    };
  }
  
  return assemblePipelinePack(null, dirPath, subjectsPath, runIndex, outdir, asOf);
}

/**
 * Assemble pipeline pack by running attachment-filename-index
 */
function assemblePipelinePack(
  filesPath: string | null,
  dirPath: string | null,
  subjectsPath: string | null,
  runIndex: boolean,
  outdir: string,
  asOf: string | null
): AssembleResult {
  console.log('📦 Assembling pipeline pack...');
  
  const warnings: string[] = [];
  
  // Create output directory
  const packDir = asOf 
    ? path.join(outdir, `attachment-index-pack-${asOf}`)
    : path.join(outdir, 'attachment-index-pack');
  fs.mkdirSync(packDir, { recursive: true });
  
  const generatedFiles: string[] = [];
  
  if (runIndex) {
    console.log('\n🔨 Running attachment-filename-index...');
    
    try {
      // Auto-build sibling tool if dist missing
      const indexToolDir = path.resolve(__dirname, '../../attachment-filename-index');
      const indexDistPath = path.join(indexToolDir, 'dist', 'index.js');
      
      if (!fs.existsSync(indexDistPath)) {
        console.log('⚙️  Building attachment-filename-index (dist missing)...');
        
        // Install dependencies if node_modules missing
        const nodeModulesPath = path.join(indexToolDir, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
          console.log('   Installing dependencies...');
          try {
            execSync('npm install', {
              cwd: indexToolDir,
              stdio: 'inherit'
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
              success: false,
              message: `Failed to install attachment-filename-index dependencies: ${errorMessage}`,
              outdir: packDir,
              files: [],
              warnings,
              manifest: createEmptyManifest(asOf, filesPath, dirPath, subjectsPath, false)
            };
          }
        }
        
        // Build the tool
        try {
          execSync('npm run build', {
            cwd: indexToolDir,
            stdio: 'inherit'
          });
          console.log('✅ attachment-filename-index built successfully\n');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            message: `Failed to build attachment-filename-index: ${errorMessage}`,
            outdir: packDir,
            files: [],
            warnings,
            manifest: createEmptyManifest(asOf, filesPath, dirPath, subjectsPath, false)
          };
        }
      }
      
      // Create temporary output directory for index stage
      const tempIndexDir = path.join(outdir, 'temp-index-output');
      fs.mkdirSync(tempIndexDir, { recursive: true });
      
      // Build index command using node dist/index.js (PR #141 pattern)
      let indexArgs = `--output ${tempIndexDir}`;
      
      if (filesPath) {
        indexArgs += ` --files ${filesPath}`;
      } else if (dirPath) {
        indexArgs += ` --dir ${dirPath}`;
      }
      
      if (subjectsPath) {
        indexArgs += ` --subjects ${subjectsPath}`;
      }
      
      // Run index tool via node dist/index.js
      const indexCmd = `node ${indexDistPath} ${indexArgs}`;
      console.log(`  Command: ${indexCmd}`);
      execSync(indexCmd, { stdio: 'inherit' });
      
      console.log('✅ Index completed\n');
      
      // Copy index outputs
      console.log('  Copying index outputs...');
      const indexFiles = ['index.csv', 'index.md'];
      
      for (const file of indexFiles) {
        const srcPath = path.join(tempIndexDir, file);
        if (fs.existsSync(srcPath)) {
          const destPath = path.join(packDir, file);
          fs.copyFileSync(srcPath, destPath);
          generatedFiles.push(file);
          console.log(`    ✓ ${file}`);
        } else {
          warnings.push(`${file} not found in index output (expected)`);
          console.log(`    ⚠ ${file} not found (skipping)`);
        }
      }
      
      // Clean up temp index directory
      fs.rmSync(tempIndexDir, { recursive: true, force: true });
      
    } catch (error) {
      return {
        success: false,
        message: `Failed to run attachment-filename-index: ${error instanceof Error ? error.message : String(error)}`,
        outdir: packDir,
        files: [],
        warnings,
        manifest: createEmptyManifest(asOf, filesPath, dirPath, subjectsPath, false)
      };
    }
  } else {
    console.log('\n⏭  Skipping attachment-filename-index (disabled)\n');
  }
  
  // Generate PACK.md
  console.log('  Generating PACK.md...');
  const packMd = generatePackMd(asOf, runIndex, generatedFiles.length > 0);
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);
  generatedFiles.unshift('PACK.md');
  console.log('    ✓ PACK.md');
  
  // Generate APPROVAL.md
  console.log('  Generating APPROVAL.md...');
  const approvalMd = generateApprovalMd();
  fs.writeFileSync(path.join(packDir, 'APPROVAL.md'), approvalMd);
  generatedFiles.push('APPROVAL.md');
  console.log('    ✓ APPROVAL.md');
  
  // Generate manifest.json (PR #116 - only list files actually present)
  console.log('  Generating manifest.json...');
  
  // Add manifest.json to files list before creating manifest (so it includes itself)
  const manifestFiles = [...generatedFiles, 'manifest.json'];
  
  const manifest: PipelineManifest = {
    tool: 'attachment-filename-index-pipeline-pack',
    version: '1.0.0',
    asOf: asOf,
    generatedAt: new Date().toISOString(),
    indexRan: runIndex && generatedFiles.includes('index.csv'),
    inputFiles: {
      filesPath: filesPath || undefined,
      dirPath: dirPath || undefined,
      subjectsPath: subjectsPath || undefined
    },
    files: manifestFiles
  };
  
  fs.writeFileSync(
    path.join(packDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  generatedFiles.push('manifest.json');
  console.log('    ✓ manifest.json');
  
  return {
    success: true,
    message: `Pipeline pack created: ${packDir}`,
    outdir: packDir,
    files: generatedFiles,
    warnings,
    manifest
  };
}

/**
 * Generate PACK.md index file
 */
function generatePackMd(
  asOf: string | null,
  indexRan: boolean,
  indexSucceeded: boolean
): string {
  const dateLabel = asOf || 'YYYY-MM-DD';
  const dateGenerated = new Date().toISOString();
  
  let content = `# Attachment Filename Index Pipeline Pack`;
  
  if (asOf) {
    content += ` — ${asOf}`;
  }
  
  content += `

Assembled pipeline pack combining \`attachment-filename-index\` for offline filename indexing and structured index generation.

**Never opens file bodies. Never invents dates/amounts/legal positions. Filename heuristics only.**

## Contents

### Index Files
`;

  if (indexRan && indexSucceeded) {
    content += `
- **index.csv** — Machine-readable CSV index with all indexed files
- **index.md** — Human-readable Markdown report with summary and entity counts
`;
  } else if (indexRan && !indexSucceeded) {
    content += `
⚠️ Index run failed or was incomplete. See logs above.
`;
  } else {
    content += `
⏭ Index stage was skipped (disabled).
`;
  }

  content += `
### Pack Metadata

- **PACK.md** — This file (pipeline pack index)
- **APPROVAL.md** — Review workflow gates
- **manifest.json** — Machine-readable metadata

## Workflow Integration

This pack orchestrates filename indexing for Vault, Family, and CoS operations:

\`\`\`
Filename list or directory → attachment-filename-index → Structured index pack
\`\`\`

## Next Steps

1. Review **index.md** for human-readable index report
2. Use **index.csv** for spreadsheet operations or filtering
3. Review **APPROVAL.md** for workflow gates
4. Apply manual review and action as needed

## Safety Reminders

- ✅ **Offline only** — No Google Drive/Gmail API or network calls
- ✅ **No file body reads** — Filename heuristics only
- ✅ **Read-only** — Never modifies source files
- ✅ **No invented data** — Never fabricates dates/amounts/legal positions
- ⚠️ **Manual review required** — Review all index outputs before action
- ⚠️ **Heuristic-based** — Entity tagging may have false positives/negatives

---

*Generated: ${dateGenerated}*
`;

  return content;
}

/**
 * Generate APPROVAL.md workflow gates file
 */
function generateApprovalMd(): string {
  return `# Attachment Filename Index - Approval Gates

## Purpose

This pipeline pack provides **filename-based indexing** for Vault, Family, and CoS document operations. All outputs are for **manual review only**.

## Approval Gates

### Gate 1: Manual Review Required

- ✅ Review all index outputs before taking action
- ✅ Verify entity tags and date extractions are reasonable
- ✅ Flag any unexpected classifications for manual investigation

### Gate 2: No Automated Actions

- ❌ Never auto-file, auto-label, or auto-move based solely on index output
- ❌ Never auto-send emails or messages based on index results
- ✅ All filing/labeling/moving requires human review and approval

### Gate 3: Data Privacy

- ✅ Keep index outputs local only (do not commit real data to git)
- ✅ Never paste sensitive filename lists into chat or public channels
- ✅ Treat all index outputs as confidential

## Workflow Checklist

- [ ] Index outputs reviewed for accuracy
- [ ] Entity tags verified as reasonable
- [ ] Date extractions validated where critical
- [ ] Unknown/unmatched files flagged for manual review
- [ ] Manual action plan approved before execution
- [ ] No automated bulk operations without explicit approval

## Safety Rules

1. **Offline only** - No Google Drive/Gmail API or network calls
2. **No file body reads** - Filename heuristics only
3. **Read-only** - Never modifies source files
4. **No data invention** - Never fabricates dates/amounts/legal positions
5. **Manual review** - All outputs require human verification before action

---

**Remember:** This is a **research and indexing tool** only. All filing, labeling, and action decisions are **human-owned**.
`;
}

/**
 * Create empty manifest for error cases
 */
function createEmptyManifest(
  asOf: string | null,
  filesPath: string | null,
  dirPath: string | null,
  subjectsPath: string | null,
  indexRan: boolean
): PipelineManifest {
  return {
    tool: 'attachment-filename-index-pipeline-pack',
    version: '1.0.0',
    asOf: asOf,
    generatedAt: new Date().toISOString(),
    indexRan: indexRan,
    inputFiles: {
      filesPath: filesPath || undefined,
      dirPath: dirPath || undefined,
      subjectsPath: subjectsPath || undefined
    },
    files: []
  };
}
