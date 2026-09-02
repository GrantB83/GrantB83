import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { LoyverseSale, DigestData, StoreDigest, ItemDigest, MissingFields } from './types.js';

export function generateDigest(sales: LoyverseSale[]): DigestData {
  const storeMap = new Map<string, Map<string, ItemDigest>>();

  for (const sale of sales) {
    if (!storeMap.has(sale.store)) {
      storeMap.set(sale.store, new Map());
    }

    const itemMap = storeMap.get(sale.store)!;
    if (!itemMap.has(sale.item)) {
      itemMap.set(sale.item, {
        item: sale.item,
        quantity: 0,
        grossSales: 0
      });
    }

    const itemDigest = itemMap.get(sale.item)!;
    itemDigest.quantity += sale.quantity;
    itemDigest.grossSales += sale.grossSales;
  }

  const stores: StoreDigest[] = [];
  let totalItems = 0;
  let totalQuantity = 0;
  let totalGrossSales = 0;

  for (const [storeName, itemMap] of storeMap.entries()) {
    const items = Array.from(itemMap.values());
    const storeTotal = items.reduce((sum, item) => sum + item.grossSales, 0);
    const quantityTotal = items.reduce((sum, item) => sum + item.quantity, 0);

    stores.push({
      store: storeName,
      items: items.sort((a, b) => b.grossSales - a.grossSales),
      storeTotal,
      itemCount: items.length,
      quantityTotal
    });

    totalItems += items.length;
    totalQuantity += quantityTotal;
    totalGrossSales += storeTotal;
  }

  stores.sort((a, b) => b.storeTotal - a.storeTotal);

  return {
    stores,
    totalStores: stores.length,
    totalItems,
    totalQuantity,
    totalGrossSales,
    generatedAt: new Date().toISOString()
  };
}

export function generateDigestJSON(digest: DigestData, outputPath: string): void {
  ensureDir(outputPath);
  writeFileSync(outputPath, JSON.stringify(digest, null, 2), 'utf-8');
}

export function generateDigestMarkdown(digest: DigestData, outputPath: string): void {
  ensureDir(outputPath);
  
  let md = '# Perfect Water Daily Sales Digest\n\n';
  md += `**Generated:** ${digest.generatedAt}\n\n`;
  md += '## Summary\n\n';
  md += `- **Total Stores:** ${digest.totalStores}\n`;
  md += `- **Total Unique Items:** ${digest.totalItems}\n`;
  md += `- **Total Quantity Sold:** ${digest.totalQuantity}\n`;
  md += `- **Total Gross Sales:** ${digest.totalGrossSales.toFixed(2)}\n\n`;

  md += '## Store Breakdown\n\n';

  for (const store of digest.stores) {
    md += `### ${store.store}\n\n`;
    md += `- **Items:** ${store.itemCount}\n`;
    md += `- **Quantity:** ${store.quantityTotal}\n`;
    md += `- **Store Total:** ${store.storeTotal.toFixed(2)}\n\n`;

    if (store.items.length > 0) {
      md += '| Item | Quantity | Gross Sales |\n';
      md += '|------|----------|-------------|\n';

      for (const item of store.items) {
        md += `| ${item.item} | ${item.quantity} | ${item.grossSales.toFixed(2)} |\n`;
      }
      md += '\n';
    }
  }

  md += '---\n\n';
  md += '**⚠️ Reminder for Bots:** Amounts stay in this file. Never paste sales figures into chat.\n';

  writeFileSync(outputPath, md, 'utf-8');
}

export function generateMissingFieldsReport(
  missingFields: MissingFields,
  outputPath: string
): void {
  ensureDir(outputPath);

  let md = '# Missing Fields Report\n\n';
  md += `**Total Rows Processed:** ${missingFields.totalRows}\n`;
  md += `**Invalid Rows:** ${missingFields.invalidRows.length}\n\n`;

  if (missingFields.invalidRows.length === 0) {
    md += '✅ All rows have complete data.\n';
  } else {
    md += '## Issues Found\n\n';
    
    if (missingFields.missingStores > 0) {
      md += `- **Missing Store:** ${missingFields.missingStores} row(s)\n`;
    }
    if (missingFields.missingItems > 0) {
      md += `- **Missing Item:** ${missingFields.missingItems} row(s)\n`;
    }
    if (missingFields.missingQuantities > 0) {
      md += `- **Missing Quantity:** ${missingFields.missingQuantities} row(s)\n`;
    }
    if (missingFields.missingAmounts > 0) {
      md += `- **Missing Gross Sales:** ${missingFields.missingAmounts} row(s)\n`;
    }

    md += '\n## Invalid Row Numbers\n\n';
    md += missingFields.invalidRows.map(row => `- Row ${row}`).join('\n');
    md += '\n\n';
    md += '**Action Required:** Fix or remove invalid rows from the source CSV before re-running digest.\n';
  }

  writeFileSync(outputPath, md, 'utf-8');
}

export function generateApprovalDoc(outputPath: string): void {
  ensureDir(outputPath);

  const content = `# APPROVAL: Perfect Water Loyverse Daily Sales Digest

## Tool Purpose

This CLI generates an **offline digest** from Loyverse daily sales CSV exports for Perfect Water / CoS ops review.

## Safety Gates

✅ **Offline only** - No Loyverse API  
✅ **No invented amounts** - Pass-through from CSV only  
✅ **Read-only** - Never modifies source CSV  
✅ **Perfect Water ops decisions** - PW owns all pricing/sales actions  

## What This Tool Does

1. **Reads** Loyverse daily sales CSV (manual export)
2. **Rolls up** by Store and Item
3. **Outputs** structured digest files (JSON + Markdown)
4. **Flags** missing/invalid fields

## What This Tool Never Does

- ❌ Never invents sales figures
- ❌ Never calls Loyverse API
- ❌ Never modifies source CSV
- ❌ Never makes business decisions

## Approval Required

- **H3 gate:** Before using digest data for PW ops decisions
- **Grant approval:** Before any price list or stock level changes based on digest

## Bot Reminder

**Amounts stay in files.** Never paste sales figures or amounts into chat unless explicitly requested.

---

**Desk:** Perfect Water / CoS  
**Owner:** Grant Brown  
**Last Updated:** ${new Date().toISOString().split('T')[0]}
`;

  writeFileSync(outputPath, content, 'utf-8');
}

export function generateManifest(
  digest: DigestData,
  missingFields: MissingFields,
  csvPath: string,
  outputPath: string
): void {
  ensureDir(outputPath);

  const manifest = {
    tool: 'pw-loyverse-daily-sales-digest',
    version: '1.0.0',
    generatedAt: digest.generatedAt,
    inputFile: csvPath,
    summary: {
      totalStores: digest.totalStores,
      totalItems: digest.totalItems,
      totalQuantity: digest.totalQuantity,
      totalGrossSales: digest.totalGrossSales,
      rowsProcessed: missingFields.totalRows,
      invalidRows: missingFields.invalidRows.length
    },
    outputs: {
      'digest.json': 'Structured rollup data',
      'digest.md': 'Human-readable digest',
      'missing-fields.md': 'Data quality report',
      'APPROVAL.md': 'Safety gates and ownership',
      'manifest.json': 'This file'
    }
  };

  writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch (err) {
    // Directory already exists or creation failed
  }
}
