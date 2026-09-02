/**
 * Generate output files from extracted inquiry data
 */

import * as fs from 'fs';
import * as path from 'path';
import { ExtractionResult, Manifest } from './types.js';

/**
 * Generate booking.json file content
 */
function generateBookingJson(result: ExtractionResult): string {
  return JSON.stringify(result.booking, null, 2);
}

/**
 * Generate quote.json file content
 */
function generateQuoteJson(result: ExtractionResult): string {
  return JSON.stringify(result.quote, null, 2);
}

/**
 * Generate missing-fields.md checklist
 */
function generateMissingFieldsMarkdown(result: ExtractionResult): string {
  const lines: string[] = [
    '# Missing Fields Checklist',
    '',
    'The following fields could not be extracted from the inquiry text and need to be filled manually:',
    '',
  ];
  
  if (result.missingFields.length === 0) {
    lines.push('✅ All required fields were extracted successfully!');
    lines.push('');
    lines.push('However, please review the extracted data for accuracy.');
  } else {
    for (const field of result.missingFields) {
      lines.push(`- [ ] ${field}`);
    }
  }
  
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This tool does NOT invent rates or calculate amounts');
  lines.push('- Amounts are only included if explicitly present in the inquiry text');
  lines.push('- Review all extracted fields before using with downstream tools');
  lines.push('- For Dullstroom Browns only');
  
  return lines.join('\n');
}

/**
 * Generate APPROVAL.md review document
 */
function generateApprovalMarkdown(result: ExtractionResult, mode: string): string {
  const lines: string[] = [
    '# Browns Inquiry Intake - APPROVAL REQUIRED',
    '',
    '⚠️ **REVIEW EXTRACTED FIELDS BEFORE USING DOWNSTREAM TOOLS**',
    '',
    '## Extraction Results',
    '',
    '### Guest Information',
    `- **Name**: ${result.booking.guestName || '❌ NOT FOUND'}`,
    `- **Channel**: ${result.booking.channel || 'unknown'}`,
    '',
    '### Dates',
    `- **Check-in**: ${result.booking.checkInDate || '❌ NOT FOUND'}`,
    `- **Check-out**: ${result.booking.checkOutDate || '❌ NOT FOUND'}`,
    '',
    '### Accommodation',
    `- **Suite/Unit**: ${result.booking.suiteOrUnit || '❌ NOT FOUND'}`,
    `- **Adults**: ${result.booking.adults ?? '❌ NOT FOUND'}`,
    `- **Children**: ${result.booking.children ?? 'None'}`,
    `- **Late Check-in**: ${result.booking.lateCheckIn ? 'YES' : 'No'}`,
    '',
    '### Financial Information',
  ];
  
  if (result.booking.currency) {
    lines.push(`- **Currency**: ${result.booking.currency}`);
  }
  if (result.booking.depositAmount !== undefined) {
    lines.push(`- **Deposit**: ${result.booking.currency || ''} ${result.booking.depositAmount}`);
  } else {
    lines.push('- **Deposit**: ❌ NOT FOUND (no invented amounts)');
  }
  if (result.booking.totalAmount !== undefined) {
    lines.push(`- **Total**: ${result.booking.currency || ''} ${result.booking.totalAmount}`);
  } else {
    lines.push('- **Total**: ❌ NOT FOUND (no invented amounts)');
  }
  if (result.quote.quoteAmount !== undefined) {
    lines.push(`- **Quote Amount**: ${result.quote.currency || ''} ${result.quote.quoteAmount}`);
  } else {
    lines.push('- **Quote Amount**: ❌ NOT FOUND (no invented amounts)');
  }
  
  lines.push('');
  lines.push('## Safety Notes');
  lines.push('');
  lines.push('- ✅ Offline extraction only - no API calls made');
  lines.push('- ✅ No rates were invented or calculated');
  lines.push('- ✅ Amounts included ONLY if explicitly stated in inquiry');
  lines.push('- ⚠️ This tool does NOT send messages to WhatsApp or Email');
  lines.push('- ⚠️ This tool does NOT connect to Nightsbridge or other booking systems');
  lines.push('- ⚠️ For Dullstroom Browns only');
  lines.push('');
  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review all extracted fields above');
  lines.push('2. Fill in missing fields using `missing-fields.md` checklist');
  lines.push('3. Verify amounts are correct (if present)');
  lines.push('4. Use `booking.json` with browns-guest-comms-draft or daily-ops tools');
  
  if (mode === 'quote' || mode === 'both') {
    lines.push('5. Use `quote.json` with browns-quote-invoice-draft tool');
  }
  
  lines.push('');
  lines.push('## Output Files');
  lines.push('');
  if (mode === 'booking' || mode === 'both') {
    lines.push('- `booking.json` - Compatible with browns-guest-comms-draft / daily-ops');
  }
  if (mode === 'quote' || mode === 'both') {
    lines.push('- `quote.json` - Compatible with browns-quote-invoice-draft');
  }
  lines.push('- `missing-fields.md` - Checklist of fields to fill manually');
  lines.push('- `manifest.json` - Metadata about this extraction');
  
  return lines.join('\n');
}

/**
 * Generate manifest.json
 */
function generateManifest(
  result: ExtractionResult,
  mode: string,
  sourcePath: string,
  outputDir: string
): Manifest {
  const manifest: Manifest = {
    generated_at: new Date().toISOString(),
    mode,
    source: sourcePath,
    outputs: {
      missing_fields: path.join(outputDir, 'missing-fields.md'),
      approval: path.join(outputDir, 'APPROVAL.md'),
      manifest: path.join(outputDir, 'manifest.json'),
    },
  };
  
  if (mode === 'booking' || mode === 'both') {
    manifest.outputs.booking = path.join(outputDir, 'booking.json');
  }
  if (mode === 'quote' || mode === 'both') {
    manifest.outputs.quote = path.join(outputDir, 'quote.json');
  }
  
  return manifest;
}

/**
 * Generate all output files
 */
export async function generateOutputs(
  result: ExtractionResult,
  options: {
    mode: string;
    sourcePath: string;
    outdir: string;
  }
): Promise<string> {
  const { mode, sourcePath, outdir } = options;
  
  // Create output directory
  const timestamp = new Date().toISOString().split('T')[0];
  const outputDir = path.resolve(outdir || `./out/intake-${timestamp}`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate and write files
  if (mode === 'booking' || mode === 'both') {
    const bookingJson = generateBookingJson(result);
    fs.writeFileSync(path.join(outputDir, 'booking.json'), bookingJson, 'utf-8');
  }
  
  if (mode === 'quote' || mode === 'both') {
    const quoteJson = generateQuoteJson(result);
    fs.writeFileSync(path.join(outputDir, 'quote.json'), quoteJson, 'utf-8');
  }
  
  const missingFieldsMd = generateMissingFieldsMarkdown(result);
  fs.writeFileSync(path.join(outputDir, 'missing-fields.md'), missingFieldsMd, 'utf-8');
  
  const approvalMd = generateApprovalMarkdown(result, mode);
  fs.writeFileSync(path.join(outputDir, 'APPROVAL.md'), approvalMd, 'utf-8');
  
  const manifest = generateManifest(result, mode, sourcePath, outputDir);
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );
  
  return outputDir;
}
