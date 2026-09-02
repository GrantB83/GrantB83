/**
 * Generate index outputs: JSON, Markdown, and manifest files
 */

import { InvoiceEntry, IndexResult, Manifest } from './types.js';

/**
 * Build IndexResult from invoice entries and optional known index
 */
export function buildIndexResult(
  entries: InvoiceEntry[],
  knownDocNos: Set<string> = new Set()
): IndexResult {
  const duplicatesInBatch = new Map<string, InvoiceEntry[]>();
  const alreadyKnown = new Set<string>();
  const newDocNos = new Set<string>();
  const docNoMap = new Map<string, InvoiceEntry[]>();
  
  // Group entries by Doc No
  for (const entry of entries) {
    const existing = docNoMap.get(entry.docNo) || [];
    existing.push(entry);
    docNoMap.set(entry.docNo, existing);
  }
  
  // Identify duplicates in batch
  for (const [docNo, matchedEntries] of docNoMap) {
    if (matchedEntries.length > 1) {
      duplicatesInBatch.set(docNo, matchedEntries);
    }
  }
  
  // Categorize as known vs new
  for (const docNo of docNoMap.keys()) {
    if (knownDocNos.has(docNo)) {
      alreadyKnown.add(docNo);
    } else {
      newDocNos.add(docNo);
    }
  }
  
  return {
    entries,
    duplicatesInBatch,
    alreadyKnown,
    newDocNos,
    uniqueDocNos: docNoMap.size,
    noMatch: []
  };
}

/**
 * Generate index.json content
 */
export function generateIndexJSON(result: IndexResult): string {
  const index: Record<string, string[]> = {};
  
  for (const entry of result.entries) {
    if (!index[entry.docNo]) {
      index[entry.docNo] = [];
    }
    index[entry.docNo].push(entry.filename);
  }
  
  return JSON.stringify(index, null, 2);
}

/**
 * Generate index.md content
 */
export function generateIndexMarkdown(result: IndexResult): string {
  const lines: string[] = [];
  
  lines.push('# Perfect Water / CoS Invoice Doc No Index');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Files:** ${result.entries.length}`);
  lines.push(`- **Unique Doc Nos:** ${result.uniqueDocNos}`);
  lines.push(`- **Duplicates in Batch:** ${result.duplicatesInBatch.size}`);
  if (result.alreadyKnown.size > 0 || result.newDocNos.size > 0) {
    lines.push(`- **Already Known:** ${result.alreadyKnown.size}`);
    lines.push(`- **New Doc Nos:** ${result.newDocNos.size}`);
  }
  lines.push('');
  
  // Group by Doc No
  const docNoMap = new Map<string, InvoiceEntry[]>();
  for (const entry of result.entries) {
    const existing = docNoMap.get(entry.docNo) || [];
    existing.push(entry);
    docNoMap.set(entry.docNo, existing);
  }
  
  lines.push('## Index by Doc No');
  lines.push('');
  
  const sortedDocNos = Array.from(docNoMap.keys()).sort();
  for (const docNo of sortedDocNos) {
    const entries = docNoMap.get(docNo)!;
    lines.push(`### ${docNo}`);
    lines.push('');
    for (const entry of entries) {
      if (entry.path) {
        lines.push(`- \`${entry.filename}\` (path: \`${entry.path}\`)`);
      } else {
        lines.push(`- \`${entry.filename}\``);
      }
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generate dupes-in-batch.md content
 */
export function generateDupesMarkdown(result: IndexResult): string | null {
  if (result.duplicatesInBatch.size === 0) {
    return null;
  }
  
  const lines: string[] = [];
  
  lines.push('# Duplicates in Batch');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('⚠️ **Warning:** The following Doc Nos appear multiple times in this batch.');
  lines.push('');
  
  const sortedDocNos = Array.from(result.duplicatesInBatch.keys()).sort();
  for (const docNo of sortedDocNos) {
    const entries = result.duplicatesInBatch.get(docNo)!;
    lines.push(`## ${docNo} (${entries.length} files)`);
    lines.push('');
    for (const entry of entries) {
      if (entry.path) {
        lines.push(`- \`${entry.filename}\` (path: \`${entry.path}\`)`);
      } else {
        lines.push(`- \`${entry.filename}\``);
      }
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generate already-known.md content
 */
export function generateAlreadyKnownMarkdown(result: IndexResult): string | null {
  if (result.alreadyKnown.size === 0) {
    return null;
  }
  
  const lines: string[] = [];
  
  lines.push('# Already Known Doc Nos');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('ℹ️ These Doc Nos were found in the known index (already uploaded).');
  lines.push('');
  
  const sortedDocNos = Array.from(result.alreadyKnown).sort();
  for (const docNo of sortedDocNos) {
    const entries = result.entries.filter(e => e.docNo === docNo);
    lines.push(`## ${docNo}`);
    lines.push('');
    for (const entry of entries) {
      if (entry.path) {
        lines.push(`- \`${entry.filename}\` (path: \`${entry.path}\`)`);
      } else {
        lines.push(`- \`${entry.filename}\``);
      }
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generate new.md content
 */
export function generateNewMarkdown(result: IndexResult): string | null {
  if (result.newDocNos.size === 0) {
    return null;
  }
  
  const lines: string[] = [];
  
  lines.push('# New Doc Nos');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('✅ These Doc Nos are new (not in known index).');
  lines.push('');
  
  const sortedDocNos = Array.from(result.newDocNos).sort();
  for (const docNo of sortedDocNos) {
    const entries = result.entries.filter(e => e.docNo === docNo);
    lines.push(`## ${docNo}`);
    lines.push('');
    for (const entry of entries) {
      if (entry.path) {
        lines.push(`- \`${entry.filename}\` (path: \`${entry.path}\`)`);
      } else {
        lines.push(`- \`${entry.filename}\``);
      }
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generate manifest.json content
 */
export function generateManifest(
  mode: 'directory' | 'files',
  inputPath: string,
  result: IndexResult,
  knownIndexProvided: boolean,
  noMatchFilenames: string[]
): string {
  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    mode,
    inputPath,
    knownIndexProvided,
    totalFiles: result.entries.length + noMatchFilenames.length,
    totalMatched: result.entries.length,
    totalNoMatch: noMatchFilenames.length,
    uniqueDocNos: result.uniqueDocNos,
    duplicatesInBatch: result.duplicatesInBatch.size,
    knownDocNos: result.alreadyKnown.size,
    newDocNos: result.newDocNos.size
  };
  
  return JSON.stringify(manifest, null, 2);
}
