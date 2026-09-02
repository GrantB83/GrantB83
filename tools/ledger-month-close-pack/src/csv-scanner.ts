/**
 * CSV file scanner for ledger-month-close-pack
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, basename } from 'path';
import type { CSVFileInfo } from './types.js';

/**
 * Scan directory for CSV files and extract metadata
 */
export async function scanCSVFiles(
  exportsDir: string,
  requiredHeaders?: string[]
): Promise<CSVFileInfo[]> {
  const entries = await readdir(exportsDir);
  const csvFiles: CSVFileInfo[] = [];

  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith('.csv')) {
      continue;
    }

    const fullPath = join(exportsDir, entry);
    const stats = await stat(fullPath);

    if (!stats.isFile()) {
      continue;
    }

    // Read first line only (header row)
    const content = await readFile(fullPath, 'utf-8');
    const firstLine = content.split('\n')[0] || '';

    const missingHeaders = requiredHeaders
      ? checkRequiredHeaders(firstLine, requiredHeaders)
      : [];

    csvFiles.push({
      basename: basename(fullPath),
      path: fullPath,
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      headerRow: firstLine.trim(),
      missingHeaders,
    });
  }

  // Sort by basename for consistent output
  return csvFiles.sort((a, b) => a.basename.localeCompare(b.basename));
}

/**
 * Check if required headers are present in the header row
 */
function checkRequiredHeaders(
  headerRow: string,
  requiredHeaders: string[]
): string[] {
  const normalizedRow = headerRow.toLowerCase();
  const missing: string[] = [];

  for (const header of requiredHeaders) {
    const normalized = header.toLowerCase().trim();
    if (!normalizedRow.includes(normalized)) {
      missing.push(header);
    }
  }

  return missing;
}

/**
 * Parse comma-separated header list
 */
export function parseRequiredHeaders(headerString: string): string[] {
  return headerString
    .split(',')
    .map((h) => h.trim())
    .filter((h) => h.length > 0);
}
