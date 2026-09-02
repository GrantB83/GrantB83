import * as fs from 'fs';
import { RateRecord } from './types.js';

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

export function parseRatesCSV(filePath: string): RateRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Rates CSV must have header row and at least one data row');
  }

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const requiredColumns = ['suiteorunit', 'seasonorlabel', 'currency'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  const getIndex = (name: string): number => {
    const index = headers.indexOf(name.toLowerCase());
    return index;
  };

  const suiteIndex = getIndex('suiteorunit');
  const seasonIndex = getIndex('seasonorlabel');
  const currencyIndex = getIndex('currency');
  const rateIndex = getIndex('nightlyrate');
  const minStayIndex = getIndex('minstay');
  const occupancyIndex = getIndex('occupancy');
  const notesIndex = getIndex('notes');

  const rates: RateRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    
    if (values.every(v => !v)) {
      continue;
    }

    const rateValue = rateIndex >= 0 ? values[rateIndex]?.trim() : undefined;
    let nightlyRate: number | undefined = undefined;

    if (rateValue && rateValue !== '') {
      const parsed = parseFloat(rateValue);
      if (!isNaN(parsed) && parsed > 0) {
        nightlyRate = parsed;
      }
    }

    rates.push({
      suiteOrUnit: values[suiteIndex] || '',
      seasonOrLabel: values[seasonIndex] || '',
      currency: values[currencyIndex] || 'ZAR',
      nightlyRate,
      minStay: minStayIndex >= 0 ? values[minStayIndex] : undefined,
      occupancy: occupancyIndex >= 0 ? values[occupancyIndex] : undefined,
      notes: notesIndex >= 0 ? values[notesIndex] : undefined,
    });
  }

  return rates;
}
