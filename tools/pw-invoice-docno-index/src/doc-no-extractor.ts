/**
 * Extract invoice Doc Nos from filenames (basenames only, never open PDFs)
 */

import { basename } from 'path';

/**
 * Doc No pattern: IN followed by digits (case-insensitive)
 * Examples: IN236058, in123456, IN999999
 */
const DOC_NO_PATTERN = /IN\d+/i;

/**
 * Extract Doc No from a filename (basename only, never reads file body)
 * @param filename Full path or basename
 * @returns Doc No (uppercase) or null if not found
 */
export function extractDocNo(filename: string): string | null {
  const base = basename(filename);
  const match = base.match(DOC_NO_PATTERN);
  
  if (match) {
    return match[0].toUpperCase();
  }
  
  return null;
}

/**
 * Parse known index file (markdown or CSV) to extract Doc Nos
 * @param content File content as string
 * @returns Set of Doc Nos found in the known index
 */
export function parseKnownIndex(content: string): Set<string> {
  const docNos = new Set<string>();
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Extract all IN\d+ patterns from the line (case-insensitive)
    const matches = line.matchAll(/IN\d+/gi);
    for (const match of matches) {
      docNos.add(match[0].toUpperCase());
    }
  }
  
  return docNos;
}
