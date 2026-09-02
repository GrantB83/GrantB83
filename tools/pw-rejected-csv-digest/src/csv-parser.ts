import { readFileSync } from 'fs';

export function parseCSV(filepath: string): {
  rows: Record<string, string>[];
  delimiter: ',' | ';' | '\t';
} {
  const content = readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    return { rows: [], delimiter: ',' };
  }

  // Detect delimiter
  const firstLine = lines[0];
  let delimiter: ',' | ';' | '\t' = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(';')) {
    delimiter = ';';
  }

  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ? values[j].trim() : '';
    }
    rows.push(row);
  }

  return { rows, delimiter };
}
