import { writeFileSync } from 'fs';
import { join } from 'path';
import { NormalizedRow, RejectedRow, NormalizationReport } from './types.js';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateReports(
  normalized: NormalizedRow[],
  rejected: RejectedRow[],
  missingFields: string[],
  report: NormalizationReport,
  outdir: string
): void {
  // 1. stocktake-normalized.csv
  const normalizedHeaders = ['Store', 'SKU/Item', 'CountedQty', 'Unit', 'CountedAt', 'Notes'];
  const normalizedLines = [normalizedHeaders.join(',')];
  for (const row of normalized) {
    const values = [
      escapeCSV(row.Store),
      escapeCSV(row['SKU/Item']),
      escapeCSV(row.CountedQty),
      escapeCSV(row.Unit),
      escapeCSV(row.CountedAt || ''),
      escapeCSV(row.Notes || ''),
    ];
    normalizedLines.push(values.join(','));
  }
  writeFileSync(join(outdir, 'stocktake-normalized.csv'), normalizedLines.join('\n'));

  // 2. rejected.csv
  if (rejected.length > 0) {
    const rejectedLines = ['reason,' + Object.keys(rejected[0].originalRow).join(',')];
    for (const r of rejected) {
      const values = [escapeCSV(r.reason)];
      for (const key of Object.keys(rejected[0].originalRow)) {
        values.push(escapeCSV(r.originalRow[key] || ''));
      }
      rejectedLines.push(values.join(','));
    }
    writeFileSync(join(outdir, 'rejected.csv'), rejectedLines.join('\n'));
  } else {
    writeFileSync(join(outdir, 'rejected.csv'), 'No rejected rows\n');
  }

  // 3. missing-fields.md
  const missingFieldsMd = `# Missing Fields Report

The following fields were missing or unparseable in rejected rows:

${missingFields.length > 0 ? missingFields.map(f => `- ${f}`).join('\n') : '(none)'}
`;
  writeFileSync(join(outdir, 'missing-fields.md'), missingFieldsMd);

  // 4. APPROVAL.md
  const approvalMd = `# Stocktake CSV Normalization - APPROVAL

## Safety Checklist

- [x] **Offline operation** - No API calls, no network requests
- [x] **No invented quantities** - All counted quantities are from source CSV only
- [x] **File-based** - All quantities stay in CSV files, never in chat
- [x] **Read-only** - No write-back to Loyverse or inventory systems
- [x] **Blank/unparseable → rejected** - Never fabricates missing data

## Next Steps

1. Review \`rejected.csv\` for critical missing items
2. Review \`missing-fields.md\` for data quality issues
3. Use \`stocktake-normalized.csv\` for reconciliation
4. Keep amounts in files, not chat

## Approval

- [ ] Reviewed rejected rows
- [ ] Confirmed no invented quantities
- [ ] Ready to use normalized output

**Approved by:** ___________  
**Date:** ___________
`;
  writeFileSync(join(outdir, 'APPROVAL.md'), approvalMd);

  // 5. manifest.json
  const manifestJson = JSON.stringify(
    {
      tool: 'pw-stocktake-csv-normalize',
      version: '1.0.0',
      inputFile: report.inputFile,
      profile: report.profile,
      delimiter: report.delimiter,
      timestamp: report.timestamp,
      totalRows: report.totalRows,
      normalizedRows: report.normalizedRows,
      rejectedRows: report.rejectedRows,
    },
    null,
    2
  );
  writeFileSync(join(outdir, 'manifest.json'), manifestJson);

  // 6. report.md
  const successRate = report.totalRows > 0 ? ((report.normalizedRows / report.totalRows) * 100).toFixed(1) : '0.0';
  const reportMd = `# Stocktake CSV Normalization Report

## Results

- **Total Rows:** ${report.totalRows}
- **Normalized Rows:** ${report.normalizedRows}
- **Rejected Rows:** ${report.rejectedRows}
- **Success Rate:** ${successRate}%

## Profile

- **Input File:** ${report.inputFile}
- **Profile:** ${report.profile}
- **Delimiter:** ${report.delimiter}
- **Timestamp:** ${report.timestamp}

## Next Steps

1. Review \`rejected.csv\` for critical missing items
2. Check \`missing-fields.md\` for data quality patterns
3. Use \`stocktake-normalized.csv\` for store reconciliation

## Output Files

- \`stocktake-normalized.csv\` - Standard schema ready for recon
- \`rejected.csv\` - Rows with validation issues
- \`missing-fields.md\` - Missing field analysis
- \`APPROVAL.md\` - Safety checklist
- \`manifest.json\` - Machine-readable metadata
- \`report.md\` - This summary (row counts only)

## Safety Note

⚠️ This tool never invents quantities. Blank or unparseable quantities are rejected. All amounts stay in files, not chat.
`;
  writeFileSync(join(outdir, 'report.md'), reportMd);
}
