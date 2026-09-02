import { readFileSync } from 'fs';
import type { CSVRow, CSVParseResult, CSVColumnConfig, RejectedRow } from './types.js';

export function parseCSV(
  filePath: string,
  config: CSVColumnConfig
): CSVParseResult {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim());

  const keyColIndex = headers.indexOf(config.keyCol);
  const qtyColIndex = headers.indexOf(config.qtyCol);
  const storeColIndex = config.storeCol ? headers.indexOf(config.storeCol) : -1;

  if (keyColIndex === -1) {
    throw new Error(`Required column '${config.keyCol}' not found. Available columns: ${headers.join(', ')}`);
  }

  if (qtyColIndex === -1) {
    throw new Error(`Required column '${config.qtyCol}' not found. Available columns: ${headers.join(', ')}`);
  }

  if (config.storeCol && storeColIndex === -1) {
    throw new Error(`Store column '${config.storeCol}' not found. Available columns: ${headers.join(', ')}`);
  }

  const rows: CSVRow[] = [];
  const rejected: RejectedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const rowNumber = i + 1;
    const values = line.split(',').map(v => v.trim());

    const rawItem = values[keyColIndex] || '';
    const rawQuantity = values[qtyColIndex] || '';
    const rawStore = storeColIndex >= 0 ? (values[storeColIndex] || '') : undefined;

    if (!rawItem) {
      rejected.push({
        rowNumber,
        reason: 'Missing item/key',
        rawItem,
        rawQuantity,
        rawStore
      });
      continue;
    }

    if (!rawQuantity) {
      rejected.push({
        rowNumber,
        reason: 'Missing quantity',
        rawItem,
        rawQuantity,
        rawStore
      });
      continue;
    }

    const quantity = parseFloat(rawQuantity);
    if (isNaN(quantity)) {
      rejected.push({
        rowNumber,
        reason: 'Unparseable quantity',
        rawItem,
        rawQuantity,
        rawStore
      });
      continue;
    }

    const row: CSVRow = {
      item: rawItem,
      quantity,
      rowNumber
    };

    if (config.storeCol && rawStore) {
      row.store = rawStore;
    }

    rows.push(row);
  }

  return { rows, rejected };
}
