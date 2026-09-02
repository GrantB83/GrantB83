import { writeFileSync } from 'fs';
import { join } from 'path';

export function generateApprovalDoc(outdir: string): void {
  const lines: string[] = [];

  lines.push('# Approval Checklist for Inventory Recon Pack\n');
  lines.push('**Tool:** pw-inventory-recon-pack\n');
  lines.push('**Purpose:** Perfect Water / CoS inventory reconciliation pack assembly\n');

  lines.push('## Ownership & Constraints\n');
  lines.push('- ✅ **Perfect Water owns ops decisions** - This tool assembles reports; PW team makes inventory decisions');
  lines.push('- ✅ **Offline only** - No Loyverse API, no Xero write-back, no network calls');
  lines.push('- ✅ **Amounts stay in files** - Quantities and monetary amounts remain in CSV/JSON files, NOT in markdown prose');
  lines.push('- ✅ **Read-only** - This tool never modifies source CSVs or inventory systems');
  lines.push('- ✅ **Never invents quantities** - All data from source CSVs only\n');

  lines.push('## Approval Gates\n');
  lines.push('Per `docs/automation/approval-gates.md`:\n');
  lines.push('- **H3** - Before using diff data for Perfect Water inventory adjustment decisions');
  lines.push('- **Grant approval required** - Before any stock writes or cost-of-sales changes based on this pack\n');

  lines.push('## Bot Reminders\n');
  lines.push('When referencing this pack in chat or reports:\n');
  lines.push('- ❌ **DO NOT** paste quantity figures or amounts from diff.md or diff.json into prose');
  lines.push('- ✅ **DO** refer to file paths: "See diff.md for item-level deltas"');
  lines.push('- ✅ **DO** report row/key counts: "5 items compared, 2 missing in stocktake"');
  lines.push('- ✅ **DO** flag patterns: "Rejected rows indicate missing Store column"\n');

  lines.push('## Review Checklist\n');
  lines.push('Before using outputs from this pack:\n');
  lines.push('- [ ] PACK.md index reviewed');
  lines.push('- [ ] diff.md opened and item-level deltas inspected');
  lines.push('- [ ] missing-keys.md checked for items in one side but not the other');
  lines.push('- [ ] DIGEST.md (if present) reviewed for rejected row patterns');
  lines.push('- [ ] manifest.json metadata validated');
  lines.push('- [ ] No quantities or amounts pasted into chat or prose');
  lines.push('- [ ] Perfect Water team consulted for inventory decisions\n');

  lines.push('## Safety Gates\n');
  lines.push('This tool will **exit 1** if:\n');
  lines.push('- Required inputs are missing (GRV/stocktake CSVs or prebuilt diff)');
  lines.push('- Sibling tools fail (pw-grv-csv-normalize, pw-stocktake-csv-normalize, pw-grv-vs-stocktake-diff)');
  lines.push('- Output directory cannot be created\n');

  lines.push('---\n');
  lines.push('**Approval text for inventory decisions:** `APPROVE INVENTORY RECON <pack-date>`\n');

  writeFileSync(join(outdir, 'APPROVAL.md'), lines.join('\n'));
}
