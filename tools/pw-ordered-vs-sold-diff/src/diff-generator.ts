import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { CSVRow, DiffResult, DiffItem, RejectedRow } from './types.js';

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
}

export function generateDiff(
  orderedRows: CSVRow[],
  soldRows: CSVRow[],
  useStore: boolean
): DiffResult {
  const orderedMap = new Map<string, number>();
  const soldMap = new Map<string, number>();

  for (const row of orderedRows) {
    const key = useStore && row.store ? `${row.item}|${row.store}` : row.item;
    orderedMap.set(key, (orderedMap.get(key) || 0) + row.quantity);
  }

  for (const row of soldRows) {
    const key = useStore && row.store ? `${row.item}|${row.store}` : row.item;
    soldMap.set(key, (soldMap.get(key) || 0) + row.quantity);
  }

  const allKeys = new Set([...orderedMap.keys(), ...soldMap.keys()]);
  const items: DiffItem[] = [];
  const missingInOrdered: string[] = [];
  const missingInSold: string[] = [];

  let totalOrdered = 0;
  let totalSold = 0;

  for (const key of allKeys) {
    const ordered = orderedMap.get(key) || 0;
    const sold = soldMap.get(key) || 0;
    const delta = ordered - sold;

    totalOrdered += ordered;
    totalSold += sold;

    const parts = key.split('|');
    const item = parts[0];
    const store = parts.length > 1 ? parts[1] : undefined;

    items.push({
      item,
      store,
      ordered,
      sold,
      delta
    });

    if (ordered === 0) {
      missingInOrdered.push(key);
    }
    if (sold === 0) {
      missingInSold.push(key);
    }
  }

  items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    items,
    missingInOrdered,
    missingInSold,
    totalOrdered,
    totalSold,
    totalDelta: totalOrdered - totalSold
  };
}

export function generateDiffJSON(diff: DiffResult, filePath: string): void {
  ensureDir(filePath);
  writeFileSync(filePath, JSON.stringify(diff, null, 2), 'utf-8');
}

export function generateDiffMarkdown(diff: DiffResult, filePath: string): void {
  ensureDir(filePath);

  let md = '# Perfect Water Ordered vs Sold Diff\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  md += '## Summary\n\n';
  md += `- **Total Ordered:** ${diff.totalOrdered}\n`;
  md += `- **Total Sold:** ${diff.totalSold}\n`;
  md += `- **Total Delta:** ${diff.totalDelta}\n`;
  md += `- **Items Compared:** ${diff.items.length}\n\n`;

  if (diff.items.length > 0) {
    md += '## Item Breakdown\n\n';
    
    const hasStore = diff.items.some(item => item.store !== undefined);
    
    if (hasStore) {
      md += '| Item | Store | Ordered | Sold | Delta |\n';
      md += '|------|-------|---------|------|-------|\n';
      
      for (const item of diff.items) {
        md += `| ${item.item} | ${item.store || 'N/A'} | ${item.ordered} | ${item.sold} | ${item.delta} |\n`;
      }
    } else {
      md += '| Item | Ordered | Sold | Delta |\n';
      md += '|------|---------|------|-------|\n';
      
      for (const item of diff.items) {
        md += `| ${item.item} | ${item.ordered} | ${item.sold} | ${item.delta} |\n`;
      }
    }
    
    md += '\n';
  }

  md += '---\n\n';
  md += '**⚠️ Reminder for Bots:** Amounts stay in this file. Never paste quantity figures into chat unless explicitly requested.\n';

  writeFileSync(filePath, md, 'utf-8');
}

export function generateMissingKeysReport(
  diff: DiffResult,
  orderedRejected: RejectedRow[],
  soldRejected: RejectedRow[],
  filePath: string
): void {
  ensureDir(filePath);

  let md = '# Missing Keys Report\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  md += '## Items Missing in Ordered CSV\n\n';
  if (diff.missingInOrdered.length > 0) {
    md += `Found ${diff.missingInOrdered.length} item(s) present in sold CSV but missing in ordered CSV:\n\n`;
    for (const key of diff.missingInOrdered) {
      md += `- ${key}\n`;
    }
    md += '\n';
  } else {
    md += 'No items missing in ordered CSV.\n\n';
  }

  md += '## Items Missing in Sold CSV\n\n';
  if (diff.missingInSold.length > 0) {
    md += `Found ${diff.missingInSold.length} item(s) present in ordered CSV but missing in sold CSV:\n\n`;
    for (const key of diff.missingInSold) {
      md += `- ${key}\n`;
    }
    md += '\n';
  } else {
    md += 'No items missing in sold CSV.\n\n';
  }

  md += '## Rejected Rows from Ordered CSV\n\n';
  if (orderedRejected.length > 0) {
    md += `Found ${orderedRejected.length} rejected row(s) in ordered CSV:\n\n`;
    md += '| Row # | Reason | Item | Quantity | Store |\n';
    md += '|-------|--------|------|----------|-------|\n';
    for (const row of orderedRejected) {
      md += `| ${row.rowNumber} | ${row.reason} | ${row.rawItem || 'N/A'} | ${row.rawQuantity || 'N/A'} | ${row.rawStore || 'N/A'} |\n`;
    }
    md += '\n';
  } else {
    md += 'No rejected rows in ordered CSV.\n\n';
  }

  md += '## Rejected Rows from Sold CSV\n\n';
  if (soldRejected.length > 0) {
    md += `Found ${soldRejected.length} rejected row(s) in sold CSV:\n\n`;
    md += '| Row # | Reason | Item | Quantity | Store |\n';
    md += '|-------|--------|------|----------|-------|\n';
    for (const row of soldRejected) {
      md += `| ${row.rowNumber} | ${row.reason} | ${row.rawItem || 'N/A'} | ${row.rawQuantity || 'N/A'} | ${row.rawStore || 'N/A'} |\n`;
    }
    md += '\n';
  } else {
    md += 'No rejected rows in sold CSV.\n\n';
  }

  writeFileSync(filePath, md, 'utf-8');
}

export function generateApprovalDoc(filePath: string): void {
  ensureDir(filePath);

  const md = `# Perfect Water Ordered vs Sold Diff - APPROVAL

**Tool:** pw-ordered-vs-sold-diff

**Purpose:** Offline comparison of ordered exports vs sold/Loyverse exports by SKU/Item (+ optional Store) for Perfect Water / CoS cost-of-sales reconciliation.

## Safety Gates

✅ **Offline only** - No Loyverse API or network calls
✅ **No invented quantities** - All amounts from source CSVs only
✅ **Read-only** - Never modifies source CSV files
✅ **File-based** - All amounts stay in files
✅ **Blank/unparseable qty → rejected** - Invalid rows reported in missing-keys.md
✅ **Exit 1 on bad input** - Malformed CSVs caught early

## Approval Gates

Per \`docs/automation/approval-gates.md\`:

- **H3 gate:** Before using diff data for Perfect Water CoS decisions
- **Grant approval required:** Before any stock adjustments based on diff outputs

## Bot Reminder

**Amounts stay in files.** Never paste quantity figures or amounts into chat unless explicitly requested by Grant.

## Ownership

- **Perfect Water / CoS:** Owns all stock-level decisions and cost-of-sales reconciliation
- **Coding / CoS:** May run this tool; never makes operational decisions

## Output Files

- \`diff.json\` - Structured diff data (machine-readable)
- \`diff.md\` - Human-readable diff with ordered/sold/delta
- \`missing-keys.md\` - Items present in one CSV but not the other, plus rejected rows
- \`APPROVAL.md\` - This file
- \`manifest.json\` - Run metadata

## Generated

${new Date().toISOString()}
`;

  writeFileSync(filePath, md, 'utf-8');
}

export function generateManifest(
  diff: DiffResult,
  orderedRejected: RejectedRow[],
  soldRejected: RejectedRow[],
  orderedPath: string,
  soldPath: string,
  filePath: string
): void {
  ensureDir(filePath);

  const manifest = {
    tool: 'pw-ordered-vs-sold-diff',
    version: '1.0.0',
    generated: new Date().toISOString(),
    inputs: {
      ordered: orderedPath,
      sold: soldPath
    },
    summary: {
      itemsCompared: diff.items.length,
      totalOrdered: diff.totalOrdered,
      totalSold: diff.totalSold,
      totalDelta: diff.totalDelta,
      missingInOrdered: diff.missingInOrdered.length,
      missingInSold: diff.missingInSold.length,
      orderedRejected: orderedRejected.length,
      soldRejected: soldRejected.length
    },
    outputs: {
      'diff.json': 'Structured diff data',
      'diff.md': 'Human-readable diff with ordered/sold/delta',
      'missing-keys.md': 'Items missing in one CSV or rejected rows',
      'APPROVAL.md': 'Safety gates and approval workflow',
      'manifest.json': 'This file'
    }
  };

  writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
}
