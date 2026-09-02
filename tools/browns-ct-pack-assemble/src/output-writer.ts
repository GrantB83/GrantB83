/**
 * Write pack outputs to filesystem
 */

import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, copyFileSync } from 'fs';
import { join, basename } from 'path';
import type { CliOptions, PackManifest, PackFile } from './types.js';
import { generatePackIndex } from './pack-generator.js';

export async function writeOutputs(
  options: CliOptions,
  packResults: {
    changeCheckOutput: string | null;
    dailyOpsOutput: string | null;
    guestCommsOutputs: string[];
    lateCheckinOutput: string | null;
    ranFlags: {
      ranAdapter: boolean;
      ranChangeCheck: boolean;
      ranDailyOps: boolean;
      ranGuestComms: boolean;
      ranLateCheckin: boolean;
    };
  }
): Promise<void> {
  // Create output directory
  mkdirSync(options.outdir, { recursive: true });
  
  const files: PackFile[] = [];
  
  // Determine sources
  const sourcesProvided = {
    bookings: !!options.bookings,
    beforeAfter: !!(options.before && options.after),
    facts: !!options.facts,
    guestBooking: !!options['guest-booking'],
  };
  
  // 1. Generate PACK.md
  const packContent = generatePackIndex(options, packResults.ranFlags, sourcesProvided);
  const packPath = join(options.outdir, 'PACK.md');
  writeFileSync(packPath, packContent, 'utf-8');
  files.push({
    filename: 'PACK.md',
    type: 'index',
    description: 'Pack index with timed checklist',
  });
  console.log('  ✓ Wrote PACK.md');
  
  // 2. Generate APPROVAL.md
  const approvalContent = generateApproval(options.day);
  const approvalPath = join(options.outdir, 'APPROVAL.md');
  writeFileSync(approvalPath, approvalContent, 'utf-8');
  files.push({
    filename: 'APPROVAL.md',
    type: 'approval',
    description: 'Safety gates and approval requirements',
  });
  console.log('  ✓ Wrote APPROVAL.md');
  
  // 3. Copy changes.md if change-check was run
  if (packResults.changeCheckOutput && existsSync(packResults.changeCheckOutput)) {
    const changesMdPath = join(packResults.changeCheckOutput, 'changes.md');
    if (existsSync(changesMdPath)) {
      copyFileSync(changesMdPath, join(options.outdir, 'changes.md'));
      files.push({
        filename: 'changes.md',
        type: 'changes',
        description: 'Booking change check output',
      });
      console.log('  ✓ Copied changes.md from change-check');
    }
  } else if (sourcesProvided.beforeAfter && !packResults.ranFlags.ranChangeCheck) {
    // Placeholder if before/after were provided but tool wasn't run
    const placeholderChanges = generateChangesPlaceholder();
    writeFileSync(join(options.outdir, 'changes.md'), placeholderChanges, 'utf-8');
    files.push({
      filename: 'changes.md',
      type: 'changes',
      description: 'Booking change check placeholder',
    });
    console.log('  ✓ Wrote changes.md placeholder');
  }
  
  // 4. Copy daily-ops.md if daily-ops was run
  if (packResults.dailyOpsOutput && existsSync(packResults.dailyOpsOutput)) {
    const dailyOpsPath = join(packResults.dailyOpsOutput, 'draft-team-group-whatsapp.txt');
    if (existsSync(dailyOpsPath)) {
      const content = readFileSync(dailyOpsPath, 'utf-8');
      writeFileSync(join(options.outdir, 'daily-ops.md'), content, 'utf-8');
      files.push({
        filename: 'daily-ops.md',
        type: 'daily-ops',
        description: 'Daily ops brief for team WhatsApp',
      });
      console.log('  ✓ Copied daily-ops.md');
    }
  }
  
  // 5. Copy guest draft files if guest-comms was run
  for (const guestCommsOutput of packResults.guestCommsOutputs) {
    if (existsSync(guestCommsOutput)) {
      const draftFiles = readdirSync(guestCommsOutput).filter(f => f.startsWith('draft-'));
      for (const draftFile of draftFiles) {
        const sourcePath = join(guestCommsOutput, draftFile);
        const destName = draftFile.replace('draft-', 'guest-');
        const destPath = join(options.outdir, destName);
        copyFileSync(sourcePath, destPath);
        files.push({
          filename: destName,
          type: 'guest-draft',
          description: `Guest welcome draft: ${basename(draftFile, '.md')}`,
        });
      }
      console.log(`  ✓ Copied ${draftFiles.length} guest draft(s)`);
    }
  }
  
  // 6. Copy late-checkin files if late-checkin was run
  if (packResults.lateCheckinOutput && existsSync(packResults.lateCheckinOutput)) {
    const queueMdPath = join(packResults.lateCheckinOutput, 'queue.md');
    const unknownTimeMdPath = join(packResults.lateCheckinOutput, 'unknown-time.md');
    
    if (existsSync(queueMdPath)) {
      copyFileSync(queueMdPath, join(options.outdir, 'queue.md'));
      files.push({
        filename: 'queue.md',
        type: 'guest-draft',
        description: 'Late check-in queue',
      });
      console.log('  ✓ Copied queue.md from late-checkin-queue');
    }
    
    if (existsSync(unknownTimeMdPath)) {
      copyFileSync(unknownTimeMdPath, join(options.outdir, 'unknown-time.md'));
      files.push({
        filename: 'unknown-time.md',
        type: 'guest-draft',
        description: 'Late check-in unknown times',
      });
      console.log('  ✓ Copied unknown-time.md from late-checkin-queue');
    }
  }
  
  // 7. Write manifest.json
  const manifest: PackManifest = {
    day: options.day,
    generatedAt: new Date().toISOString(),
    files,
    sources: {
      bookingsProvided: sourcesProvided.bookings,
      beforeAfterProvided: sourcesProvided.beforeAfter,
      factsProvided: sourcesProvided.facts,
      guestBookingProvided: sourcesProvided.guestBooking,
    },
    flags: packResults.ranFlags,
  };
  const manifestPath = join(options.outdir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  files.push({
    filename: 'manifest.json',
    type: 'manifest',
    description: 'Machine-readable pack inventory',
  });
  console.log('  ✓ Wrote manifest.json');
}

function generateApproval(day: string): string {
  const lines: string[] = [];
  
  lines.push('# Browns CT Pack Approval');
  lines.push(`Date: ${day}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('This CT pack contains DRAFT communications for The Browns guesthouse operations.');
  lines.push('');
  lines.push('**NEVER AUTO-SEND.** All communications require:');
  lines.push('1. Liana vet (guest-facing tone)');
  lines.push('2. Grant approval (final sign-off)');
  lines.push('3. CoS WhatsApp Admin (Coexistence of Service)');
  lines.push('');
  lines.push('## Hard Gates');
  lines.push('');
  lines.push('### Gate 1: Change Check Required');
  lines.push('');
  lines.push('Before sending any guest communications:');
  lines.push('- ✅ Review `changes.md` for last-minute booking changes');
  lines.push('- ✅ Verify guest names, dates, and suite assignments');
  lines.push('- ✅ Confirm no late cancellations or date changes');
  lines.push('');
  lines.push('### Gate 2: Never Auto-Send');
  lines.push('');
  lines.push('- ❌ **No WhatsApp API auto-send**');
  lines.push('- ❌ **No email auto-send**');
  lines.push('- ❌ **No calendar auto-updates**');
  lines.push('- ✅ Manual copy/paste to WhatsApp Admin - The Browns only');
  lines.push('');
  lines.push('### Gate 3: CoS Ownership');
  lines.push('');
  lines.push('WhatsApp sends MUST use Coexistence of Service:');
  lines.push('- CoS owns the live phone number');
  lines.push('- Bots/agents never register new Cloud API numbers');
  lines.push('- Manual paste workflow preserves CoS control');
  lines.push('');
  lines.push('### Gate 4: Never Invent Data');
  lines.push('');
  lines.push('If any draft contains invented data, DO NOT SEND:');
  lines.push('- ❌ No fabricated rates or amounts');
  lines.push('- ❌ No invented phone numbers');
  lines.push('- ❌ No guessed check-in times');
  lines.push('- ❌ No fabricated Wi-Fi passwords');
  lines.push('');
  lines.push('### Gate 5: Dullstroom / The Browns Only');
  lines.push('');
  lines.push('This pack is for:');
  lines.push('- Property: The Browns Luxury Guest Suites Dullstroom');
  lines.push('- NOT for Rivendell, other properties, or test data');
  lines.push('');
  lines.push('## Timed Send Checklist');
  lines.push('');
  lines.push('### 20:00 CT - Guest Drafts');
  lines.push('');
  lines.push('- [ ] Liana reviewed guest-*.md files');
  lines.push('- [ ] Grant approved final versions');
  lines.push('- [ ] Last-minute change check completed');
  lines.push('- [ ] Copy/paste to WhatsApp Admin - The Browns');
  lines.push('');
  lines.push('### 09:00 CT (next morning) - After-Hours Check-Ins');
  lines.push('');
  lines.push('- [ ] Review changes.md for overnight bookings');
  lines.push('- [ ] Confirm suite availability');
  lines.push('- [ ] Update team if coordination needed');
  lines.push('');
  lines.push('### 21:00 CT - Staff Ops Brief');
  lines.push('');
  lines.push('- [ ] Review daily-ops.md');
  lines.push('- [ ] Verify arrival/departure counts');
  lines.push('- [ ] Send to team WhatsApp group (if approved)');
  lines.push('');
  lines.push('## Approval Phrase');
  lines.push('');
  lines.push('When all gates passed and ready to send:');
  lines.push('');
  lines.push('```');
  lines.push(`APPROVE SEND CT PACK ${day}`);
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Remember:** DRAFT ONLY. Review every file before any send.');
  lines.push('');
  
  return lines.join('\\n');
}

function generateChangesPlaceholder(): string {
  return `# Booking Changes

No change-check tool output available.

Review booking changes manually before sending any guest communications.

## What to Check

- Last-minute cancellations
- Date changes
- Suite reassignments
- Late check-ins
- Special requests added after initial booking

---

**Manual verification required before any send.**
`;
}
