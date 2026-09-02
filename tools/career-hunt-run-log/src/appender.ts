/**
 * Append entries to runs.jsonl
 */

import { existsSync, readFileSync, appendFileSync, writeFileSync, mkdirSync } from 'fs';
import { RunEntry } from './types.js';

/**
 * Read existing entries from runs.jsonl
 */
export function readExistingEntries(jsonlPath: string): RunEntry[] {
  if (!existsSync(jsonlPath)) {
    return [];
  }

  const content = readFileSync(jsonlPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim() !== '');

  return lines.map((line, idx) => {
    try {
      return JSON.parse(line) as RunEntry;
    } catch (e) {
      throw new Error(`Malformed JSON on line ${idx + 1}: ${line}`);
    }
  });
}

/**
 * Append new entries to runs.jsonl (creates file if missing)
 */
export function appendEntries(jsonlPath: string, entries: RunEntry[]): void {
  const fileExists = existsSync(jsonlPath);

  // Create directory and file if they don't exist
  if (!fileExists) {
    const dir = jsonlPath.substring(0, jsonlPath.lastIndexOf('/'));
    if (dir) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(jsonlPath, '', 'utf-8');
  }

  // Append each entry as a JSON line
  for (const entry of entries) {
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(jsonlPath, line, 'utf-8');
  }
}

/**
 * Count total lines in runs.jsonl
 */
export function countLines(jsonlPath: string): number {
  if (!existsSync(jsonlPath)) {
    return 0;
  }

  const content = readFileSync(jsonlPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim() !== '');
  return lines.length;
}
