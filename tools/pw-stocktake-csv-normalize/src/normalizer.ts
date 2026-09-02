import { RawRow, NormalizedRow, RejectedRow, ParseResult, ProfileConfig } from './types.js';

function normalizeDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }

  const cleaned = dateStr.trim();

  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Try DD/MM/YYYY
  const ddmmyyyyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try DD-MM-YYYY
  const ddmmyyyyDashMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDashMatch) {
    const [, day, month, year] = ddmmyyyyDashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try YYYY/MM/DD
  const yyyymmddMatch = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

function parseQuantity(qtyStr: string): number | null {
  if (!qtyStr || !qtyStr.trim()) {
    return null;
  }

  // Remove spaces and commas
  const cleaned = qtyStr.trim().replace(/[\s,]/g, '');

  // Try parsing
  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return null;
  }

  return num;
}

function findColumnValue(row: RawRow, aliases: string[]): string | null {
  const lowerAliases = aliases.map(a => a.toLowerCase());
  const lowerKeys = Object.keys(row).map(k => k.toLowerCase());

  for (const alias of lowerAliases) {
    const index = lowerKeys.indexOf(alias);
    if (index !== -1) {
      const originalKey = Object.keys(row)[index];
      const value = row[originalKey];
      if (value && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

export function normalizeRows(rows: RawRow[], profile: ProfileConfig): ParseResult {
  const normalized: NormalizedRow[] = [];
  const rejected: RejectedRow[] = [];
  const missingFieldsSet = new Set<string>();

  for (const row of rows) {
    const store = findColumnValue(row, profile.storeAliases);
    const sku = findColumnValue(row, profile.skuAliases);
    const qtyStr = findColumnValue(row, profile.qtyAliases);
    const unit = findColumnValue(row, profile.unitAliases);
    const countedAtStr = findColumnValue(row, profile.countedAtAliases);
    const notes = findColumnValue(row, profile.notesAliases);

    // Validate required fields
    if (!store || !store.trim()) {
      rejected.push({ originalRow: row, reason: 'missing store' });
      missingFieldsSet.add('Store');
      continue;
    }

    if (!sku || !sku.trim()) {
      rejected.push({ originalRow: row, reason: 'missing sku/item' });
      missingFieldsSet.add('SKU/Item');
      continue;
    }

    if (!qtyStr || !qtyStr.trim()) {
      rejected.push({ originalRow: row, reason: 'missing or blank quantity' });
      missingFieldsSet.add('CountedQty');
      continue;
    }

    // Parse quantity
    const qty = parseQuantity(qtyStr);
    if (qty === null) {
      rejected.push({ originalRow: row, reason: 'unparseable quantity' });
      missingFieldsSet.add('CountedQty');
      continue;
    }

    if (!unit || !unit.trim()) {
      rejected.push({ originalRow: row, reason: 'missing unit' });
      missingFieldsSet.add('Unit');
      continue;
    }

    // CountedAt is optional, but validate if present
    let countedAt: string | undefined;
    if (countedAtStr && countedAtStr.trim()) {
      const normalized = normalizeDate(countedAtStr);
      if (normalized === null) {
        rejected.push({ originalRow: row, reason: 'unparseable date' });
        missingFieldsSet.add('CountedAt');
        continue;
      }
      countedAt = normalized;
    }

    // Build normalized row
    const normalizedRow: NormalizedRow = {
      Store: store,
      'SKU/Item': sku,
      CountedQty: qty.toString(),
      Unit: unit,
    };

    if (countedAt) {
      normalizedRow.CountedAt = countedAt;
    }

    if (notes && notes.trim()) {
      normalizedRow.Notes = notes;
    }

    normalized.push(normalizedRow);
  }

  return {
    normalized,
    rejected,
    missingFields: Array.from(missingFieldsSet),
  };
}
