import { writeFileSync } from 'fs';
import { join } from 'path';
import type { DiffResult, DiffItem, GRVRow, StocktakeRow, Manifest } from './types.js';

export function generateDiff(
  grvRows: GRVRow[],
  stocktakeRows: StocktakeRow[],
  rejectedGRV: Array<{ row: any; reason: string }>,
  rejectedStocktake: Array<{ row: any; reason: string }>
): DiffResult {
  const grvMap = new Map<string, GRVRow>();
  const stocktakeMap = new Map<string, StocktakeRow>();

  for (const row of grvRows) {
    const key = `${row.Store}|${row['SKU/Item']}`;
    grvMap.set(key, row);
  }

  for (const row of stocktakeRows) {
    const key = `${row.Store}|${row['SKU/Item']}`;
    stocktakeMap.set(key, row);
  }

  const allKeys = new Set([...grvMap.keys(), ...stocktakeMap.keys()]);
  const items: DiffItem[] = [];
  const missingInStocktake: string[] = [];
  const missingInGRV: string[] = [];

  for (const key of allKeys) {
    const grvRow = grvMap.get(key);
    const stockRow = stocktakeMap.get(key);

    if (grvRow && stockRow) {
      const received = grvRow.ReceivedQty;
      const counted = stockRow.CountedQty;
      const delta = counted - received;

      items.push({
        key,
        store: grvRow.Store,
        item: grvRow['SKU/Item'],
        received,
        counted,
        delta,
        unit: grvRow.Unit || stockRow.Unit || ''
      });
    } else if (grvRow && !stockRow) {
      missingInStocktake.push(key);
      items.push({
        key,
        store: grvRow.Store,
        item: grvRow['SKU/Item'],
        received: grvRow.ReceivedQty,
        counted: 0,
        delta: -grvRow.ReceivedQty,
        unit: grvRow.Unit || ''
      });
    } else if (!grvRow && stockRow) {
      missingInGRV.push(key);
      items.push({
        key,
        store: stockRow.Store,
        item: stockRow['SKU/Item'],
        received: 0,
        counted: stockRow.CountedQty,
        delta: stockRow.CountedQty,
        unit: stockRow.Unit || ''
      });
    }
  }

  items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const totalReceived = items.reduce((sum, item) => sum + item.received, 0);
  const totalCounted = items.reduce((sum, item) => sum + item.counted, 0);
  const totalDelta = totalCounted - totalReceived;

  return {
    items,
    totalReceived,
    totalCounted,
    totalDelta,
    missingInStocktake,
    missingInGRV,
    rejectedGRV,
    rejectedStocktake
  };
}

export function generateDiffJSON(result: DiffResult, outputDir: string): void {
  const output = {
    summary: {
      totalItems: result.items.length,
      totalReceived: result.totalReceived,
      totalCounted: result.totalCounted,
      totalDelta: result.totalDelta,
      missingInStocktake: result.missingInStocktake.length,
      missingInGRV: result.missingInGRV.length
    },
    items: result.items
  };

  writeFileSync(
    join(outputDir, 'diff.json'),
    JSON.stringify(output, null, 2),
    'utf-8'
  );
}

export function generateDiffMarkdown(result: DiffResult, outputDir: string): void {
  let md = '# Perfect Water GRV vs Stocktake Diff\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += '## Summary\n\n';
  md += `- **Total Received:** ${result.totalReceived}\n`;
  md += `- **Total Counted:** ${result.totalCounted}\n`;
  md += `- **Total Delta (Counted - Received):** ${result.totalDelta}\n`;
  md += `- **Items Compared:** ${result.items.length}\n`;
  md += `- **Missing in Stocktake:** ${result.missingInStocktake.length}\n`;
  md += `- **Missing in GRV:** ${result.missingInGRV.length}\n\n`;

  md += '## Item Breakdown\n\n';
  md += '| Store | Item | Received | Counted | Delta | Unit |\n';
  md += '|-------|------|----------|---------|-------|------|\n';

  for (const item of result.items) {
    md += `| ${item.store} | ${item.item} | ${item.received} | ${item.counted} | ${item.delta} | ${item.unit} |\n`;
  }

  md += '\n---\n\n';
  md += '**⚠️ Reminder for Bots:** Amounts stay in this file. Never paste quantity figures into chat unless explicitly requested.\n';

  writeFileSync(join(outputDir, 'diff.md'), md, 'utf-8');
}

export function generateMissingKeysReport(result: DiffResult, outputDir: string): void {
  let md = '# Missing Keys and Rejected Rows\n\n';

  md += '## Items in GRV but Missing in Stocktake\n\n';
  if (result.missingInStocktake.length === 0) {
    md += 'None.\n\n';
  } else {
    md += 'The following items were received but not counted:\n\n';
    for (const key of result.missingInStocktake) {
      const [store, item] = key.split('|');
      md += `- ${store} | ${item}\n`;
    }
    md += '\n';
  }

  md += '## Items in Stocktake but Missing in GRV\n\n';
  if (result.missingInGRV.length === 0) {
    md += 'None.\n\n';
  } else {
    md += 'The following items were counted but have no received record:\n\n';
    for (const key of result.missingInGRV) {
      const [store, item] = key.split('|');
      md += `- ${store} | ${item}\n`;
    }
    md += '\n';
  }

  md += '## Rejected Rows from GRV CSV\n\n';
  if (result.rejectedGRV.length === 0) {
    md += 'None.\n\n';
  } else {
    md += `${result.rejectedGRV.length} row(s) rejected:\n\n`;
    for (const rejected of result.rejectedGRV) {
      md += `- **Reason:** ${rejected.reason}\n`;
      md += `  - **Row:** ${JSON.stringify(rejected.row)}\n\n`;
    }
  }

  md += '## Rejected Rows from Stocktake CSV\n\n';
  if (result.rejectedStocktake.length === 0) {
    md += 'None.\n\n';
  } else {
    md += `${result.rejectedStocktake.length} row(s) rejected:\n\n`;
    for (const rejected of result.rejectedStocktake) {
      md += `- **Reason:** ${rejected.reason}\n`;
      md += `  - **Row:** ${JSON.stringify(rejected.row)}\n\n`;
    }
  }

  writeFileSync(join(outputDir, 'missing-keys.md'), md, 'utf-8');
}

export function generateApprovalDoc(outputDir: string): void {
  const md = `# APPROVAL — Perfect Water GRV vs Stocktake Diff

## Purpose

Offline comparison of goods-received (GRV) vs stocktake counts by Store + SKU/Item for Perfect Water / CoS inventory reconciliation.

## Ownership

- **Owning Desk:** Perfect Water / CoS
- **Inventory Decisions:** Perfect Water owns all stock adjustments
- **Cost-of-Sales:** Perfect Water owns CoS reconciliation

## Safety Gates

✅ **Offline only** - No APIs or network calls
✅ **No invented quantities** - All amounts from source CSVs only
✅ **Read-only** - Never modifies source CSV files
✅ **File-based** - All amounts stay in files
✅ **Blank/unparseable qty → rejected** - Invalid rows reported in missing-keys.md
✅ **Exit 1 on bad input** - Malformed CSVs caught early

## Approval Requirements

Per \`docs/automation/approval-gates.md\`:

- **H3 gate:** Before using diff data for PW inventory decisions
- **Grant approval required:** Before any stock adjustments based on diff outputs

## Bot Reminders

⚠️ **Amounts stay in files** - Never paste quantity figures into chat unless explicitly requested by Grant
⚠️ **Perfect Water owns ops** - This tool generates reports only; PW makes all inventory decisions
⚠️ **No auto-adjust** - Never auto-adjust stock levels based on diff outputs

## Next Steps

1. Review \`diff.md\` for counted vs received deltas
2. Check \`missing-keys.md\` for items missing in one side
3. Investigate large deltas (stocktake errors? GRV errors? theft? shrinkage?)
4. Perfect Water team decides stock adjustments
5. Archive diff reports in PW Drive

---

**Generated:** ${new Date().toISOString()}
`;

  writeFileSync(join(outputDir, 'APPROVAL.md'), md, 'utf-8');
}

export function generateManifest(
  grvPath: string,
  stocktakePath: string,
  result: DiffResult,
  outputDir: string
): void {
  const manifest: Manifest = {
    tool: 'pw-grv-vs-stocktake-diff',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    inputs: {
      grv: grvPath,
      stocktake: stocktakePath
    },
    summary: {
      totalItems: result.items.length,
      totalReceived: result.totalReceived,
      totalCounted: result.totalCounted,
      totalDelta: result.totalDelta,
      missingInStocktake: result.missingInStocktake.length,
      missingInGRV: result.missingInGRV.length,
      rejectedGRV: result.rejectedGRV.length,
      rejectedStocktake: result.rejectedStocktake.length
    },
    outputs: {
      diffJson: 'diff.json',
      diffMd: 'diff.md',
      missingKeysMd: 'missing-keys.md',
      approvalMd: 'APPROVAL.md',
      manifestJson: 'manifest.json'
    }
  };

  writeFileSync(
    join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );
}
