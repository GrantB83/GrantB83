import * as fs from 'fs';
import * as path from 'path';
import { RunEntry } from './types';

export function parseJsonl(filePath: string, sinceDate?: string): RunEntry[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  
  const entries: RunEntry[] = [];
  const sinceMs = sinceDate ? new Date(sinceDate).getTime() : 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const entry = JSON.parse(line) as RunEntry;
      
      // Validate required fields
      if (!entry.company || !entry.title || !entry.action || !entry.date) {
        throw new Error(`Missing required fields at line ${i + 1}`);
      }

      // Validate action
      if (!['scored', 'applied', 'skipped', 'rejected'].includes(entry.action)) {
        throw new Error(`Invalid action at line ${i + 1}: ${entry.action}`);
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        throw new Error(`Invalid date format at line ${i + 1}: ${entry.date}`);
      }

      // Apply since filter
      if (sinceDate) {
        const entryMs = new Date(entry.date).getTime();
        if (entryMs < sinceMs) {
          continue;
        }
      }

      entries.push(entry);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Malformed JSON at line ${i + 1}: ${error.message}`);
      }
      throw error;
    }
  }

  return entries;
}

export function parseSummaryMd(filePath: string): {
  totalEntries: number;
  scored: number;
  applied: number;
  skipped: number;
  rejected: number;
} | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Parse counts from summary section
  const scoredMatch = content.match(/Scored:\s*(\d+)/i);
  const appliedMatch = content.match(/Applied:\s*(\d+)/i);
  const skippedMatch = content.match(/Skipped:\s*(\d+)/i);
  const rejectedMatch = content.match(/Rejected:\s*(\d+)/i);

  if (!scoredMatch && !appliedMatch && !skippedMatch && !rejectedMatch) {
    return null;
  }

  const scored = scoredMatch ? parseInt(scoredMatch[1], 10) : 0;
  const applied = appliedMatch ? parseInt(appliedMatch[1], 10) : 0;
  const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
  const rejected = rejectedMatch ? parseInt(rejectedMatch[1], 10) : 0;

  return {
    totalEntries: scored + applied + skipped + rejected,
    scored,
    applied,
    skipped,
    rejected
  };
}
