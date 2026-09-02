import { writeFileSync } from 'fs';
import { join } from 'path';
import type { PackMetadata } from './types.js';

export function generatePackMarkdown(metadata: PackMetadata, outdir: string): void {
  const lines: string[] = [];

  lines.push('# Perfect Water Inventory Recon Pack\n');
  lines.push(`**Generated:** ${metadata.timestamp}\n`);
  lines.push('## Index\n');
  lines.push('This pack contains inventory reconciliation outputs for Perfect Water / CoS.\n');
  
  lines.push('### Included Files\n');
  
  if (metadata.outputs.diffMd) {
    lines.push('- **diff.md** - Human-readable diff report (Store, Item, Received, Counted, Delta)');
  }
  if (metadata.outputs.diffJson) {
    lines.push('- **diff.json** - Machine-readable diff data');
  }
  if (metadata.outputs.missingKeysMd) {
    lines.push('- **missing-keys.md** - Items missing in GRV or stocktake, plus rejected rows');
  }
  if (metadata.outputs.rejectedDigestMd) {
    lines.push('- **DIGEST.md** - Rejected row digest (counts only, amounts in files)');
  }
  lines.push('- **APPROVAL.md** - Safety gates and ownership reminder');
  lines.push('- **manifest.json** - Run metadata\n');

  lines.push('## Summary Statistics\n');
  lines.push('**Row and Key Counts Only** (amounts stay in files):\n');
  
  if (metadata.summary.itemsCompared !== undefined) {
    lines.push(`- **Items Compared:** ${metadata.summary.itemsCompared}`);
  }
  if (metadata.summary.totalReceivedQty !== undefined) {
    lines.push(`- **Total Received Qty:** ${metadata.summary.totalReceivedQty}`);
  }
  if (metadata.summary.totalCountedQty !== undefined) {
    lines.push(`- **Total Counted Qty:** ${metadata.summary.totalCountedQty}`);
  }
  if (metadata.summary.totalDelta !== undefined) {
    lines.push(`- **Total Delta (Counted - Received):** ${metadata.summary.totalDelta}`);
  }
  if (metadata.summary.rejectedGrvRows !== undefined && metadata.summary.rejectedGrvRows > 0) {
    lines.push(`- **Rejected GRV Rows:** ${metadata.summary.rejectedGrvRows}`);
  }
  if (metadata.summary.rejectedStocktakeRows !== undefined && metadata.summary.rejectedStocktakeRows > 0) {
    lines.push(`- **Rejected Stocktake Rows:** ${metadata.summary.rejectedStocktakeRows}`);
  }

  lines.push('\n## Operations Performed\n');
  lines.push(`- **Normalized CSVs:** ${metadata.operations.normalized ? 'Yes' : 'No'}`);
  lines.push(`- **Generated Diff:** ${metadata.operations.diffed ? 'Yes' : 'No'}`);
  lines.push(`- **Digested Rejected Rows:** ${metadata.operations.digestedRejected ? 'Yes' : 'No'}\n`);

  lines.push('## How to Use This Pack\n');
  lines.push('1. **Review APPROVAL.md** - Understand ownership and approval gates');
  lines.push('2. **Open diff.md** - See item-level deltas (amounts in file, not chat)');
  lines.push('3. **Check missing-keys.md** - Investigate items present in one side but not the other');
  lines.push('4. **Review DIGEST.md** (if present) - Check rejected row patterns');
  lines.push('5. **Perfect Water decides** - PW owns all inventory adjustment decisions\n');

  lines.push('## Critical Reminders\n');
  lines.push('- ⚠️ **Amounts stay in files** - Never paste quantities into chat unless explicitly requested');
  lines.push('- ⚠️ **Offline only** - This pack contains reports; no Loyverse write-back');
  lines.push('- ⚠️ **PW ownership** - Perfect Water owns all inventory decisions');
  lines.push('- ⚠️ **H3 gate** - Inventory decisions require approval per `docs/automation/approval-gates.md`\n');

  lines.push('---\n');
  lines.push('**Tool:** pw-inventory-recon-pack v1.0.0\n');

  writeFileSync(join(outdir, 'PACK.md'), lines.join('\n'));
}
