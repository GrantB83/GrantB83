/**
 * Pipeline builder for vault-entity-due-pipeline-pack
 * Orchestrates vault-filename-due-queue → vault-entity-due-pack
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { PipelineManifest, PipelineResult } from './types.js';

/**
 * Auto-build sibling tool if dist missing
 */
function autoBuildSibling(toolName: string, toolDir: string): void {
  const distPath = path.join(toolDir, 'dist', 'index.js');
  
  if (!fs.existsSync(distPath)) {
    console.log(`⚙️  Building ${toolName} (dist missing)...`);
    
    // Install dependencies if node_modules missing
    const nodeModulesPath = path.join(toolDir, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('   Installing dependencies...');
      execSync('npm install', {
        cwd: toolDir,
        stdio: 'inherit'
      });
    }
    
    // Build the tool
    execSync('npm run build', {
      cwd: toolDir,
      stdio: 'inherit'
    });
    console.log(`✅ ${toolName} built successfully\n`);
  }
}

/**
 * Discover actual output layout from sibling tool
 */
function discoverOutputLayout(toolOutdir: string, checkFiles: string[] = ['queue.json', 'master.md', 'by-entity']): string {
  // Check if any expected files exist in flat layout
  for (const checkFile of checkFiles) {
    if (fs.existsSync(path.join(toolOutdir, checkFile))) {
      return toolOutdir;
    }
  }
  
  // Subdirectory layout - find first subdirectory
  if (fs.existsSync(toolOutdir)) {
    const entries = fs.readdirSync(toolOutdir, { withFileTypes: true });
    const subdir = entries.find(e => e.isDirectory());
    
    if (subdir) {
      return path.join(toolOutdir, subdir.name);
    }
  }
  
  return toolOutdir;
}

/**
 * Build pipeline pack from existing queue.json (Mode 1 - preferred)
 */
export function buildPipelineFromQueue(
  queuePath: string,
  entityMapPath: string | undefined,
  runEntityPack: boolean,
  asOf: string | undefined,
  outdir: string
): PipelineResult {
  const warnings: string[] = [];
  const timestamp = new Date().toISOString();
  
  // Validate queue path
  if (!fs.existsSync(queuePath)) {
    return {
      success: false,
      message: `Queue file not found: ${queuePath}`,
      outdir: '',
      manifest: createEmptyManifest(timestamp, asOf),
      warnings: []
    };
  }
  
  // Create output directory
  const outputDir = path.resolve(outdir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const copiedFiles: Array<{ filename: string; type: string; description: string }> = [];
  
  // Run vault-entity-due-pack if requested
  let entityPackRan = false;
  if (runEntityPack) {
    try {
      console.log('🔧 Running vault-entity-due-pack...');
      const entityPackDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..', 'vault-entity-due-pack');
      
      if (!fs.existsSync(entityPackDir)) {
        warnings.push('vault-entity-due-pack tool not found, skipping');
      } else {
        // Auto-build if needed
        autoBuildSibling('vault-entity-due-pack', entityPackDir);
        
        // Build command
        const entityOutdir = path.join(outputDir, 'entity-temp');
        let cmd = `cd "${entityPackDir}" && npm run pack -- --queue "${queuePath}" --outdir "${entityOutdir}"`;
        
        if (entityMapPath) {
          cmd += ` --entities "${entityMapPath}"`;
        }
        
        execSync(cmd, { stdio: 'inherit' });
        
        // Discover actual output layout (check for entity pack outputs)
        const actualOutdir = discoverOutputLayout(entityOutdir, ['master.md', 'by-entity']);
        
        // Copy entity pack outputs
        const entitiesToCopy = [
          { file: 'by-entity/', isDir: true },
          { file: 'master.md', isDir: false },
          { file: 'unknown.md', isDir: false },
          { file: 'manifest.json', isDir: false }
        ];
        
        for (const { file, isDir } of entitiesToCopy) {
          const srcPath = path.join(actualOutdir, file);
          const destPath = path.join(outputDir, file);
          
          if (fs.existsSync(srcPath)) {
            if (isDir) {
              copyDirectory(srcPath, destPath);
              copiedFiles.push({
                filename: file,
                type: 'directory',
                description: 'Entity pack subdirectories with pack.md + items.json per entity'
              });
            } else {
              fs.copyFileSync(srcPath, destPath);
              copiedFiles.push({
                filename: file,
                type: getFileType(file),
                description: getFileDescription(file)
              });
            }
          }
        }
        
        // Clean up temp directory
        fs.rmSync(entityOutdir, { recursive: true, force: true });
        
        entityPackRan = true;
        console.log('  ✓ vault-entity-due-pack completed');
      }
    } catch (error) {
      warnings.push(`vault-entity-due-pack failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Generate PACK.md
  const packMdContent = generatePackMd(queuePath, null, entityPackRan, false, copiedFiles, warnings, asOf);
  fs.writeFileSync(path.join(outputDir, 'PACK.md'), packMdContent);
  copiedFiles.unshift({
    filename: 'PACK.md',
    type: 'index',
    description: 'Pipeline pack index'
  });
  
  // Generate APPROVAL.md
  const approvalMdContent = generateApprovalMd();
  fs.writeFileSync(path.join(outputDir, 'APPROVAL.md'), approvalMdContent);
  copiedFiles.push({
    filename: 'APPROVAL.md',
    type: 'approval',
    description: 'Vault research gates'
  });
  
  // Generate manifest.json
  const manifest: PipelineManifest = {
    tool: 'vault-entity-due-pipeline-pack',
    version: '1.0.0',
    timestamp,
    asOf,
    inputs: {
      queuePath,
      filenamesPath: null,
      entityMapPath: entityMapPath || null
    },
    runOptions: {
      ranFilenameQueue: false,
      ranEntityPack: entityPackRan
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
  entityMapPath: string | undefined,
  runQueue: boolean,
  runEntityPack: boolean,
  asOf: string | undefined,
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
      manifest: createEmptyManifest(timestamp, asOf),
      warnings: []
    };
  }
  
  // Create output directory
  const outputDir = path.resolve(outdir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const copiedFiles: Array<{ filename: string; type: string; description: string }> = [];
  
  // Create temporary directory for intermediate outputs
  const tempDir = path.join(outputDir, 'temp-pipeline');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    let queueJsonPath: string | null = null;
    let queueRan = false;
    
    // Step 1: Run vault-filename-due-queue if requested
    if (runQueue) {
      console.log('🔧 Running vault-filename-due-queue...');
      const queueDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..', 'vault-filename-due-queue');
      
      if (!fs.existsSync(queueDir)) {
        throw new Error('vault-filename-due-queue tool not found');
      }
      
      // Auto-build if needed
      autoBuildSibling('vault-filename-due-queue', queueDir);
      
      const queueOutdir = path.join(tempDir, 'queue-out');
      const cmd = `cd "${queueDir}" && npm run queue -- --files "${filenamesPath}" --outdir "${queueOutdir}"`;
      execSync(cmd, { stdio: 'inherit' });
      
      // Discover actual output layout (check for queue outputs)
      const actualQueueOutdir = discoverOutputLayout(queueOutdir, ['queue.json']);
      queueJsonPath = path.join(actualQueueOutdir, 'queue.json');
      
      if (!fs.existsSync(queueJsonPath)) {
        throw new Error('vault-filename-due-queue did not produce queue.json');
      }
      
      // Copy queue outputs
      const queueFiles = ['queue.json', 'queue.md', 'missing-signals.md'];
      for (const file of queueFiles) {
        const srcPath = path.join(actualQueueOutdir, file);
        if (fs.existsSync(srcPath)) {
          const destPath = path.join(outputDir, file);
          fs.copyFileSync(srcPath, destPath);
          copiedFiles.push({
            filename: file,
            type: getFileType(file),
            description: getFileDescription(file)
          });
        }
      }
      
      queueRan = true;
      console.log('  ✓ vault-filename-due-queue completed');
    } else {
      warnings.push('vault-filename-due-queue skipped (--run-queue not set)');
    }
    
    // Step 2: Run vault-entity-due-pack if requested
    let entityPackRan = false;
    if (runEntityPack) {
      console.log('🔧 Running vault-entity-due-pack...');
      const entityPackDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..', 'vault-entity-due-pack');
      
      if (!fs.existsSync(entityPackDir)) {
        throw new Error('vault-entity-due-pack tool not found');
      }
      
      // Auto-build if needed
      autoBuildSibling('vault-entity-due-pack', entityPackDir);
      
      const entityOutdir = path.join(tempDir, 'entity-out');
      
      // Decide input mode for entity pack
      let cmd: string;
      if (queueJsonPath && fs.existsSync(queueJsonPath)) {
        // Use queue.json from step 1
        cmd = `cd "${entityPackDir}" && npm run pack -- --queue "${queueJsonPath}" --outdir "${entityOutdir}"`;
      } else {
        // Use filenames directly
        cmd = `cd "${entityPackDir}" && npm run pack -- --filenames "${filenamesPath}" --outdir "${entityOutdir}"`;
      }
      
      if (entityMapPath) {
        cmd += ` --entities "${entityMapPath}"`;
      }
      
      execSync(cmd, { stdio: 'inherit' });
      
      // Discover actual output layout (check for entity pack outputs)
      const actualEntityOutdir = discoverOutputLayout(entityOutdir, ['master.md', 'by-entity']);
      
      // Copy entity pack outputs
      const entitiesToCopy = [
        { file: 'by-entity/', isDir: true },
        { file: 'master.md', isDir: false },
        { file: 'unknown.md', isDir: false }
      ];
      
      for (const { file, isDir } of entitiesToCopy) {
        const srcPath = path.join(actualEntityOutdir, file);
        const destPath = path.join(outputDir, file);
        
        if (fs.existsSync(srcPath)) {
          if (isDir) {
            copyDirectory(srcPath, destPath);
            copiedFiles.push({
              filename: file,
              type: 'directory',
              description: 'Entity pack subdirectories with pack.md + items.json per entity'
            });
          } else {
            fs.copyFileSync(srcPath, destPath);
            copiedFiles.push({
              filename: file,
              type: getFileType(file),
              description: getFileDescription(file)
            });
          }
        }
      }
      
      entityPackRan = true;
      console.log('  ✓ vault-entity-due-pack completed');
    }
    
    // Generate PACK.md
    const packMdContent = generatePackMd(null, filenamesPath, entityPackRan, queueRan, copiedFiles, warnings, asOf);
    fs.writeFileSync(path.join(outputDir, 'PACK.md'), packMdContent);
    copiedFiles.unshift({
      filename: 'PACK.md',
      type: 'index',
      description: 'Pipeline pack index'
    });
    
    // Generate APPROVAL.md
    const approvalMdContent = generateApprovalMd();
    fs.writeFileSync(path.join(outputDir, 'APPROVAL.md'), approvalMdContent);
    copiedFiles.push({
      filename: 'APPROVAL.md',
      type: 'approval',
      description: 'Vault research gates'
    });
    
    // Generate manifest.json
    const manifest: PipelineManifest = {
      tool: 'vault-entity-due-pipeline-pack',
      version: '1.0.0',
      timestamp,
      asOf,
      inputs: {
        queuePath: null,
        filenamesPath,
        entityMapPath: entityMapPath || null
      },
      runOptions: {
        ranFilenameQueue: queueRan,
        ranEntityPack: entityPackRan
      },
      files: copiedFiles
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return {
      success: true,
      message: `Pipeline pack assembled in ${outputDir}`,
      outdir: outputDir,
      manifest,
      warnings
    };
    
  } catch (error) {
    // Clean up temp directory on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    return {
      success: false,
      message: `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
      outdir: '',
      manifest: createEmptyManifest(timestamp, asOf),
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
  if (filename === 'APPROVAL.md') return 'approval';
  if (filename === 'queue.json' || filename === 'manifest.json') return 'metadata';
  if (filename === 'queue.md' || filename === 'master.md') return 'digest';
  if (filename === 'missing-signals.md' || filename === 'unknown.md') return 'report';
  return 'other';
}

/**
 * Get file description for manifest
 */
function getFileDescription(filename: string): string {
  const descriptions: Record<string, string> = {
    'PACK.md': 'Pipeline pack index',
    'APPROVAL.md': 'Vault research gates',
    'queue.json': 'Due date queue data',
    'queue.md': 'Due date queue overview',
    'master.md': 'Entity pack overview',
    'unknown.md': 'Unmatched filenames',
    'missing-signals.md': 'Files without clear category or date hints',
    'manifest.json': 'Run metadata'
  };
  
  return descriptions[filename] || filename;
}

/**
 * Generate PACK.md content
 */
function generatePackMd(
  queuePath: string | null,
  filenamesPath: string | null,
  entityPackRan: boolean,
  queueRan: boolean,
  files: Array<{ filename: string; type: string; description: string }>,
  warnings: string[],
  asOf?: string
): string {
  const timestamp = new Date().toISOString();
  
  let content = `# Vault Entity Due Pipeline Pack

**Generated:** ${timestamp}
`;

  if (asOf) {
    content += `**As-of Date:** ${asOf}\n`;
  }

  if (queuePath) {
    content += `**Source Queue:** ${queuePath}\n`;
  }
  
  if (filenamesPath) {
    content += `**Source Filenames:** ${filenamesPath}\n`;
  }
  
  content += `
Offline orchestrator combining vault-filename-due-queue (optional) with vault-entity-due-pack for Vault weekday operations.

**Never opens file bodies. Never invents due dates or amounts. Never submits to SARS/CIPC. Vault owns all research and filings (N2 gate).**

## Pipeline Summary

`;

  if (queuePath) {
    content += `- **Source:** Existing queue.json\n`;
  } else if (filenamesPath) {
    content += `- **Source:** Filename list\n`;
  }
  
  content += `- **Filename Queue:** ${queueRan ? '✅ Run' : '⏭️ Skipped'}\n`;
  content += `- **Entity Pack:** ${entityPackRan ? '✅ Run' : '⏭️ Skipped'}\n`;

  content += `\n## Contents\n\n`;
  
  for (const file of files) {
    content += `- **${file.filename}** — ${file.description}\n`;
  }
  
  if (warnings.length > 0) {
    content += `\n## Warnings\n\n`;
    for (const warning of warnings) {
      content += `- ⚠️ ${warning}\n`;
    }
  }
  
  content += `\n## Next Steps\n\n`;
  
  if (entityPackRan) {
    content += `1. Review master.md for entity-scoped overview\n`;
    content += `2. Check by-entity/ subdirectories for detailed research packs\n`;
    content += `3. Check unknown.md for unmatched filenames\n`;
  }
  
  if (queueRan) {
    content += `4. Review queue.md for due date queue\n`;
    content += `5. Check missing-signals.md for files without date hints\n`;
  }
  
  content += `6. Review APPROVAL.md for Vault workflow gates\n`;
  
  content += `\n## Safety Reminders\n\n`;
  content += `- ✅ **Offline only** — No file body reads, no network calls\n`;
  content += `- ✅ **Read-only validation** — Filename and markdown heuristics only\n`;
  content += `- ✅ **Never submits** — Vault owns all CIPC/SARS/trust filings (N2 gate)\n`;
  content += `- ✅ **Never invents** — No dates, amounts, or legal positions fabricated\n`;
  content += `- ⚠️ **Manual review required** — Vault reviews all research packs before action\n`;
  
  return content;
}

/**
 * Generate APPROVAL.md content
 */
function generateApprovalMd(): string {
  return `# Vault Entity Due Pipeline Pack - APPROVAL

## Hard Gates

### N2 - Never Submit Without Vault/Grant Review

☐ **Vault owns all CIPC/SARS/trust filings** — Never auto-submit
☐ **Research only** — This pack is for research, not action
☐ **No file bodies opened** — Filename heuristics only
☐ **No invented data** — Due dates, amounts, legal positions from source only

### Workflow

☐ Review PACK.md for pipeline summary
☐ Review master.md for entity-scoped overview (if entity pack ran)
☐ Review by-entity/ subdirectories for detailed research packs (if entity pack ran)
☐ Review queue.md for due date queue (if queue ran)
☐ Check unknown.md for unmatched filenames (if entity pack ran)
☐ Check missing-signals.md for files without date hints (if queue ran)

### Safety Rules

- ✅ **Offline only** — No API calls, no file body reads
- ✅ **Read-only** — Filename and markdown heuristics only
- ✅ **Never submits** — Vault owns all filings (N2 gate)
- ✅ **Never invents** — No dates, amounts, or legal positions
- ⚠️ **Manual review required** — Vault reviews all packs before action

## Approval

☐ All hard gates checked
☐ Entity classification is heuristic guidance only
☐ No invented due dates, amounts, or legal positions
☐ Vault owns all research and filings (N2 gate)
☐ Ready to proceed with Vault research workflow

---

**Remember:** This tool never opens file bodies, never invents data, and never submits to SARS/CIPC. All outputs are for **MANUAL VAULT REVIEW ONLY**.
`;
}

/**
 * Create empty manifest for error cases
 */
function createEmptyManifest(timestamp: string, asOf?: string): PipelineManifest {
  return {
    tool: 'vault-entity-due-pipeline-pack',
    version: '1.0.0',
    timestamp,
    asOf,
    inputs: {
      queuePath: null,
      filenamesPath: null,
      entityMapPath: null
    },
    runOptions: {
      ranFilenameQueue: false,
      ranEntityPack: false
    },
    files: []
  };
}
