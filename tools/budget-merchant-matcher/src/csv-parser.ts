import * as fs from 'fs';
import * as path from 'path';
import { Transaction, Rule } from './types.js';

function normalizeMerchant(merchant: string): string {
  return merchant.trim().replace(/\s+/g, ' ').toLowerCase();
}

function detectColumnIndex(headers: string[], candidates: string[]): number {
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = normalizedHeaders.indexOf(candidate.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseTransactions(filePath: string): Transaction[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('Empty CSV file');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  
  const merchantIdx = detectColumnIndex(headers, ['merchant', 'description', 'name', 'payee', 'memo']);
  if (merchantIdx === -1) {
    throw new Error('No merchant/description column found. Expected one of: Merchant, Description, Name, Payee, Memo');
  }

  const dateIdx = detectColumnIndex(headers, ['date', 'transaction date', 'posted date']);
  const amountIdx = detectColumnIndex(headers, ['amount', 'total', 'value']);

  const transactions: Transaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(cell => cell.trim());
    
    if (row.length <= merchantIdx) continue;
    
    const merchant = row[merchantIdx];
    if (!merchant) continue;

    transactions.push({
      merchant: normalizeMerchant(merchant),
      date: dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : undefined,
      amount: amountIdx >= 0 && row[amountIdx] ? row[amountIdx] : undefined,
      rawRow: row
    });
  }

  return transactions;
}

export function parseRulesCSV(filePath: string): Rule[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('Empty rules CSV file');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const patternIdx = headers.indexOf('pattern');
  const categoryIdx = headers.indexOf('category');
  const notesIdx = headers.indexOf('notes');
  const isRegexIdx = headers.indexOf('isregex');

  if (patternIdx === -1 || categoryIdx === -1) {
    throw new Error('Rules CSV must have "pattern" and "category" columns');
  }

  const rules: Rule[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(cell => cell.trim());
    
    if (row.length <= Math.max(patternIdx, categoryIdx)) continue;
    
    const pattern = row[patternIdx];
    const category = row[categoryIdx];
    
    if (!pattern || !category) continue;

    rules.push({
      pattern,
      category,
      notes: notesIdx >= 0 && row[notesIdx] ? row[notesIdx] : undefined,
      isRegex: isRegexIdx >= 0 && row[isRegexIdx] ? row[isRegexIdx].toLowerCase() === 'true' : false
    });
  }

  return rules;
}

export function parseRulesJSON(filePath: string): Rule[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  if (!Array.isArray(data)) {
    throw new Error('JSON rules file must contain an array');
  }

  return data.map(item => ({
    pattern: item.pattern,
    category: item.category,
    notes: item.notes,
    isRegex: item.isRegex || false
  }));
}

export function parseRules(filePath: string): Rule[] {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.json') {
    return parseRulesJSON(filePath);
  } else if (ext === '.csv') {
    return parseRulesCSV(filePath);
  } else {
    throw new Error('Rules file must be .csv or .json');
  }
}
