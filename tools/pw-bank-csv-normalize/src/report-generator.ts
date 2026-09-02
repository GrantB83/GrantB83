import { writeFileSync } from 'fs';
import { NormalizedRow, RejectedRow, NormalizationReport } from './types.js';
import { writeCSV } from './csv-parser.js';

export function generateReports(
  normalized: NormalizedRow[],
  rejected: RejectedRow[],
  missingFields: string[],
  report: NormalizationReport,
  outputDir: string
): void {
  // Write xero-bank-normalized.csv (strict 4-column format for loyverse-xero-recon)
  const xeroHeaders = ['Date', 'Reference', 'Amount', 'Description'];
  const xeroRows = normalized.map(row => ({
    Date: row.Date,
    Reference: row.Reference,
    Amount: row.Amount,
    Description: row.Description,
  }));
  const xeroCSV = writeCSV(xeroRows, xeroHeaders);
  writeFileSync(`${outputDir}/xero-bank-normalized.csv`, xeroCSV);

  // Write rejected.csv
  if (rejected.length > 0) {
    const rejectedHeaders = ['reason', ...Object.keys(rejected[0].originalRow)];
    const rejectedRows = rejected.map(r => ({
      reason: r.reason,
      ...r.originalRow,
    }));
    const rejectedCSV = writeCSV(rejectedRows, rejectedHeaders);
    writeFileSync(`${outputDir}/rejected.csv`, rejectedCSV);
  } else {
    writeFileSync(`${outputDir}/rejected.csv`, 'reason\n');
  }

  // Write missing-fields.md
  let missingFieldsMd = '# Missing Fields Report\n\n';
  if (missingFields.length > 0) {
    missingFieldsMd += 'The following fields were missing or unparseable in rejected rows:\n\n';
    missingFields.forEach(field => {
      missingFieldsMd += `- ${field}\n`;
    });
  } else {
    missingFieldsMd += 'No missing fields detected.\n';
  }
  writeFileSync(`${outputDir}/missing-fields.md`, missingFieldsMd);

  // Write APPROVAL.md
  const approvalMd = `# Approval Checklist

## Safety Verification

- ✅ **Offline operation** - No API calls, no network requests
- ✅ **No invented amounts** - All amounts come from source CSV
- ✅ **File-based** - All amounts stay in output files
- ✅ **Read-only** - No write-back to bank systems

## Output Files

- \`xero-bank-normalized.csv\` - Ready for loyverse-xero-recon --mode receipt
- \`rejected.csv\` - Rows that failed validation
- \`missing-fields.md\` - Fields that were missing
- \`report.md\` - Summary statistics
- \`manifest.json\` - Machine-readable metadata

## Review Steps

1. Check \`report.md\` for row counts
2. Review \`rejected.csv\` for any critical missing transactions
3. Verify \`xero-bank-normalized.csv\` has correct headers: Date, Reference, Amount, Description
4. Confirm amounts match source bank statement totals
5. Do not use this output if amounts were invented or modified

**Approval:** This normalization was performed offline with no invented data.

**Date:** ${report.timestamp}
`;
  writeFileSync(`${outputDir}/APPROVAL.md`, approvalMd);

  // Write manifest.json
  const manifest = {
    tool: 'pw-bank-csv-normalize',
    version: '1.0.0',
    inputFile: report.inputFile,
    profile: report.profile,
    delimiter: report.delimiter,
    timestamp: report.timestamp,
    totalRows: report.totalRows,
    normalizedRows: report.normalizedRows,
    rejectedRows: report.rejectedRows,
    outputFiles: [
      'xero-bank-normalized.csv',
      'rejected.csv',
      'missing-fields.md',
      'APPROVAL.md',
      'report.md',
      'manifest.json',
    ],
  };
  writeFileSync(`${outputDir}/manifest.json`, JSON.stringify(manifest, null, 2));

  // Write report.md
  const reportMd = `# Bank CSV Normalization Report

**Generated:** ${report.timestamp}

## Input

- **File:** ${report.inputFile}
- **Profile:** ${report.profile}
- **Delimiter:** ${report.delimiter === ',' ? 'comma' : report.delimiter === ';' ? 'semicolon' : 'tab'}

## Results

- **Total Rows:** ${report.totalRows}
- **Normalized Rows:** ${report.normalizedRows}
- **Rejected Rows:** ${report.rejectedRows}
- **Success Rate:** ${((report.normalizedRows / report.totalRows) * 100).toFixed(1)}%

## Output Files

- \`xero-bank-normalized.csv\` - ${report.normalizedRows} rows ready for loyverse-xero-recon
- \`rejected.csv\` - ${report.rejectedRows} rows that failed validation
- \`missing-fields.md\` - Field analysis
- \`APPROVAL.md\` - Safety checklist
- \`manifest.json\` - Machine-readable metadata

## Next Steps

1. Review \`rejected.csv\` for any critical missing transactions
2. Use \`xero-bank-normalized.csv\` with:
   \`\`\`bash
   cd tools/loyverse-xero-recon
   npm run recon -- --mode receipt --xero ${outputDir}/xero-bank-normalized.csv --loyverse <loyverse-export> --output <recon-output>
   \`\`\`
3. Check APPROVAL.md before using output

## Safety Note

✅ **No amounts were invented.** All amounts come directly from the source CSV.
`;
  writeFileSync(`${outputDir}/report.md`, reportMd);
}
