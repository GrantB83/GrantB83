import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BookingRecord, MissingField, ManifestEntry } from './types.js';

export function writeOutputs(
  bookings: BookingRecord[],
  missingFields: MissingField[],
  outdir: string,
  targetDay: string
): void {
  mkdirSync(outdir, { recursive: true });
  
  const manifest: ManifestEntry[] = [];
  
  const bookingsJsonPath = join(outdir, 'bookings.json');
  writeFileSync(
    bookingsJsonPath,
    JSON.stringify(bookings, null, 2),
    'utf-8'
  );
  manifest.push({
    filename: 'bookings.json',
    type: 'bookings-json',
    recordCount: bookings.length
  });
  
  const bookingsCsvPath = join(outdir, 'bookings.csv');
  const csvLines = [
    'guestName,suiteOrUnit,status,checkInDate,checkOutDate,lateCheckIn,adults,children,notes'
  ];
  
  for (const booking of bookings) {
    const row = [
      escapeCSV(booking.guestName),
      escapeCSV(booking.suiteOrUnit),
      escapeCSV(booking.status),
      escapeCSV(booking.checkInDate || ''),
      escapeCSV(booking.checkOutDate || ''),
      booking.lateCheckIn ? 'true' : 'false',
      booking.adults?.toString() || '',
      booking.children?.toString() || '',
      escapeCSV(booking.notes || '')
    ];
    csvLines.push(row.join(','));
  }
  
  writeFileSync(bookingsCsvPath, csvLines.join('\n'), 'utf-8');
  manifest.push({
    filename: 'bookings.csv',
    type: 'bookings-csv',
    recordCount: bookings.length
  });
  
  const missingFieldsPath = join(outdir, 'missing-fields.md');
  const missingFieldsContent = generateMissingFieldsMarkdown(missingFields);
  writeFileSync(missingFieldsPath, missingFieldsContent, 'utf-8');
  manifest.push({
    filename: 'missing-fields.md',
    type: 'missing-fields'
  });
  
  const approvalPath = join(outdir, 'APPROVAL.md');
  const approvalContent = generateApprovalMarkdown(bookings, missingFields, targetDay);
  writeFileSync(approvalPath, approvalContent, 'utf-8');
  manifest.push({
    filename: 'APPROVAL.md',
    type: 'approval'
  });
  
  const manifestPath = join(outdir, 'manifest.json');
  writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );
  manifest.push({
    filename: 'manifest.json',
    type: 'manifest'
  });
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateMissingFieldsMarkdown(missingFields: MissingField[]): string {
  let content = '# Missing Fields Report\n\n';
  
  if (missingFields.length === 0) {
    content += '✅ No missing fields detected. All rows have complete required data.\n';
    return content;
  }
  
  content += `⚠️  **${missingFields.length} field(s) missing or could not be mapped.**\n\n`;
  content += '| Row | Guest | Field | Reason |\n';
  content += '|-----|-------|-------|--------|\n';
  
  for (const missing of missingFields) {
    content += `| ${missing.row} | ${missing.guest} | \`${missing.field}\` | ${missing.reason} |\n`;
  }
  
  content += '\n## Action Required\n\n';
  content += '1. Review the rows listed above in your source file\n';
  content += '2. Fill in missing data manually\n';
  content += '3. Re-run the adapter\n\n';
  content += '**Do NOT proceed with incomplete bookings to browns-daily-ops-brief until resolved.**\n';
  
  return content;
}

function generateApprovalMarkdown(
  bookings: BookingRecord[],
  missingFields: MissingField[],
  targetDay: string
): string {
  const arrivals = bookings.filter(b => b.status === 'arriving').length;
  const inhouse = bookings.filter(b => b.status === 'inhouse').length;
  const departures = bookings.filter(b => b.status === 'departing').length;
  const blank = bookings.filter(b => b.status === '').length;
  
  let content = '# Approval Checklist\n\n';
  content += `**Generated:** ${new Date().toISOString()}\n`;
  content += `**Target Date:** ${targetDay}\n\n`;
  content += '## Summary\n\n';
  content += `- **Total bookings:** ${bookings.length}\n`;
  content += `- **Arrivals:** ${arrivals}\n`;
  content += `- **In-house:** ${inhouse}\n`;
  content += `- **Departures:** ${departures}\n`;
  
  if (blank > 0) {
    content += `- **⚠️  Blank status:** ${blank} (missing dates or outside target day)\n`;
  }
  
  if (missingFields.length > 0) {
    content += `- **⚠️  Missing fields:** ${missingFields.length}\n`;
  }
  
  content += '\n## Generated Files\n\n';
  content += '- `bookings.json` - Feed into browns-daily-ops-brief\n';
  content += '- `bookings.csv` - Human-readable spreadsheet view\n';
  content += '- `missing-fields.md` - Issues to resolve\n';
  content += '- `manifest.json` - File inventory\n\n';
  content += '## Pre-Use Checklist\n\n';
  content += '- [ ] Review `missing-fields.md` - resolve issues before proceeding\n';
  content += '- [ ] Verify guest names are spelled correctly\n';
  content += '- [ ] Verify suite assignments are correct\n';
  content += '- [ ] Check dates match Nightsbridge source\n';
  content += '- [ ] Review late check-in flags\n';
  content += '- [ ] Confirm notes captured accurately\n\n';
  content += '## Safety Rules\n\n';
  content += '✅ **This adapter is OFFLINE ONLY**\n';
  content += '- No Nightsbridge API writes\n';
  content += '- No invented rates or amounts\n';
  content += '- No WhatsApp or email sends\n';
  content += '- Draft outputs only\n\n';
  content += '✅ **Next step: browns-daily-ops-brief**\n';
  content += '```bash\n';
  content += `npm run brief -- --day ${targetDay} --bookings bookings.json --outdir reports/\n`;
  content += '```\n\n';
  content += '## Approval\n\n';
  content += 'Once verified, you may proceed to the daily ops brief generation.\n\n';
  content += '**Property:** Dullstroom The Browns Luxury Guest Suites only.\n';
  
  return content;
}
