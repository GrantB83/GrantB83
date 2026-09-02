import { CSVRow, NormalizedGRV, NormalizationResult, ProfileConfig, RejectedRow } from './types.js';
import { resolveColumnName } from './profiles.js';

export function normalizeRows(rows: CSVRow[], profile: ProfileConfig, overrides?: {
  storeCol?: string;
  itemCol?: string;
  qtyCol?: string;
  unitCol?: string;
  dateCol?: string;
  supplierCol?: string;
  docnoCol?: string;
}): NormalizationResult {
  const normalized: NormalizedGRV[] = [];
  const rejected: RejectedRow[] = [];
  const missingFields = {
    missingStore: 0,
    missingItem: 0,
    missingQty: 0,
    missingUnit: 0,
  };

  if (rows.length === 0) {
    return { normalized, rejected, missingFields };
  }

  const headers = Object.keys(rows[0]);

  // Resolve column names
  const storeCol = resolveColumnName(profile, headers, overrides?.storeCol || profile.storeColumn, ['store', 'location', 'outlet', 'shop']);
  const itemCol = resolveColumnName(profile, headers, overrides?.itemCol || profile.itemColumn, ['item', 'sku', 'product', 'name']);
  const qtyCol = resolveColumnName(profile, headers, overrides?.qtyCol || profile.qtyColumn, ['qty', 'quantity', 'received', 'amount']);
  const unitCol = resolveColumnName(profile, headers, overrides?.unitCol || profile.unitColumn, ['unit', 'uom', 'measure']);
  const dateCol = resolveColumnName(profile, headers, overrides?.dateCol || profile.dateColumn, ['date', 'received at', 'receivedat', 'grv date']);
  const supplierCol = resolveColumnName(profile, headers, overrides?.supplierCol || profile.supplierColumn, ['supplier', 'vendor', 'from']);
  const docnoCol = resolveColumnName(profile, headers, overrides?.docnoCol || profile.docnoColumn, ['doc no', 'docno', 'document', 'receipt', 'grv', 'invoice']);

  for (const row of rows) {
    const store = storeCol ? row[storeCol] : '';
    const item = itemCol ? row[itemCol] : '';
    const qtyStr = qtyCol ? row[qtyCol] : '';
    const unit = unitCol ? row[unitCol] : '';
    const date = dateCol ? row[dateCol] : '';
    const supplier = supplierCol ? row[supplierCol] : '';
    const docno = docnoCol ? row[docnoCol] : '';

    // Required fields: Store, Item, Qty, Unit
    if (!store.trim()) {
      missingFields.missingStore++;
      rejected.push({ row, reason: 'Missing or blank Store' });
      continue;
    }

    if (!item.trim()) {
      missingFields.missingItem++;
      rejected.push({ row, reason: 'Missing or blank SKU/Item' });
      continue;
    }

    if (!qtyStr.trim()) {
      missingFields.missingQty++;
      rejected.push({ row, reason: 'Missing or blank ReceivedQty' });
      continue;
    }

    // Parse quantity
    const qty = parseFloat(qtyStr.replace(/[^\d.-]/g, ''));
    if (isNaN(qty)) {
      rejected.push({ row, reason: `Unparseable ReceivedQty: "${qtyStr}"` });
      continue;
    }

    if (!unit.trim()) {
      missingFields.missingUnit++;
      rejected.push({ row, reason: 'Missing or blank Unit' });
      continue;
    }

    // Build notes from remaining columns not used
    const notes: string[] = [];
    for (const [key, value] of Object.entries(row)) {
      if (
        key !== storeCol &&
        key !== itemCol &&
        key !== qtyCol &&
        key !== unitCol &&
        key !== dateCol &&
        key !== supplierCol &&
        key !== docnoCol &&
        value.trim()
      ) {
        notes.push(`${key}: ${value}`);
      }
    }

    normalized.push({
      Store: store,
      'SKU/Item': item,
      ReceivedQty: qty.toString(),
      Unit: unit,
      ReceivedAt: date,
      Supplier: supplier,
      DocNo: docno,
      Notes: notes.join('; '),
    });
  }

  return { normalized, rejected, missingFields };
}
