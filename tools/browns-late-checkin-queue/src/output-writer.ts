/**
 * Output file writer
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { QueueOutput, MissingField } from './types.js';

export function writeOutputs(
  queueOutput: QueueOutput,
  missingFields: MissingField[],
  outdir: string
): void {
  mkdirSync(outdir, { recursive: true });
  
  // Write queue.json
  const queueJson = {
    targetDay: queueOutput.targetDay,
    afterHourThreshold: queueOutput.afterHourThreshold,
    timezone: queueOutput.timezone,
    generatedAt: new Date().toISOString(),
    lateCheckins: queueOutput.lateCheckins,
    unknownTimeCheckins: queueOutput.unknownTimeCheckins,
  };
  writeFileSync(join(outdir, 'queue.json'), JSON.stringify(queueJson, null, 2), 'utf8');
  console.log(`✓ Wrote queue.json`);
  
  // Write queue.md
  const queueMd = generateQueueMarkdown(queueOutput);
  writeFileSync(join(outdir, 'queue.md'), queueMd, 'utf8');
  console.log(`✓ Wrote queue.md`);
  
  // Write unknown-time.md if any
  if (queueOutput.unknownTimeCheckins.length > 0) {
    const unknownMd = generateUnknownTimeMarkdown(queueOutput);
    writeFileSync(join(outdir, 'unknown-time.md'), unknownMd, 'utf8');
    console.log(`✓ Wrote unknown-time.md`);
  }
  
  // Write missing-fields.md
  const missingMd = generateMissingFieldsMarkdown(missingFields, queueOutput);
  writeFileSync(join(outdir, 'missing-fields.md'), missingMd, 'utf8');
  console.log(`✓ Wrote missing-fields.md`);
  
  // Write APPROVAL.md
  const approvalMd = generateApprovalMarkdown(queueOutput);
  writeFileSync(join(outdir, 'APPROVAL.md'), approvalMd, 'utf8');
  console.log(`✓ Wrote APPROVAL.md`);
  
  // Write manifest.json
  const manifest = {
    generatedAt: new Date().toISOString(),
    targetDay: queueOutput.targetDay,
    afterHourThreshold: queueOutput.afterHourThreshold,
    timezone: queueOutput.timezone,
    counts: {
      lateCheckins: queueOutput.lateCheckins.length,
      unknownTimeCheckins: queueOutput.unknownTimeCheckins.length,
      missingFields: missingFields.length,
    },
    files: [
      { name: 'queue.json', type: 'structured-queue' },
      { name: 'queue.md', type: 'human-readable-queue' },
      queueOutput.unknownTimeCheckins.length > 0 && { name: 'unknown-time.md', type: 'unknown-time-queue' },
      { name: 'missing-fields.md', type: 'data-quality' },
      { name: 'APPROVAL.md', type: 'approval-checklist' },
    ].filter(Boolean),
  };
  writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✓ Wrote manifest.json`);
}

function generateQueueMarkdown(queueOutput: QueueOutput): string {
  const lines: string[] = [];
  
  lines.push('# Late Check-In Queue');
  lines.push('');
  lines.push(`**Target Day:** ${queueOutput.targetDay}`);
  lines.push(`**After-Hours Threshold:** ${queueOutput.afterHourThreshold}:00 ${queueOutput.timezone}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  
  if (queueOutput.lateCheckins.length === 0) {
    lines.push('_No late check-ins scheduled for this day._');
  } else {
    lines.push(`## Late Check-Ins (${queueOutput.lateCheckins.length})`);
    lines.push('');
    
    queueOutput.lateCheckins.forEach((entry, index) => {
      lines.push(`### ${index + 1}. ${entry.guestName}`);
      lines.push(`- **Suite:** ${entry.suiteOrUnit}`);
      lines.push(`- **Check-In Date:** ${entry.checkInDate}`);
      if (entry.checkInTime) {
        lines.push(`- **ETA:** ${entry.checkInTime}`);
      }
      if (entry.guestPhone) {
        lines.push(`- **Phone:** ${entry.guestPhone}`);
      }
      if (entry.notes) {
        lines.push(`- **Notes:** ${entry.notes}`);
      }
      lines.push('');
    });
  }
  
  return lines.join('\n');
}

function generateUnknownTimeMarkdown(queueOutput: QueueOutput): string {
  const lines: string[] = [];
  
  lines.push('# Unknown Check-In Time Queue');
  lines.push('');
  lines.push(`**Target Day:** ${queueOutput.targetDay}`);
  lines.push('');
  lines.push('⚠️ **These bookings are missing check-in times. Confirm ETA before CoS WhatsApp pack.**');
  lines.push('');
  
  if (queueOutput.unknownTimeCheckins.length === 0) {
    lines.push('_No bookings with unknown check-in times._');
  } else {
    queueOutput.unknownTimeCheckins.forEach((entry, index) => {
      lines.push(`### ${index + 1}. ${entry.guestName}`);
      lines.push(`- **Suite:** ${entry.suiteOrUnit}`);
      lines.push(`- **Check-In Date:** ${entry.checkInDate}`);
      lines.push(`- **ETA:** ⚠️ MISSING`);
      if (entry.guestPhone) {
        lines.push(`- **Phone:** ${entry.guestPhone}`);
      }
      if (entry.notes) {
        lines.push(`- **Notes:** ${entry.notes}`);
      }
      lines.push('');
    });
  }
  
  return lines.join('\n');
}

function generateMissingFieldsMarkdown(
  missingFields: MissingField[],
  queueOutput: QueueOutput
): string {
  const lines: string[] = [];
  
  lines.push('# Missing Fields Report');
  lines.push('');
  lines.push(`**Target Day:** ${queueOutput.targetDay}`);
  lines.push('');
  
  if (missingFields.length === 0) {
    lines.push('✅ **All bookings have complete data for late check-in queue.**');
  } else {
    lines.push(`⚠️ **${missingFields.length} booking(s) have missing fields:**`);
    lines.push('');
    
    missingFields.forEach((entry, index) => {
      lines.push(`${index + 1}. **${entry.guestName}**`);
      lines.push(`   - Missing: ${entry.missingFields.join(', ')}`);
    });
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Note:** This tool never invents times, phone numbers, or rates.');
  lines.push('Resolve missing fields before including entries in the CoS WhatsApp pack.');
  
  return lines.join('\n');
}

function generateApprovalMarkdown(queueOutput: QueueOutput): string {
  const lines: string[] = [];
  
  lines.push('# Late Check-In Queue Approval');
  lines.push('');
  lines.push('**DRAFT ONLY - Manual CoS WhatsApp Send Required**');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Target Day:** ${queueOutput.targetDay}`);
  lines.push(`- **After-Hours Threshold:** ${queueOutput.afterHourThreshold}:00 ${queueOutput.timezone}`);
  lines.push(`- **Late Check-Ins:** ${queueOutput.lateCheckins.length}`);
  lines.push(`- **Unknown Time Check-Ins:** ${queueOutput.unknownTimeCheckins.length}`);
  lines.push('');
  lines.push('## Files Generated');
  lines.push('');
  lines.push('- `queue.json` - Structured queue data');
  lines.push('- `queue.md` - Human-readable numbered list');
  if (queueOutput.unknownTimeCheckins.length > 0) {
    lines.push('- `unknown-time.md` - Bookings without check-in times');
  }
  lines.push('- `missing-fields.md` - Data quality report');
  lines.push('- `APPROVAL.md` - This file');
  lines.push('- `manifest.json` - Run metadata');
  lines.push('');
  lines.push('## Pre-Send Checklist');
  lines.push('');
  lines.push('- [ ] Review `queue.md` for accuracy');
  lines.push('- [ ] Verify guest names and suite assignments');
  lines.push('- [ ] Confirm ETAs are correct (do not invent)');
  lines.push('- [ ] Check `unknown-time.md` and resolve missing ETAs');
  lines.push('- [ ] Review `missing-fields.md` and resolve data gaps');
  lines.push('- [ ] Ensure no invented times or phone numbers');
  lines.push('');
  lines.push('## Safety Rules');
  lines.push('');
  lines.push('1. ✅ **Dullstroom only** - The Browns Luxury Guest Suites Dullstroom');
  lines.push('2. ✅ **Never invent times** - Missing ETA stays missing');
  lines.push('3. ✅ **Never invent phone numbers** - Missing phone stays missing');
  lines.push('4. ✅ **Never invent rates** - Not in scope for this tool');
  lines.push('5. ⚠️ **CoS WhatsApp only** - Use Coexistence of Service for team sends');
  lines.push('6. ⚠️ **Manual send required** - Copy/paste to CoS WhatsApp after approval');
  lines.push('');
  lines.push('## Approval Phrase');
  lines.push('');
  lines.push('After reviewing all files and completing the checklist:');
  lines.push('');
  lines.push('```');
  lines.push(`APPROVE LATE CHECKIN QUEUE ${queueOutput.targetDay}`);
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Remember:** All outputs are **DRAFTS ONLY** for the 09:00 CT CoS check-in pack.');
  
  return lines.join('\n');
}
