import { readFileSync } from 'fs';
import { RawRow } from './types.js';

export function detectDelimiter(content: string): ',' | ';' | '\t' {
  const firstLine = content.split('\n')[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount > 0 && tabCount >= commaCount && tabCount >= semicolonCount) {
    return '\t';
  }
  if (semicolonCount > commaCount) {
    return ';';
  }
  return ',';
}

export function parseCSV(filePath: string): { rows: RawRow[]; delimiter: string } {
  const content = readFileSync(filePath, 'utf-8');
  const delimiter = detectDelimiter(content);
  
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows: RawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    const row: RawRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : '';
    });
    rows.push(row);
  }

  return { rows, delimiter };
}

export function writeCSV(rows: Array<Record<string, string>>, headers: string[], delimiter: string = ','): string {
  if (rows.length === 0) {
    return headers.join(delimiter) + '\n';
  }

  const lines = [headers.join(delimiter)];
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h] || '';
      if (val.includes(delimiter) || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    lines.push(values.join(delimiter));
  }

  return lines.join('\n') + '\n';
}
