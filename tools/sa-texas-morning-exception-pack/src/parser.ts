import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { BrownsBooking, HMQuoteFile } from './types.js';

export function parseBrownsBookings(path: string): BrownsBooking[] {
  const content = readFileSync(path, 'utf-8');
  const data = JSON.parse(content);
  
  if (!Array.isArray(data)) {
    throw new Error('Browns bookings file must contain an array');
  }
  
  return data;
}

export function parseHMQuoteFiles(dirPath: string): HMQuoteFile[] {
  try {
    const files = readdirSync(dirPath);
    const quoteFiles: HMQuoteFile[] = [];
    
    for (const file of files) {
      const filePath = join(dirPath, file);
      const stats = statSync(filePath);
      
      if (stats.isFile() && (file.endsWith('.txt') || file.endsWith('.md') || file.endsWith('.json'))) {
        quoteFiles.push({
          filename: file,
          displayName: file.replace(/\.(txt|md|json)$/, ''),
        });
      }
    }
    
    return quoteFiles.sort((a, b) => a.filename.localeCompare(b.filename));
  } catch (err: any) {
    throw new Error(`Failed to read HM quotes directory: ${err.message}`);
  }
}

export function parseNotes(path: string): string {
  return readFileSync(path, 'utf-8').trim();
}
