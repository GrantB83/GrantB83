import * as fs from 'fs';
import { PromoRecord } from './types.js';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export function parsePromo(filePath: string): PromoRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (filePath.endsWith('.json')) {
    return parsePromoJSON(content);
  } else if (filePath.endsWith('.csv')) {
    return parsePromoCSV(content);
  } else {
    throw new Error('Promo file must be .json or .csv');
  }
}

function parsePromoJSON(content: string): PromoRecord[] {
  const data = JSON.parse(content);
  
  if (!Array.isArray(data)) {
    throw new Error('Promo JSON must be an array');
  }

  return data.map((item, index) => {
    if (!item.name || !item.startDate || !item.endDate) {
      throw new Error(`Promo record ${index + 1} missing required fields: name, startDate, endDate`);
    }

    const discountPercent = item.discountPercent ? parseFloat(item.discountPercent) : undefined;
    const discountAmount = item.discountAmount ? parseFloat(item.discountAmount) : undefined;

    return {
      name: item.name,
      startDate: item.startDate,
      endDate: item.endDate,
      discountPercent: discountPercent && !isNaN(discountPercent) ? discountPercent : undefined,
      discountAmount: discountAmount && !isNaN(discountAmount) ? discountAmount : undefined,
    };
  });
}

function parsePromoCSV(content: string): PromoRecord[] {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Promo CSV must have header row and at least one data row');
  }

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const requiredColumns = ['name', 'startdate', 'enddate'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`Promo CSV missing required columns: ${missingColumns.join(', ')}`);
  }

  const getIndex = (name: string): number => headers.indexOf(name.toLowerCase());

  const nameIndex = getIndex('name');
  const startIndex = getIndex('startdate');
  const endIndex = getIndex('enddate');
  const percentIndex = getIndex('discountpercent');
  const amountIndex = getIndex('discountamount');

  const promos: PromoRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    
    if (values.every(v => !v)) {
      continue;
    }

    const percentValue = percentIndex >= 0 ? values[percentIndex]?.trim() : undefined;
    const amountValue = amountIndex >= 0 ? values[amountIndex]?.trim() : undefined;

    let discountPercent: number | undefined = undefined;
    let discountAmount: number | undefined = undefined;

    if (percentValue && percentValue !== '') {
      const parsed = parseFloat(percentValue);
      if (!isNaN(parsed) && parsed > 0) {
        discountPercent = parsed;
      }
    }

    if (amountValue && amountValue !== '') {
      const parsed = parseFloat(amountValue);
      if (!isNaN(parsed) && parsed > 0) {
        discountAmount = parsed;
      }
    }

    promos.push({
      name: values[nameIndex] || '',
      startDate: values[startIndex] || '',
      endDate: values[endIndex] || '',
      discountPercent,
      discountAmount,
    });
  }

  return promos;
}
