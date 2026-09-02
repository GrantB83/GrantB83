import * as fs from 'fs';
import * as path from 'path';
import { RateRecord, PromoRecord, WorksheetRow, WorksheetOutput } from './types.js';

export function generateWorksheet(
  rates: RateRecord[],
  promos: PromoRecord[]
): WorksheetOutput {
  const worksheetRows: WorksheetRow[] = [];
  const warnings: string[] = [];
  let hasIncompletePricing = false;

  for (const rate of rates) {
    if (!rate.nightlyRate) {
      hasIncompletePricing = true;
      warnings.push(`Missing rate for ${rate.suiteOrUnit} / ${rate.seasonOrLabel}`);
    }

    if (promos.length === 0) {
      worksheetRows.push({
        suiteOrUnit: rate.suiteOrUnit,
        seasonOrLabel: rate.seasonOrLabel,
        currency: rate.currency,
        baseRate: rate.nightlyRate ? rate.nightlyRate.toFixed(2) : '',
        minStay: rate.minStay,
        occupancy: rate.occupancy,
        notes: rate.notes,
        flags: rate.nightlyRate ? '' : 'MISSING_BASE_RATE',
      });
    } else {
      for (const promo of promos) {
        const hasDiscount = promo.discountPercent !== undefined || promo.discountAmount !== undefined;
        
        let promoRate: string | undefined = undefined;
        let discountType: string | undefined = undefined;
        let discountValue: string | undefined = undefined;
        let flags: string | undefined = undefined;

        if (!hasDiscount) {
          flags = 'DRAFT_NEEDS_RATE';
          hasIncompletePricing = true;
          warnings.push(`Promo "${promo.name}" missing discount value`);
        } else if (rate.nightlyRate) {
          if (promo.discountPercent !== undefined) {
            discountType = 'percent';
            discountValue = promo.discountPercent.toString();
            const discountedAmount = rate.nightlyRate * (1 - promo.discountPercent / 100);
            promoRate = discountedAmount.toFixed(2);
          } else if (promo.discountAmount !== undefined) {
            discountType = 'amount';
            discountValue = promo.discountAmount.toFixed(2);
            const discountedAmount = rate.nightlyRate - promo.discountAmount;
            promoRate = Math.max(0, discountedAmount).toFixed(2);
          }
        } else {
          flags = 'MISSING_BASE_RATE';
        }

        worksheetRows.push({
          suiteOrUnit: rate.suiteOrUnit,
          seasonOrLabel: rate.seasonOrLabel,
          currency: rate.currency,
          baseRate: rate.nightlyRate ? rate.nightlyRate.toFixed(2) : '',
          promoName: promo.name,
          promoStartDate: promo.startDate,
          promoEndDate: promo.endDate,
          discountType,
          discountValue,
          promoRate,
          minStay: rate.minStay,
          occupancy: rate.occupancy,
          notes: rate.notes,
          flags,
        });
      }
    }
  }

  return {
    worksheetRows,
    warnings,
    hasIncompletePricing,
  };
}

export function writeWorksheetFiles(
  output: WorksheetOutput,
  outputDir: string
): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  writeWorksheetCSV(output.worksheetRows, path.join(outputDir, 'worksheet.csv'));
  writeWorksheetMD(output.worksheetRows, path.join(outputDir, 'worksheet.md'));
  writeApprovalMD(output, path.join(outputDir, 'APPROVAL.md'));
  writeManifestJSON(output, path.join(outputDir, 'manifest.json'));
}

function writeWorksheetCSV(rows: WorksheetRow[], filePath: string): void {
  const headers = [
    'Suite/Unit',
    'Season/Label',
    'Currency',
    'Base Rate',
    'Promo Name',
    'Promo Start',
    'Promo End',
    'Discount Type',
    'Discount Value',
    'Promo Rate',
    'Min Stay',
    'Occupancy',
    'Notes',
    'Flags',
  ];

  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = [
      escapeCsv(row.suiteOrUnit),
      escapeCsv(row.seasonOrLabel),
      escapeCsv(row.currency),
      row.baseRate || '',
      escapeCsv(row.promoName || ''),
      row.promoStartDate || '',
      row.promoEndDate || '',
      row.discountType || '',
      row.discountValue || '',
      row.promoRate || '',
      row.minStay || '',
      row.occupancy || '',
      escapeCsv(row.notes || ''),
      row.flags || '',
    ];
    lines.push(values.join(','));
  }

  fs.writeFileSync(filePath, lines.join('\n'));
}

function writeWorksheetMD(rows: WorksheetRow[], filePath: string): void {
  const lines = [
    '# Browns OTA Rate Worksheet',
    '',
    '**Property:** Dullstroom The Browns Luxury Guest Suites',
    '',
    '## Instructions',
    '',
    'This checklist guides Nightsbridge and Booking.com setup. For each entry:',
    '',
    '1. Log into Nightsbridge',
    '2. Navigate to the relevant suite/unit',
    '3. Enter the base rate for the season',
    '4. If a promo is listed, create the promotion with the specified dates and discount',
    '5. Check the "Flags" column for missing data',
    '',
    '## Rate Entries',
    '',
  ];

  for (const row of rows) {
    lines.push(`### ${row.suiteOrUnit} - ${row.seasonOrLabel}`);
    lines.push('');
    lines.push(`- **Currency:** ${row.currency}`);
    lines.push(`- **Base Rate:** ${row.baseRate || '⚠️ MISSING'}`);
    
    if (row.promoName) {
      lines.push(`- **Promo Name:** ${row.promoName}`);
      lines.push(`- **Promo Period:** ${row.promoStartDate || '?'} to ${row.promoEndDate || '?'}`);
      lines.push(`- **Discount:** ${row.discountValue || '⚠️ MISSING'} ${row.discountType || ''}`);
      lines.push(`- **Promo Rate:** ${row.promoRate || '⚠️ CANNOT CALCULATE'}`);
    }
    
    if (row.minStay) {
      lines.push(`- **Min Stay:** ${row.minStay}`);
    }
    
    if (row.occupancy) {
      lines.push(`- **Occupancy:** ${row.occupancy}`);
    }
    
    if (row.notes) {
      lines.push(`- **Notes:** ${row.notes}`);
    }
    
    if (row.flags) {
      lines.push(`- **⚠️ Flags:** ${row.flags}`);
    }
    
    lines.push('');
  }

  fs.writeFileSync(filePath, lines.join('\n'));
}

function writeApprovalMD(output: WorksheetOutput, filePath: string): void {
  const lines = [
    '# APPROVAL REQUIRED',
    '',
    '**Property:** Dullstroom The Browns Luxury Guest Suites',
    '**Generated:** ' + new Date().toISOString(),
    '',
    '## Summary',
    '',
    `- Total worksheet entries: ${output.worksheetRows.length}`,
    `- Incomplete pricing: ${output.hasIncompletePricing ? 'YES ⚠️' : 'No'}`,
    `- Warnings: ${output.warnings.length}`,
    '',
  ];

  if (output.warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const warning of output.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  lines.push('## Required Actions');
  lines.push('');
  lines.push('**Before applying these rates to Nightsbridge or Booking.com:**');
  lines.push('');
  lines.push('1. Review `worksheet.md` for completeness');
  lines.push('2. Verify all rates match approved rate card');
  lines.push('3. Confirm promo periods and discounts are correct');
  lines.push('4. Resolve any flagged entries');
  lines.push('5. Grant Brown must explicitly approve these changes');
  lines.push('');
  lines.push('## Approval');
  lines.push('');
  lines.push('- [ ] Rates verified against approved rate card');
  lines.push('- [ ] Promos verified');
  lines.push('- [ ] All warnings addressed');
  lines.push('- [ ] Approved by: _________________ Date: _________');
  lines.push('');
  lines.push('**DO NOT apply to Nightsbridge or Booking.com without approval.**');
  lines.push('');

  fs.writeFileSync(filePath, lines.join('\n'));
}

function writeManifestJSON(output: WorksheetOutput, filePath: string): void {
  const manifest = {
    generated: new Date().toISOString(),
    property: 'Dullstroom The Browns Luxury Guest Suites',
    totalEntries: output.worksheetRows.length,
    hasIncompletePricing: output.hasIncompletePricing,
    warningCount: output.warnings.length,
    warnings: output.warnings,
    files: [
      'worksheet.csv',
      'worksheet.md',
      'APPROVAL.md',
      'manifest.json',
    ],
  };

  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
