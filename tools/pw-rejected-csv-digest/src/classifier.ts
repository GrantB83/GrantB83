import { RejectedRow, ReasonBucket } from './types.js';

export function classifyRejectionReasons(
  rows: RejectedRow[],
  requireHeaders?: string[]
): ReasonBucket[] {
  const reasonMap = new Map<string, { count: number; indices: number[] }>();

  rows.forEach((row, index) => {
    let reason = 'Unknown rejection';

    // Check common rejection reason columns
    if (row['RejectionReason'] || row['RejectReason'] || row['Reason']) {
      reason = row['RejectionReason'] || row['RejectReason'] || row['Reason'];
    } else if (row['Error'] || row['error']) {
      reason = row['Error'] || row['error'];
    } else if (row['Notes'] || row['notes']) {
      const notes = row['Notes'] || row['notes'];
      if (notes.toLowerCase().includes('missing') || notes.toLowerCase().includes('blank')) {
        reason = 'Missing or blank field';
      } else if (notes.toLowerCase().includes('invalid') || notes.toLowerCase().includes('unparseable')) {
        reason = 'Invalid or unparseable value';
      } else {
        reason = notes;
      }
    } else if (requireHeaders && requireHeaders.length > 0) {
      // Check if required headers are blank
      const missingFields = requireHeaders.filter(h => !row[h] || row[h].trim() === '');
      if (missingFields.length > 0) {
        reason = `Missing required fields: ${missingFields.join(', ')}`;
      }
    } else {
      // Heuristic: look for blank required-looking columns
      const keys = Object.keys(row);
      const blankKeys = keys.filter(k => {
        const val = row[k];
        return (!val || val.trim() === '') && 
               (k.toLowerCase().includes('qty') || 
                k.toLowerCase().includes('amount') ||
                k.toLowerCase().includes('sku') ||
                k.toLowerCase().includes('item') ||
                k.toLowerCase().includes('store'));
      });
      
      if (blankKeys.length > 0) {
        reason = `Missing or blank fields: ${blankKeys.join(', ')}`;
      }
    }

    if (!reasonMap.has(reason)) {
      reasonMap.set(reason, { count: 0, indices: [] });
    }
    const bucket = reasonMap.get(reason)!;
    bucket.count++;
    // Store sample indices (first 3 per reason)
    if (bucket.indices.length < 3) {
      bucket.indices.push(index);
    }
  });

  return Array.from(reasonMap.entries())
    .map(([reason, { count, indices }]) => ({
      reason,
      count,
      sampleIndices: indices,
    }))
    .sort((a, b) => b.count - a.count);
}

export function detectMissingHeaders(rows: RejectedRow[]): string[] {
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const missing: string[] = [];

  // Check for expected headers
  const expectedHeaders = ['Store', 'SKU', 'Item', 'Qty', 'ReceivedQty', 'Unit', 'Amount'];
  const headersLower = headers.map(h => h.toLowerCase());

  const hasStore = headersLower.some(h => h.includes('store') || h.includes('location'));
  const hasItem = headersLower.some(h => h.includes('item') || h.includes('sku') || h.includes('product'));
  const hasQty = headersLower.some(h => h.includes('qty') || h.includes('quantity') || h.includes('amount'));
  const hasUnit = headersLower.some(h => h.includes('unit') || h.includes('uom'));

  if (!hasStore) missing.push('Store/Location');
  if (!hasItem) missing.push('Item/SKU');
  if (!hasQty) missing.push('Qty/Amount');
  if (!hasUnit) missing.push('Unit');

  return missing;
}
