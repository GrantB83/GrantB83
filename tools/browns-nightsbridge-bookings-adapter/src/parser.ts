import { readFileSync } from 'fs';
import { ParsedData, RawNightsbridgeRow, HEADER_ALIASES } from './types.js';

export function detectDelimiter(text: string): ',' | '\t' {
  const firstLine = text.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  return tabCount > commaCount ? '\t' : ',';
}

export function normalizeHeader(rawHeader: string): string {
  const normalized = rawHeader.trim().toLowerCase();
  
  for (const [canonicalField, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) {
      return canonicalField;
    }
  }
  
  return rawHeader;
}

export function parseInput(filePath: string): ParsedData {
  const content = readFileSync(filePath, 'utf-8');
  return parseText(content);
}

export function parseText(text: string): ParsedData {
  const delimiter = detectDelimiter(text);
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  if (lines.length === 0) {
    throw new Error('Input is empty');
  }
  
  const rawHeaders = lines[0].split(delimiter).map(h => h.trim());
  const headers = rawHeaders.map(normalizeHeader);
  
  const rows: RawNightsbridgeRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim());
    const row: RawNightsbridgeRow = {};
    
    for (let j = 0; j < headers.length && j < values.length; j++) {
      row[headers[j]] = values[j];
    }
    
    rows.push(row);
  }
  
  return { rows, delimiter, headers };
}
