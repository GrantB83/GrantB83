import { ParsedRow, MerchantGroup } from './types.js';
import { normalizeMerchantName, isUnmatched } from './normalizer.js';

export function buildQueue(
  rows: ParsedRow[],
  unmatchedValues: string[],
  hasStatusColumn: boolean,
  limit?: number
): { merchants: MerchantGroup[]; totalUnmatched: number } {
  const merchantMap = new Map<string, MerchantGroup>();

  let totalUnmatched = 0;

  for (const row of rows) {
    const { isUnmatched: rowIsUnmatched, reason } = isUnmatched(
      row,
      unmatchedValues,
      hasStatusColumn
    );

    if (!rowIsUnmatched) {
      continue;
    }

    totalUnmatched++;

    const normalized = normalizeMerchantName(row.merchant);

    if (!merchantMap.has(normalized)) {
      merchantMap.set(normalized, {
        normalizedName: normalized,
        displayName: row.merchant,
        count: 0,
        sampleRows: [],
        reason,
      });
    }

    const group = merchantMap.get(normalized)!;
    group.count++;

    // Store up to 3 sample rows
    if (group.sampleRows.length < 3) {
      group.sampleRows.push(row.rowIndex);
    }

    // Track first and last dates
    if (row.date) {
      if (!group.firstDate || row.date < group.firstDate) {
        group.firstDate = row.date;
      }
      if (!group.lastDate || row.date > group.lastDate) {
        group.lastDate = row.date;
      }
    }
  }

  // Convert to array and sort by count descending
  let merchants = Array.from(merchantMap.values()).sort(
    (a, b) => b.count - a.count
  );

  // Apply limit
  if (limit && limit > 0) {
    merchants = merchants.slice(0, limit);
  }

  return { merchants, totalUnmatched };
}
