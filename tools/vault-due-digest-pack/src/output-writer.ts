/**
 * Output writer - writes all output files
 */

import { mkdirSync, writeFileSync, copyFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import type { ManifestData, DigestData, EntityPack } from './types.js';

export function writeOutputs(
  outdir: string,
  digest: string,
  missingSignals: string,
  approval: string,
  manifestData: ManifestData
): void {
  // Ensure output directory exists
  mkdirSync(outdir, { recursive: true });
  
  // Write digest
  const digestPath = join(outdir, 'DIGEST.md');
  writeFileSync(digestPath, digest, 'utf-8');
  
  // Write missing signals
  const missingPath = join(outdir, 'missing-signals.md');
  writeFileSync(missingPath, missingSignals, 'utf-8');
  
  // Write approval
  const approvalPath = join(outdir, 'APPROVAL.md');
  writeFileSync(approvalPath, approval, 'utf-8');
  
  // Write manifest
  const manifestPath = join(outdir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf-8');
}

export function copyEntityPacks(sourceDir: string, targetDir: string): void {
  const byEntitySource = join(sourceDir, 'by-entity');
  const byEntityTarget = join(targetDir, 'by-entity');
  
  if (!existsSync(byEntitySource)) {
    console.warn('⚠️ Warning: No by-entity directory found in entity pack output');
    return;
  }
  
  // Copy the entire by-entity directory structure
  mkdirSync(byEntityTarget, { recursive: true });
  copyRecursive(byEntitySource, byEntityTarget);
}

function copyRecursive(src: string, dest: string): void {
  if (statSync(src).isDirectory()) {
    mkdirSync(dest, { recursive: true });
    const entries = readdirSync(src);
    
    for (const entry of entries) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      copyRecursive(srcPath, destPath);
    }
  } else {
    copyFileSync(src, dest);
  }
}
