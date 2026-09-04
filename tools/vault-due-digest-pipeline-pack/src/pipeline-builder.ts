/**
 * Pipeline builder for vault-due-digest-pipeline-pack
 * Orchestrates vault-filename-due-queue → vault-due-digest-pack → vault-due-digest-post-checklist
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { PipelineManifest, PipelineResult } from './types.js';

/**
 * Build pipeline pack from existing digest pack (Mode 1 - preferred)
 */
export function buildPipelineFromPack(
  packPath: string,
  runPostChecklist: boolean,
  outdir: string
): PipelineResult {
  const warnings: string[] = [];
  const timestamp = new Date().toISOString();
  
  // Validate pack path
  if (!fs.existsSync(packPath)) {
    return {
      success: false,
      message: `Pack directory not found: ${packPath}`,
      outdir: '',
      manifest: createEmptyManifest(timestamp),
      warnings: []
    };
  }
  
  // Check for required files
  const digestMd = path.join(packPath, 'DIGEST.md');
  const approvalMd = path.join(packPath, 'APPROVAL.md');
  
  if (!fs.existsSync(digestMd)) {
    return {
      success: false,
      message: 'Required file DIGEST.md not found in pack',
      outdir: '',
      manifest: createEmptyManifest(timestamp),
      warnings: []
    };
  }
  
  if (!fs.existsSync(approvalMd)) {
    warnings.push('APPROVAL.md not found in pack');
  }
  
  // Create output directory
  const outputDir = path.resolve(outdir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Copy digest pack files
  const filesToCopy = [
    'DIGEST.md',
    'APPROVAL.md',
    'missing-signals.md',
    'manifest.json'
  ];
  
  const copiedFiles: Array<{ filename: string; type: string; description: string }> = [];
  
  for (const file of filesToCopy) {
    const srcPath = path.join(packPath, file);
    const destPath = path.join(outputDir, file);
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      copiedFiles.push({
        filename: file,
        type: getFileType(file),
        description: getFileDescription(file)
      });
    } else if (file === 'APPROVAL.md' || file === 'missing-signals.md' || file === 'manifest.json') {
      // Optional files
      warnings.push(`Optional file ${file} not found in pack`);
    }
  }
  
  // Copy by-entity directory if present
  const byEntitySrc = path.join(packPath, 'by-entity');
  const byEntityDest = path.join(outputDir, 'by-entity');
  
  if (fs.existsSync(byEntitySrc)) {
    copyDirectory(byEntitySrc, byEntityDest);
    copiedFiles.push({
      filename: 'by-entity/',
      type: 'directory',
      description: 'Entity pack subdirectories with pack.md + items.json per entity'
    });
  } else {
    warnings.push('by-entity/ directory not found in pack (entity packs missing)');
  }
  
  // Run post-checklist if requested
  let postChecklistRan = false;
  if (runPostChecklist) {
    try {
      console.log('🔧 Running vault-due-digest-post-checklist...');
      const checklistDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..', 'vault-due-digest-post-checklist');
      
      if (fs.existsSync(checklistDir)) {
        const cmd = `cd "${checklistDir}" && npm run checklist -- --pack "${packPath}" --outdir "${outputDir}/checklist-temp"`;
        execSync(cmd, { stdio: 'inherit' });
        
        // Copy checklist outputs
        const checklistFiles = ['POST-CHECKLIST.md', 'ISSUES.md'];
        for (const file of checklistFiles) {
          const srcPath = path.join(outputDir, 'checklist-temp', file);
          const destPath = path.join(outputDir, file);
          
          if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            copiedFiles.push({
              filename: file,
              type: 'checklist',
              description: file === 'POST-CHECKLIST.md' ? 'Pre-action checklist' : 'Failures and warnings'
            });
          }
        }
        
        // Clean up temp directory
        fs.rmSync(path.join(outputDir, 'checklist-temp'), { recursive: true, force: true });
        
        postChecklistRan = true;
        console.log('  ✓ Post-checklist completed');
      } else {
        warnings.push('vault-due-digest-post-checklist tool not found, skipping');
      }
    } catch (error) {
      warnings.push(`Post-checklist failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Generate PACK.md
  const packMdContent = generatePackMd(packPath, postChecklistRan, copiedFiles, warnings);
  fs.writeFileSync(path.join(outputDir, 'PACK.md'), packMdContent);
  copiedFiles.unshift({
    filename: 'PACK.md',
    type: 'index',
    description: 'Pipeline pack index'
  });
  
  // Generate manifest.json
  const manifest: PipelineManifest = {
    tool: 'vault-due-digest-pipeline-pack',
    version: '1.0.0',
    timestamp,
    inputs: {
      packPath,
      filenamesPath: null
    },
    runOptions: {
      ranFilenameQueue: false,
      ranEntityPack: false,
      ranDigestPack: false,
      ranPostChecklist: postChecklistRan
    },
    files: copiedFiles
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  return {
    success: true,
    message: `Pipeline pack assembled in ${outputDir}`,
    outdir: outputDir,
    manifest,
    warnings
  };
}

/**
 * Build pipeline pack from filename list (Mode 2 - runs upstream tools)
 */
export function buildPipelineFromFilenames(
  filenamesPath: string,
  runPostChecklist: boolean,
  outdir: string
): PipelineResult {
  const warnings: string[] = [];
  const timestamp = new Date().toISOString();
  
  // Validate filenames path
  if (!fs.existsSync(filenamesPath)) {
    return {
      success: false,
      message: `Filenames file not found: ${filenamesPath}`,
      outdir: '',
      manifest: createEmptyManifest(timestamp),
      warnings: []
    };
  }
  
  // Create temporary directory for intermediate outputs
  const tempDir = path.join(outdir, 'temp-pipeline');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    // Run vault-due-digest-pack with --filenames and --run-entity-pack
    console.log('🔧 Running vault-due-digest-pack...');
    const digestPackDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..', 'vault-due-digest-pack');
    
    if (!fs.existsSync(digestPackDir)) {
      throw new Error('vault-due-digest-pack tool not found');
    }
    
    const digestOutdir = path.join(tempDir, 'digest-out');
    const cmd = `cd "${digestPackDir}" && npm run pack -- --filenames "${filenamesPath}" --run-entity-pack --outdir "${digestOutdir}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('  ✓ vault-due-digest-pack completed');
    
    // Now build pipeline from the generated pack
    const result = buildPipelineFromPack(digestOutdir, runPostChecklist, outdir);
    
    // Update manifest to reflect that we ran the tools
    result.manifest.inputs.filenamesPath = filenamesPath;
    result.manifest.runOptions.ranDigestPack = true;
    result.manifest.runOptions.ranEntityPack = true;
    
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return result;
    
  } catch (error) {
    // Clean up temp directory on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    return {
      success: false,
      message: `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
      outdir: '',
      manifest: createEmptyManifest(timestamp),
      warnings
    };
  }
}

/**
 * Copy directory recursively
 */
function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get file type for manifest
 */
function getFileType(filename: string): string {
  if (filename === 'PACK.md') return 'index';
  if (filename === 'DIGEST.md') return 'digest';
  if (filename === 'APPROVAL.md') return 'approval';
  if (filename === 'POST-CHECKLIST.md' || filename === 'ISSUES.md') return 'checklist';
  if (filename === 'missing-signals.md') return 'report';
  if (filename === 'manifest.json') return 'metadata';
  return 'other';
}

/**
 * Get file description for manifest
 */
function getFileDescription(filename: string): string {
  const descriptions: Record<string, string> = {
    'PACK.md': 'Pipeline pack index',
    'DIGEST.md': 'Vault due digest overview',
    'APPROVAL.md': 'Vault research gates',
    'POST-CHECKLIST.md': 'Pre-action checklist',
    'ISSUES.md': 'Failures and warnings',
    'missing-signals.md': 'Files without clear category or date hints',
    'manifest.json': 'Run metadata'
  };
  
  return descriptions[filename] || filename;
}

/**
 * Generate PACK.md content
 */
function generatePackMd(
  packPath: string,
  postChecklistRan: boolean,
  files: Array<{ filename: string; type: string; description: string }>,
  warnings: string[]
): string {
  const timestamp = new Date().toISOString();
  
  let content = `# Vault Due Digest Pipeline Pack

**Generated:** ${timestamp}
**Source Pack:** ${packPath}

Offline orchestrator combining vault-due-digest-pack with optional vault-due-digest-post-checklist validation.

**Never opens file bodies. Never submits to SARS/CIPC. Vault owns all research and filings (N2 gate).**

## Pipeline Summary

- **Source:** ${packPath}
- **Post-Checklist:** ${postChecklistRan ? '✅ Run' : '⏭️ Skipped'}

## Contents

`;
  
  for (const file of files) {
    content += `- **${file.filename}** — ${file.description}\n`;
  }
  
  if (warnings.length > 0) {
    content += `\n## Warnings\n\n`;
    for (const warning of warnings) {
      content += `- ⚠️ ${warning}\n`;
    }
  }
  
  content += `\n## Next Steps

1. Review DIGEST.md for entity-scoped due items
2. Check by-entity/ subdirectories for detailed research packs
`;
  
  if (postChecklistRan) {
    content += `3. Review POST-CHECKLIST.md for go/no-go validation
4. Check ISSUES.md for any failures or warnings
5. Review APPROVAL.md for Vault workflow gates
`;
  } else {
    content += `3. Review APPROVAL.md for Vault workflow gates
`;
  }
  
  content += `
## Safety Reminders

- ✅ **Offline only** — No file body reads, no network calls
- ✅ **Read-only validation** — Filename and markdown heuristics only
- ✅ **Never submits** — Vault owns all CIPC/SARS/trust filings (N2 gate)
- ✅ **Never invents** — No dates, amounts, or legal positions fabricated
- ⚠️ **Manual review required** — Vault reviews all research packs before action
`;
  
  return content;
}

/**
 * Create empty manifest for error cases
 */
function createEmptyManifest(timestamp: string): PipelineManifest {
  return {
    tool: 'vault-due-digest-pipeline-pack',
    version: '1.0.0',
    timestamp,
    inputs: {
      packPath: null,
      filenamesPath: null
    },
    runOptions: {
      ranFilenameQueue: false,
      ranEntityPack: false,
      ranDigestPack: false,
      ranPostChecklist: false
    },
    files: []
  };
}
