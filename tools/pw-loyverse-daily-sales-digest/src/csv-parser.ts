import { readFileSync } from 'fs';
import type { LoyverseSale, MissingFields } from './types.js';

interface ParseResult {
  sales: LoyverseSale[];
  missingFields: MissingFields;
}

interface ColumnMap {
  store: number;
  item: number;
  quantity: number;
  grossSales: number;
}

export function parseLoyverseCSV(
  filePath: string,
  columnOptions?: {
    storeCol?: string;
    itemCol?: string;
    qtyCol?: string;
    amountCol?: string;
  }
): ParseResult {
  const content = readFileSync(filePath, 'utf-8').trim();
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('Empty CSV file');
  }

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  const defaultColumns = {
    storeCol: 'Store',
    itemCol: 'Item',
    qtyCol: 'Quantity',
    amountCol: 'Gross Sales',
    ...columnOptions
  };

  const columnMap: ColumnMap = {
    store: headers.indexOf(defaultColumns.storeCol),
    item: headers.indexOf(defaultColumns.itemCol),
    quantity: headers.indexOf(defaultColumns.qtyCol),
    grossSales: headers.indexOf(defaultColumns.amountCol)
  };

  const missingColumns: string[] = [];
  if (columnMap.store === -1) missingColumns.push(defaultColumns.storeCol);
  if (columnMap.item === -1) missingColumns.push(defaultColumns.itemCol);
  if (columnMap.quantity === -1) missingColumns.push(defaultColumns.qtyCol);
  if (columnMap.grossSales === -1) missingColumns.push(defaultColumns.amountCol);

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(', ')}. Found headers: ${headers.join(', ')}`
    );
  }

  const sales: LoyverseSale[] = [];
  const missingFields: MissingFields = {
    missingStores: 0,
    missingItems: 0,
    missingQuantities: 0,
    missingAmounts: 0,
    totalRows: lines.length - 1,
    invalidRows: []
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = parseCSVLine(line);
    const rowNum = i + 1;

    const store = cells[columnMap.store]?.trim() || '';
    const item = cells[columnMap.item]?.trim() || '';
    const quantityStr = cells[columnMap.quantity]?.trim() || '';
    const grossSalesStr = cells[columnMap.grossSales]?.trim() || '';

    let hasError = false;

    if (!store) {
      missingFields.missingStores++;
      hasError = true;
    }
    if (!item) {
      missingFields.missingItems++;
      hasError = true;
    }
    if (!quantityStr) {
      missingFields.missingQuantities++;
      hasError = true;
    }
    if (!grossSalesStr) {
      missingFields.missingAmounts++;
      hasError = true;
    }

    if (hasError) {
      missingFields.invalidRows.push(rowNum);
      continue;
    }

    const quantity = parseFloat(quantityStr);
    const grossSales = parseFloat(grossSalesStr);

    if (isNaN(quantity) || isNaN(grossSales)) {
      missingFields.invalidRows.push(rowNum);
      continue;
    }

    sales.push({
      store,
      item,
      quantity,
      grossSales
    });
  }

  return { sales, missingFields };
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}
