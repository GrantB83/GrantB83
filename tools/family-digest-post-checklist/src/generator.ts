/**
 * Output generation for POST-CHECKLIST.md, ISSUES.md, APPROVAL.md, and manifest.json
 */

import { ChecklistOutput, ManifestData } from './types.js';

/**
 * Generate POST-CHECKLIST.md content
 */
export function generatePostChecklist(
  packDate: string,
  checklistOutput: ChecklistOutput
): string {
  const lines: string[] = [];
  
  lines.push(`# POST-CHECKLIST — Family Digest Pack ${packDate}\n`);
  lines.push('Pre-WhatsApp posting checklist for Family / CoS before WhatsApp Admin - Grant & Liana Private.\n');
  lines.push('## Go/No-Go Checks\n');
  
  checklistOutput.checks.forEach((check, index) => {
    const status = check.passed ? '✅' : '❌';
    lines.push(`${index + 1}. ${status} ${check.label}`);
    if (check.notes) {
      lines.push(`   - ${check.notes}`);
    }
  });
  
  lines.push('');
  
  if (checklistOutput.allPassed) {
    lines.push('## Result: ✅ READY FOR REVIEW\n');
    lines.push('All checks passed. This pack is ready for Family / CoS review before posting.\n');
  } else {
    lines.push('## Result: ❌ NOT READY\n');
    lines.push('One or more checks failed. Fix issues before posting.\n');
  }
  
  if (checklistOutput.warnings.length > 0) {
    lines.push('## Warnings\n');
    checklistOutput.warnings.forEach(warning => {
      lines.push(`- ${warning}`);
    });
    lines.push('');
  }
  
  lines.push('## Safety Reminders\n');
  lines.push('- Never auto-send to WhatsApp Admin');
  lines.push('- Never invent school facts');
  lines.push('- Family / CoS owns WhatsApp send workflow');
  lines.push('- Manual review required before every post');
  lines.push('- Kids School vs Family separation must be maintained');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate ISSUES.md content (failures and warnings only)
 */
export function generateIssues(
  packDate: string,
  checklistOutput: ChecklistOutput
): string {
  const lines: string[] = [];
  
  lines.push(`# ISSUES — Family Digest Pack ${packDate}\n`);
  
  if (checklistOutput.failures.length === 0 && checklistOutput.warnings.length === 0) {
    lines.push('No issues detected. All checks passed.\n');
    return lines.join('\n');
  }
  
  if (checklistOutput.failures.length > 0) {
    lines.push('## Failures\n');
    checklistOutput.failures.forEach(failure => {
      lines.push(`- ${failure}`);
    });
    lines.push('');
  }
  
  if (checklistOutput.warnings.length > 0) {
    lines.push('## Warnings\n');
    checklistOutput.warnings.forEach(warning => {
      lines.push(`- ${warning}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generate APPROVAL.md content
 */
export function generateApproval(packDate: string): string {
  const lines: string[] = [];
  
  lines.push(`# APPROVAL — Family Digest Pack ${packDate}\n`);
  lines.push('Family / CoS owns WhatsApp Admin send workflow. Never auto-send.\n');
  lines.push('## Pre-Post Review\n');
  lines.push('Before posting to WhatsApp Admin - Grant & Liana Private:\n');
  lines.push('1. Read POST-CHECKLIST.md and verify all checks passed');
  lines.push('2. Review school.md for Kids School accuracy');
  lines.push('3. Review family.md for Family Admin accuracy');
  lines.push('4. Verify Kids School vs Family separation (no duplicate items)');
  lines.push('5. Confirm no invented school facts, due dates, or times');
  lines.push('6. Check calendar.md if present (no invented events)');
  lines.push('7. Check school-due-queue.md if present (no invented dues)');
  lines.push('');
  lines.push('## Full Sentences Required\n');
  lines.push('All digest items must be in full sentences. Subjects-only format is not acceptable for WhatsApp Admin posting.\n');
  lines.push('## Kids School vs Family Separation\n');
  lines.push('Kids School section includes:');
  lines.push('- AISD and campus mail');
  lines.push('- Teacher communications');
  lines.push('- School forms and permissions');
  lines.push('- PTA and volunteer requests');
  lines.push('- Bus schedules and school calendars\n');
  lines.push('Family Admin section includes:');
  lines.push('- Household bills and finance');
  lines.push('- Medical appointments');
  lines.push('- Car payments');
  lines.push('- Utilities');
  lines.push('- General household admin\n');
  lines.push('Each item appears exactly once (no duplicates between sections).\n');
  lines.push('## Offline Only\n');
  lines.push('This checklist tool operates offline. No WhatsApp API, Gmail API, or other network calls.\n');
  lines.push('## Approval Statement\n');
  lines.push('By posting this digest to WhatsApp Admin - Grant & Liana Private, Family / CoS confirms:');
  lines.push('- All checks in POST-CHECKLIST.md passed');
  lines.push('- Content reviewed for accuracy');
  lines.push('- No invented facts');
  lines.push('- Kids School vs Family separation maintained');
  lines.push('- Manual send workflow followed (no auto-post)');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate manifest.json data
 */
export function generateManifest(
  packPath: string,
  packDate: string,
  checklistOutput: ChecklistOutput
): ManifestData {
  const passCount = checklistOutput.checks.filter(c => c.passed).length;
  const failCount = checklistOutput.checks.filter(c => !c.passed).length;
  
  return {
    tool: 'family-digest-post-checklist',
    version: '1.0.0',
    date: packDate,
    generatedAt: new Date().toISOString(),
    packPath,
    allPassed: checklistOutput.allPassed,
    checkCount: checklistOutput.checks.length,
    passCount,
    failCount,
    warningCount: checklistOutput.warnings.length
  };
}
