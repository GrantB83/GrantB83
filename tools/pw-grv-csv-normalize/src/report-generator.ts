import { writeFileSync } from 'fs';
import { join } from 'path';
import { NormalizedGRV, RejectedRow, NormalizationReport } from './types.js';

export function generateReports(
  normalized: NormalizedGRV[],
  rejected: RejectedRow[],
  missingFields: { missingStore: number; missingItem: number; missingQty: number; missingUnit: number },
  report: NormalizationReport,
  outdir: string
): void {
  // Write normalized CSV
  const normalizedCSV = [
    'Store,SKU/Item,ReceivedQty,Unit,ReceivedAt,Supplier,DocNo,Notes',
    ...normalized.map(row =>
      [
        escapeCsvValue(row.Store),
        escapeCsvValue(row['SKU/Item']),
        escapeCsvValue(row.ReceivedQty),
        escapeCsvValue(row.Unit),
        escapeCsvValue(row.ReceivedAt),
        escapeCsvValue(row.Supplier),
        escapeCsvValue(row.DocNo),
        escapeCsvValue(row.Notes),
      ].join(',')
    ),
  ].join('\n');
  writeFileSync(join(outdir, 'grv-normalized.csv'), normalizedCSV);

  // Write rejected CSV
  const rejectedHeaders = rejected.length > 0 ? Object.keys(rejected[0].row) : [];
  const rejectedCSV = [
    [...rejectedHeaders, 'RejectionReason'].join(','),
    ...rejected.map(r =>
      [...rejectedHeaders.map(h => escapeCsvValue(r.row[h] || '')), escapeCsvValue(r.reason)].join(',')
    ),
  ].join('\n');
  writeFileSync(join(outdir, 'rejected.csv'), rejectedCSV);

  // Write missing-fields.md
  const missingFieldsMd = `# Missing Fields Analysis

This report shows rows that were rejected due to missing or blank required fields.

## Summary

- **Missing Store:** ${missingFields.missingStore} rows
- **Missing SKU/Item:** ${missingFields.missingItem} rows
- **Missing ReceivedQty:** ${missingFields.missingQty} rows
- **Missing Unit:** ${missingFields.missingUnit} rows

## Required Fields

All GRV rows must have:
- **Store** - Store/location name
- **SKU/Item** - SKU or item name
- **ReceivedQty** - Received quantity (must be parseable number)
- **Unit** - Unit of measure

## Action Required

Review \`rejected.csv\` for full details. Rows with blank or unparseable quantities are never invented.
`;
  writeFileSync(join(outdir, 'missing-fields.md'), missingFieldsMd);

  // Write report.md
  const reportMd = `# GRV Normalization Report

**Date:** ${report.timestamp}  
**Input:** ${report.inputFile}  
**Profile:** ${report.profile}  
**Delimiter:** ${report.delimiter}

## Summary

- **Total Rows:** ${report.totalRows}
- **Normalized:** ${report.normalizedRows}
- **Rejected:** ${report.rejectedRows}

## Output Files

- \`grv-normalized.csv\` - Standard schema with Store, SKU/Item, ReceivedQty, Unit, ReceivedAt, Supplier, DocNo, Notes
- \`rejected.csv\` - Rows that failed validation
- \`missing-fields.md\` - Missing field analysis
- \`APPROVAL.md\` - Safety checklist
- \`manifest.json\` - Machine-readable metadata

## Safety

✅ **Never invents quantities** - Blank/unparseable → rejected.csv  
✅ **Offline only** - No API calls  
✅ **File-based** - All amounts stay in files
`;
  writeFileSync(join(outdir, 'report.md'), reportMd);

  // Write APPROVAL.md
  const approvalMd = `# GRV Normalization Approval

**Tool:** pw-grv-csv-normalize  
**Date:** ${report.timestamp}  
**Input:** ${report.inputFile}  
**Output:** ${report.outputDir}

## Summary

- **Normalized:** ${report.normalizedRows} rows
- **Rejected:** ${report.rejectedRows} rows

## Safety Checklist

- [ ] Verify \`grv-normalized.csv\` headers match standard schema
- [ ] Review \`rejected.csv\` for any unexpected rejections
- [ ] Check \`missing-fields.md\` for data quality issues
- [ ] Confirm no quantities were invented (rejected rows have blank/unparseable Qty)
- [ ] Verify Store, Supplier, DocNo values are correct

## Schema

**Standard Output Columns:**

1. **Store** - Store/location name
2. **SKU/Item** - SKU or item name
3. **ReceivedQty** - Received quantity (number only, never invented)
4. **Unit** - Unit of measure
5. **ReceivedAt** - Date received (YYYY-MM-DD or original format)
6. **Supplier** - Supplier name
7. **DocNo** - Document/GRV number
8. **Notes** - Additional notes from unmapped columns

## H-Gates

This tool is **offline only** and generates drafts. No automatic Drive uploads or sheet writes.

- **H3** - Before any Drive file moves
- **H2** - Before any Google Sheet writes

## Next Steps

1. Review all output files
2. Verify rejected rows are correct
3. Approve for use in Perfect Water inventory reconciliation
4. Keep amounts in files, never paste into chat

---

**Perfect Water / CoS Inventory Operations**  
Never invents quantities. Offline only.
`;
  writeFileSync(join(outdir, 'APPROVAL.md'), approvalMd);

  // Write manifest.json
  const manifest = {
    tool: 'pw-grv-csv-normalize',
    version: '1.0.0',
    timestamp: report.timestamp,
    input: report.inputFile,
    output: report.outputDir,
    profile: report.profile,
    delimiter: report.delimiter,
    summary: {
      totalRows: report.totalRows,
      normalizedRows: report.normalizedRows,
      rejectedRows: report.rejectedRows,
    },
    missingFields,
    files: {
      normalized: 'grv-normalized.csv',
      rejected: 'rejected.csv',
      missingFieldsReport: 'missing-fields.md',
      report: 'report.md',
      approval: 'APPROVAL.md',
      manifest: 'manifest.json',
    },
  };
  writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
