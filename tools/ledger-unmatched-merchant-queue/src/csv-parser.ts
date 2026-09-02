import * as fs from 'fs';
import { ParsedRow } from './types.js';

export function detectDelimiter(firstLine: string): string {
  const delimiters = [',', ';', '\t'];
  let maxCount = 0;
  let bestDelimiter = ',';

  for (const delim of delimiters) {
    const count = firstLine.split(delim).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

export function parseCsv(
  filePath: string,
  merchantCol: string,
  statusCol?: string
): { rows: ParsedRow[]; headers: string[]; issues: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map(h => h.trim());

  const merchantIndex = headers.findIndex(
    h => h.toLowerCase() === merchantCol.toLowerCase()
  );

  if (merchantIndex === -1) {
    throw new Error(
      `Merchant column "${merchantCol}" not found. Available columns: ${headers.join(', ')}`
    );
  }

  let statusIndex = -1;
  if (statusCol) {
    statusIndex = headers.findIndex(
      h => h.toLowerCase() === statusCol.toLowerCase()
    );
    if (statusIndex === -1) {
      throw new Error(
        `Status column "${statusCol}" not found. Available columns: ${headers.join(', ')}`
      );
    }
  }

  // Try to find date column (common names)
  const dateIndex = headers.findIndex(h =>
    /^(date|transaction[_ ]?date|posted[_ ]?date|trans[_ ]?date)$/i.test(h)
  );

  // Try to find amount column
  const amountIndex = headers.findIndex(h =>
    /^(amount|total|value|debit|credit)$/i.test(h)
  );

  const rows: ParsedRow[] = [];
  const issues: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(delimiter).map(v => v.trim());

    if (values.length !== headers.length) {
      issues.push(
        `Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`
      );
      continue;
    }

    const merchant = values[merchantIndex];
    if (!merchant) {
      issues.push(`Row ${i + 1}: Missing merchant value`);
      continue;
    }

    const raw: Record<string, string> = {};
    headers.forEach((header, idx) => {
      raw[header] = values[idx];
    });

    const row: ParsedRow = {
      rowIndex: i,
      merchant,
      raw,
    };

    if (statusIndex !== -1) {
      row.status = values[statusIndex];
    }

    if (dateIndex !== -1) {
      row.date = values[dateIndex];
    }

    if (amountIndex !== -1) {
      row.amount = values[amountIndex];
    }

    rows.push(row);
  }

  return { rows, headers, issues };
}
