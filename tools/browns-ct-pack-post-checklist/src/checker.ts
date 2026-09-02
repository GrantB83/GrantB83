import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { PackFiles, CheckResult } from './types.js';

export function validatePackStructure(packPath: string): PackFiles {
  const packMd = join(packPath, 'PACK.md');
  const approvalMd = join(packPath, 'APPROVAL.md');

  if (!existsSync(packMd)) {
    throw new Error(`PACK.md not found in pack directory: ${packPath}`);
  }

  if (!existsSync(approvalMd)) {
    throw new Error(`APPROVAL.md not found in pack directory: ${packPath}`);
  }

  const dailyOpsMd = join(packPath, 'daily-ops.md');
  const changesMd = join(packPath, 'changes.md');
  const queueMd = join(packPath, 'queue.md');
  const unknownTimeMd = join(packPath, 'unknown-time.md');

  const guestFiles: string[] = [];
  const welcomeFiles: string[] = [];

  try {
    const files = readdirSync(packPath);
    for (const file of files) {
      if (file.startsWith('guest-') && file.endsWith('.md')) {
        guestFiles.push(join(packPath, file));
      }
      if (file.startsWith('welcome-') && file.endsWith('.md')) {
        welcomeFiles.push(join(packPath, file));
      }
    }
  } catch (err: any) {
    throw new Error(`Error reading pack directory: ${err.message}`);
  }

  return {
    packMd,
    approvalMd,
    dailyOpsMd: existsSync(dailyOpsMd) ? dailyOpsMd : undefined,
    changesMd: existsSync(changesMd) ? changesMd : undefined,
    queueMd: existsSync(queueMd) ? queueMd : undefined,
    unknownTimeMd: existsSync(unknownTimeMd) ? unknownTimeMd : undefined,
    guestFiles,
    welcomeFiles,
  };
}

export function checkRequiredFilesPresent(files: PackFiles): CheckResult {
  try {
    if (!existsSync(files.packMd)) {
      return {
        passed: false,
        message: 'Missing required file: PACK.md',
      };
    }

    if (!existsSync(files.approvalMd)) {
      return {
        passed: false,
        message: 'Missing required file: APPROVAL.md',
      };
    }

    return {
      passed: true,
      message: 'Required files present (PACK.md, APPROVAL.md)',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error checking files: ${err.message}`,
    };
  }
}

export function checkPackTimelineReferences(files: PackFiles, slot?: string): CheckResult {
  try {
    const packContent = readFileSync(files.packMd, 'utf-8');
    const warnings: string[] = [];

    const hasGuestDraftsRef = packContent.includes('guest-') || packContent.toLowerCase().includes('welcome');
    const hasOpsRef = packContent.toLowerCase().includes('ops') || packContent.toLowerCase().includes('brief');
    const hasChangesRef = packContent.toLowerCase().includes('change') || packContent.toLowerCase().includes('booking');
    const hasLateRef = packContent.toLowerCase().includes('late') || packContent.toLowerCase().includes('queue');

    if (hasGuestDraftsRef && files.guestFiles.length === 0 && files.welcomeFiles.length === 0) {
      if (!slot || slot === '20:00' || slot === 'all') {
        warnings.push('PACK.md references guest/welcome drafts but no guest-*.md or welcome-*.md files present');
      }
    }

    if (hasOpsRef && !files.dailyOpsMd) {
      if (!slot || slot === '21:00' || slot === 'all') {
        warnings.push('PACK.md references ops but daily-ops.md not present');
      }
    }

    if (hasChangesRef && !files.changesMd) {
      warnings.push('PACK.md references changes but changes.md not present');
    }

    if (hasLateRef && !files.queueMd && !files.unknownTimeMd) {
      if (!slot || slot === '09:00' || slot === 'all') {
        warnings.push('PACK.md references late check-ins but queue.md/unknown-time.md not present');
      }
    }

    if (warnings.length > 0) {
      return {
        passed: false,
        message: warnings.join('; '),
      };
    }

    return {
      passed: true,
      message: 'No missing sibling file references detected in PACK.md',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error checking PACK.md references: ${err.message}`,
    };
  }
}

export function checkSlotExpectations(files: PackFiles, slot?: string): CheckResult {
  try {
    const warnings: string[] = [];

    if (slot === '20:00' || slot === 'all') {
      if (files.welcomeFiles.length === 0 && files.guestFiles.length === 0) {
        warnings.push('20:00 CT slot: No welcome or guest draft files present');
      }
    }

    if (slot === '09:00' || slot === 'all') {
      if (!files.queueMd && !files.unknownTimeMd) {
        warnings.push('09:00 CT slot: No late check-in queue files (queue.md/unknown-time.md) present');
      }
    }

    if (slot === '21:00' || slot === 'all') {
      if (!files.dailyOpsMd) {
        warnings.push('21:00 CT slot: No daily-ops.md file present');
      }
    }

    if (warnings.length > 0) {
      return {
        passed: false,
        message: warnings.join('; '),
      };
    }

    return {
      passed: true,
      message: slot ? `Slot ${slot} expectations met` : 'All slot expectations met',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error checking slot expectations: ${err.message}`,
    };
  }
}

export function checkChangesFilePresence(files: PackFiles): CheckResult {
  if (!files.changesMd) {
    return {
      passed: false,
      message: 'changes.md absent - reminder: last-minute booking-change-check before post',
    };
  }

  try {
    const content = readFileSync(files.changesMd, 'utf-8');
    const isEmpty = content.trim().length === 0;

    if (isEmpty) {
      return {
        passed: false,
        message: 'changes.md present but empty - verify no booking changes',
      };
    }

    return {
      passed: true,
      message: 'changes.md present with content',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error reading changes.md: ${err.message}`,
    };
  }
}

export function generateChecklist(
  slot: string | null,
  files: PackFiles,
  checks: { [key: string]: CheckResult }
): string {
  const slotLabel = slot || 'all';

  let checklist = `# Browns CT Pack Post Checklist\n\n`;
  checklist += `**Generated:** ${new Date().toISOString()}\n`;
  checklist += `**Pack Path:** ${files.packMd.replace(/\/PACK\.md$/, '')}\n`;
  checklist += `**Slot:** ${slotLabel}\n\n`;
  checklist += `## Pre-WhatsApp Post Checklist\n\n`;
  checklist += `CoS WhatsApp Admin - The Browns: Review each item before posting CT timed pack.\n\n`;

  let itemNum = 1;

  checklist += `### ${itemNum}. Required Files\n`;
  checklist += `- [ ] PACK.md present\n`;
  checklist += `- [ ] APPROVAL.md present\n`;
  checklist += `\n**Status:** ${checks.requiredFiles.passed ? '✅ PASS' : '❌ FAIL'} - ${checks.requiredFiles.message}\n\n`;
  itemNum++;

  checklist += `### ${itemNum}. Timed Checklist References\n`;
  checklist += `- [ ] PACK.md timed checklist references match present sibling files\n`;
  checklist += `- [ ] 20:00 CT: guest/welcome drafts if referenced\n`;
  checklist += `- [ ] 09:00 CT: late check-in files if referenced\n`;
  checklist += `- [ ] 21:00 CT: daily-ops.md if referenced\n`;
  checklist += `\n**Status:** ${checks.packTimeline.passed ? '✅ PASS' : '⚠️ WARNING'} - ${checks.packTimeline.message}\n\n`;
  itemNum++;

  if (slot && slot !== 'all') {
    checklist += `### ${itemNum}. Slot ${slot} Expectations\n`;
    checklist += `- [ ] Files expected for ${slot} slot are present\n`;
    checklist += `- [ ] Content is not empty when slot expects it\n`;
    checklist += `\n**Status:** ${checks.slotExpectations.passed ? '✅ PASS' : '⚠️ WARNING'} - ${checks.slotExpectations.message}\n\n`;
    itemNum++;
  }

  checklist += `### ${itemNum}. Booking Changes\n`;
  checklist += `- [ ] changes.md present OR last-minute booking-change-check performed\n`;
  checklist += `- [ ] No surprise guest name changes, suite reassignments, or cancellations\n`;
  checklist += `\n**Status:** ${checks.changes.passed ? '✅ PASS' : '⚠️ REMINDER'} - ${checks.changes.message}\n\n`;
  itemNum++;

  checklist += `### ${itemNum}. Safety Gates\n`;
  checklist += `- [ ] Never auto-send (CoS owns WhatsApp)\n`;
  checklist += `- [ ] Never invent guest phones/rates/ETAs\n`;
  checklist += `- [ ] Dullstroom / The Browns only\n`;
  checklist += `- [ ] Offline only (no WhatsApp APIs)\n`;
  checklist += `\n**Reminder:** All drafts require CoS approval before WhatsApp posting.\n\n`;
  itemNum++;

  checklist += `### ${itemNum}. Final Go/No-Go\n`;
  checklist += `- [ ] All checklist items above reviewed\n`;
  checklist += `- [ ] Grant approval obtained\n`;
  checklist += `- [ ] Ready to post to WhatsApp Admin - The Browns\n`;
  checklist += `\n**Action:** CoS manually posts to WhatsApp Admin - The Browns after final review.\n\n`;

  checklist += `---\n\n`;
  checklist += `**OFFLINE ONLY:** This tool never sends WhatsApp messages. CoS owns all posting.\n`;
  checklist += `**NEVER INVENTS:** No guest phones, rates, or ETAs fabricated.\n`;
  checklist += `**DULLSTROOM / THE BROWNS ONLY:** Scope boundary.\n`;

  return checklist;
}

export function generateIssues(
  checks: { [key: string]: CheckResult }
): string {
  let issues = `# Issues and Warnings\n\n`;
  issues += `**Generated:** ${new Date().toISOString()}\n\n`;

  const failures: CheckResult[] = [];
  const warnings: CheckResult[] = [];

  for (const [checkName, result] of Object.entries(checks)) {
    if (!result.passed) {
      if (checkName === 'packTimeline' || checkName === 'slotExpectations' || checkName === 'changes') {
        warnings.push(result);
      } else {
        failures.push(result);
      }
    }
  }

  if (failures.length === 0 && warnings.length === 0) {
    issues += `✅ **No issues detected**\n\n`;
    issues += `All checks passed. Pack is ready for CoS review.\n`;
    return issues;
  }

  if (failures.length > 0) {
    issues += `## ❌ Failures\n\n`;
    failures.forEach((result, idx) => {
      issues += `${idx + 1}. ${result.message}\n`;
    });
    issues += `\n`;
  }

  if (warnings.length > 0) {
    issues += `## ⚠️ Warnings\n\n`;
    warnings.forEach((result, idx) => {
      issues += `${idx + 1}. ${result.message}\n`;
    });
    issues += `\n`;
  }

  issues += `---\n\n`;
  issues += `**Action Required:** Review and resolve issues before proceeding with WhatsApp post.\n`;

  return issues;
}

export function generateApprovalCopy(): string {
  let approval = `# APPROVAL - Browns CT Pack Post\n\n`;
  approval += `**Generated:** ${new Date().toISOString()}\n\n`;

  approval += `## CoS Approval Workflow\n\n`;
  approval += `### Pre-Post Checklist\n\n`;
  approval += `1. **Review POST-CHECKLIST.md** for all go/no-go items\n`;
  approval += `2. **Review ISSUES.md** for any failures or warnings\n`;
  approval += `3. **Verify pack content** (guest drafts, ops brief, changes)\n`;
  approval += `4. **Obtain Grant approval** before WhatsApp posting\n\n`;

  approval += `## Safety Gates\n\n`;
  approval += `### Never Auto-Send\n`;
  approval += `- ❌ **NO automated WhatsApp posting**\n`;
  approval += `- ✅ CoS manually drafts and sends all WhatsApp Admin - The Browns posts\n`;
  approval += `- ✅ This tool is offline and read-only only\n\n`;

  approval += `### Never Invent\n`;
  approval += `- ❌ **NO invented guest phone numbers**\n`;
  approval += `- ❌ **NO invented rates** (pricing from approved sources only)\n`;
  approval += `- ❌ **NO invented ETAs** (arrival times from bookings only)\n`;
  approval += `- ✅ All data from pack source files only\n\n`;

  approval += `### Scope Boundaries\n`;
  approval += `- ✅ **Dullstroom / The Browns Luxury Guest Suites ONLY**\n`;
  approval += `- ❌ **Rivendell / other properties:** NOT in scope\n`;
  approval += `- ❌ **Perfect Water / Heavy Metal:** NOT in scope\n\n`;

  approval += `### Offline Only\n`;
  approval += `- ✅ No WhatsApp Cloud API calls\n`;
  approval += `- ✅ No network operations\n`;
  approval += `- ✅ Pack validation only\n\n`;

  approval += `## CoS Responsibilities\n\n`;
  approval += `1. **Review:** Read POST-CHECKLIST.md and verify all items\n`;
  approval += `2. **Authorize:** Obtain Grant approval for WhatsApp posting\n`;
  approval += `3. **Post:** Manually draft and send WhatsApp Admin - The Browns messages\n`;
  approval += `4. **Never bypass:** All safety gates are mandatory\n\n`;

  approval += `---\n\n`;
  approval += `**CoS owns WhatsApp workflow. Never auto-send. Never invent guest phones/rates/ETAs. Dullstroom / The Browns only. Offline only.**\n`;

  return approval;
}
