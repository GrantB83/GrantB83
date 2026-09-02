import { readFileSync } from 'fs';
import type { ParsedCSV, GRVRow, StocktakeRow } from './types.js';

export function detectDelimiter(line: string): ',' | ';' | '\t' {
  const commas = (line.match(/,/g) || []).length;
  const semicolons = (line.match(/;/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

export function parseCSVFile(path: string, delimiter: string): string[][] {
  const content = readFileSync(path, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  return lines.map(line => {
    return line.split(delimiter).map(cell => cell.trim());
  });
}

export function parseGRV(
  path: string,
  storeCol: string = 'Store',
  keyCol: string = 'SKU/Item',
  qtyCol: string = 'ReceivedQty'
): ParsedCSV<GRVRow> {
  const content = readFileSync(path, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('GRV CSV file must have at least a header row and one data row');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map(h => h.trim());
  
  const storeIdx = headers.indexOf(storeCol);
  const keyIdx = headers.indexOf(keyCol);
  const qtyIdx = headers.indexOf(qtyCol);
  
  if (storeIdx === -1) throw new Error(`Required column "${storeCol}" not found in GRV CSV`);
  if (keyIdx === -1) throw new Error(`Required column "${keyCol}" not found in GRV CSV`);
  if (qtyIdx === -1) throw new Error(`Required column "${qtyCol}" not found in GRV CSV`);

  const rows: GRVRow[] = [];
  const rejectedRows: Array<{ row: any; reason: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map(c => c.trim());
    const store = cells[storeIdx];
    const item = cells[keyIdx];
    const qtyStr = cells[qtyIdx];

    if (!store) {
      rejectedRows.push({ row: cells, reason: 'Missing or blank Store' });
      continue;
    }

    if (!item) {
      rejectedRows.push({ row: cells, reason: 'Missing or blank SKU/Item' });
      continue;
    }

    if (!qtyStr) {
      rejectedRows.push({ row: cells, reason: 'Missing or blank ReceivedQty' });
      continue;
    }

    const qty = parseFloat(qtyStr.replace(/,/g, ''));
    if (isNaN(qty)) {
      rejectedRows.push({ row: cells, reason: `Unparseable ReceivedQty: "${qtyStr}"` });
      continue;
    }

    rows.push({
      Store: store,
      'SKU/Item': item,
      ReceivedQty: qty,
      Unit: cells[headers.indexOf('Unit')] || '',
      ReceivedAt: cells[headers.indexOf('ReceivedAt')],
      Supplier: cells[headers.indexOf('Supplier')],
      DocNo: cells[headers.indexOf('DocNo')],
      Notes: cells[headers.indexOf('Notes')]
    });
  }

  if (rows.length === 0 && rejectedRows.length === 0) {
    throw new Error('GRV CSV contains no valid or invalid data rows');
  }

  return { rows, rejectedRows };
}

export function parseStocktake(
  path: string,
  storeCol: string = 'Store',
  keyCol: string = 'SKU/Item',
  qtyCol: string = 'CountedQty'
): ParsedCSV<StocktakeRow> {
  const content = readFileSync(path, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Stocktake CSV file must have at least a header row and one data row');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map(h => h.trim());
  
  const storeIdx = headers.indexOf(storeCol);
  const keyIdx = headers.indexOf(keyCol);
  const qtyIdx = headers.indexOf(qtyCol);
  
  if (storeIdx === -1) throw new Error(`Required column "${storeCol}" not found in stocktake CSV`);
  if (keyIdx === -1) throw new Error(`Required column "${keyCol}" not found in stocktake CSV`);
  if (qtyIdx === -1) throw new Error(`Required column "${qtyCol}" not found in stocktake CSV`);

  const rows: StocktakeRow[] = [];
  const rejectedRows: Array<{ row: any; reason: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map(c => c.trim());
    const store = cells[storeIdx];
    const item = cells[keyIdx];
    const qtyStr = cells[qtyIdx];

    if (!store) {
      rejectedRows.push({ row: cells, reason: 'Missing or blank Store' });
      continue;
    }

    if (!item) {
      rejectedRows.push({ row: cells, reason: 'Missing or blank SKU/Item' });
      continue;
    }

    if (!qtyStr) {
      rejectedRows.push({ row: cells, reason: 'Missing or blank CountedQty' });
      continue;
    }

    const qty = parseFloat(qtyStr.replace(/,/g, ''));
    if (isNaN(qty)) {
      rejectedRows.push({ row: cells, reason: `Unparseable CountedQty: "${qtyStr}"` });
      continue;
    }

    rows.push({
      Store: store,
      'SKU/Item': item,
      CountedQty: qty,
      Unit: cells[headers.indexOf('Unit')] || '',
      CountedAt: cells[headers.indexOf('CountedAt')],
      Notes: cells[headers.indexOf('Notes')]
    });
  }

  if (rows.length === 0 && rejectedRows.length === 0) {
    throw new Error('Stocktake CSV contains no valid or invalid data rows');
  }

  return { rows, rejectedRows };
}
