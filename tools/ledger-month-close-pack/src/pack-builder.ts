/**
 * Pack builder for ledger-month-close-pack
 */

import { mkdir, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import type { CLIOptions, PackManifest, CSVFileInfo } from './types.js';
import { scanCSVFiles, parseRequiredHeaders } from './csv-scanner.js';
import {
  generateInventoryMarkdown,
  generateCloseChecklist,
  generateApprovalGates,
} from './report-generator.js';

/**
 * Build the month-close pack
 */
export async function buildPack(options: CLIOptions): Promise<void> {
  // Create output directory
  await mkdir(options.outdir, { recursive: true });

  // Parse required headers if specified
  const requiredHeaders = options.requireHeaders
    ? parseRequiredHeaders(options.requireHeaders)
    : undefined;

  // Scan CSV files
  const csvFiles = await scanCSVFiles(options.exportsDir, requiredHeaders);

  // Build manifest
  const manifest: PackManifest = {
    month: options.month,
    generatedAt: new Date().toISOString(),
    exportsDir: options.exportsDir,
    csvFiles,
    unmatchedQueueIncluded: !!options.unmatchedQueue,
    totalFiles: csvFiles.length,
    totalSize: csvFiles.reduce((sum, f) => sum + f.size, 0),
    missingHeadersCount: csvFiles.filter((f) => f.missingHeaders.length > 0).length,
  };

  // Write manifest.json
  await writeFile(
    join(options.outdir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Write inventory.json (machine-readable)
  await writeFile(
    join(options.outdir, 'inventory.json'),
    JSON.stringify(csvFiles, null, 2)
  );

  // Write inventory.md (human-readable)
  await writeFile(
    join(options.outdir, 'inventory.md'),
    generateInventoryMarkdown(manifest)
  );

  // Write CLOSE.md checklist
  await writeFile(
    join(options.outdir, 'CLOSE.md'),
    generateCloseChecklist(manifest)
  );

  // Write APPROVAL.md
  await writeFile(
    join(options.outdir, 'APPROVAL.md'),
    generateApprovalGates()
  );

  // Copy unmatched queue if provided
  if (options.unmatchedQueue) {
    await copyFile(
      options.unmatchedQueue,
      join(options.outdir, 'unmatched-queue.md')
    );
  }

  console.log(`✅ Pack generated successfully in ${options.outdir}`);
  console.log(`   Files: ${manifest.totalFiles} CSV(s), ${formatBytes(manifest.totalSize)} total`);
  if (manifest.missingHeadersCount > 0) {
    console.log(`   ⚠️  ${manifest.missingHeadersCount} file(s) with missing headers`);
  }
  if (manifest.unmatchedQueueIncluded) {
    console.log(`   📋 Unmatched queue included`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}
