import { readFileSync } from 'fs';
import { LoyverseRecord, XeroRecord } from './types.js';

export function parseLoyverseCSV(filePath: string): LoyverseRecord[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
    throw new Error('Empty Loyverse CSV file');
  }

  const header = lines[0].toLowerCase();
  const records: LoyverseRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    
    if (parts.length < 4) {
      console.warn(`Skipping malformed line ${i + 1}: ${line}`);
      continue;
    }

    const [date, receiptNumber, totalAmount, paymentType] = parts;

    records.push({
      date: normalizeDate(date),
      receiptNumber: receiptNumber.trim(),
      totalAmount: parseAmount(totalAmount),
      paymentType: paymentType.trim(),
      rawLine: line
    });
  }

  return records;
}

export function parseXeroCSV(filePath: string): XeroRecord[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
    throw new Error('Empty Xero CSV file');
  }

  const header = lines[0].toLowerCase();
  const records: XeroRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    
    if (parts.length < 4) {
      console.warn(`Skipping malformed line ${i + 1}: ${line}`);
      continue;
    }

    const [date, reference, amount, description] = parts;

    records.push({
      date: normalizeDate(date),
      reference: reference.trim(),
      amount: parseAmount(amount),
      description: description.trim(),
      rawLine: line
    });
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function normalizeDate(dateStr: string): string {
  const cleaned = dateStr.trim();
  
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      if (format === formats[0]) {
        return cleaned;
      }
      
      if (format === formats[1]) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      if (format === formats[2]) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }

  throw new Error(`Invalid date format: ${dateStr}`);
}

function parseAmount(amountStr: string): number {
  const cleaned = amountStr.trim().replace(/[,$]/g, '');
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }
  
  return amount;
}
