import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { PackFiles, CheckResult } from './types.js';

export function validatePackStructure(packPath: string): PackFiles {
  const packMd = join(packPath, 'PACK.md');
  const hospitalityMd = join(packPath, 'hospitality.md');
  const heavyMetalMd = join(packPath, 'heavy-metal.md');
  const approvalMd = join(packPath, 'APPROVAL.md');

  if (!existsSync(packMd)) {
    throw new Error(`PACK.md not found in pack directory: ${packPath}`);
  }

  if (!existsSync(hospitalityMd)) {
    throw new Error(`hospitality.md not found in pack directory: ${packPath}`);
  }

  if (!existsSync(heavyMetalMd)) {
    throw new Error(`heavy-metal.md not found in pack directory: ${packPath}`);
  }

  if (!existsSync(approvalMd)) {
    throw new Error(`APPROVAL.md not found in pack directory: ${packPath}`);
  }

  return { packMd, hospitalityMd, heavyMetalMd, approvalMd };
}

export function checkRequiredFilesPresent(files: PackFiles): CheckResult {
  try {
    for (const [name, path] of Object.entries(files)) {
      if (!existsSync(path)) {
        return {
          passed: false,
          message: `Missing required file: ${name}`,
        };
      }
    }
    return {
      passed: true,
      message: 'All required files present',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error checking files: ${err.message}`,
    };
  }
}

export function checkHospitalityExists(files: PackFiles): CheckResult {
  try {
    const content = readFileSync(files.hospitalityMd, 'utf-8');
    const hasContent = content.trim().length > 0;
    
    return {
      passed: true,
      message: hasContent 
        ? 'hospitality.md exists with content'
        : 'hospitality.md exists but is empty',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error reading hospitality.md: ${err.message}`,
    };
  }
}

export function checkHeavyMetalExists(files: PackFiles): CheckResult {
  try {
    const content = readFileSync(files.heavyMetalMd, 'utf-8');
    const hasContent = content.trim().length > 0;
    
    return {
      passed: true,
      message: hasContent 
        ? 'heavy-metal.md exists with content'
        : 'heavy-metal.md exists but is empty',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error reading heavy-metal.md: ${err.message}`,
    };
  }
}

export function checkApprovalPresent(files: PackFiles): CheckResult {
  try {
    const content = readFileSync(files.approvalMd, 'utf-8');
    const hasApprovalContent = content.includes('APPROVAL') || content.includes('approval');
    
    return {
      passed: hasApprovalContent,
      message: hasApprovalContent
        ? 'APPROVAL.md present with approval content'
        : 'APPROVAL.md exists but lacks approval keywords',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error reading APPROVAL.md: ${err.message}`,
    };
  }
}

export function checkPackWarnings(files: PackFiles): CheckResult {
  try {
    const content = readFileSync(files.packMd, 'utf-8');
    const hasWarnings = content.toLowerCase().includes('warning');
    const hasMissingInputs = content.toLowerCase().includes('missing');
    
    if (hasWarnings || hasMissingInputs) {
      const notes: string[] = [];
      
      if (content.includes('Browns bookings')) {
        notes.push('Browns bookings mentioned');
      }
      if (content.includes('Heavy Metal') || content.includes('HM')) {
        notes.push('Heavy Metal quotes mentioned');
      }
      
      return {
        passed: false,
        message: `PACK.md contains warnings or missing inputs. ${notes.join(', ')}`,
      };
    }
    
    return {
      passed: true,
      message: 'No warnings detected in PACK.md',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error reading PACK.md: ${err.message}`,
    };
  }
}

export function generateChecklist(
  date: string | null,
  files: PackFiles,
  checks: { [key: string]: CheckResult }
): string {
  const dateLabel = date || 'Unknown Date';
  
  let checklist = `# SA Texas Exception Post Checklist\n\n`;
  checklist += `**Date:** ${dateLabel}\n`;
  checklist += `**Generated:** ${new Date().toISOString()}\n`;
  checklist += `**Pack Path:** ${files.packMd.replace(/\/PACK\.md$/, '')}\n\n`;
  checklist += `## Pre-WhatsApp Post Checklist\n\n`;
  checklist += `CoS / SA Ops: Review each item before posting exception content to WhatsApp Admin.\n\n`;
  
  let itemNum = 1;
  
  checklist += `### ${itemNum}. Required Files\n`;
  checklist += `- [ ] PACK.md present\n`;
  checklist += `- [ ] hospitality.md present (may be empty)\n`;
  checklist += `- [ ] heavy-metal.md present (may be empty)\n`;
  checklist += `- [ ] APPROVAL.md present\n`;
  checklist += `\n**Status:** ${checks.requiredFiles.passed ? '✅ PASS' : '❌ FAIL'} - ${checks.requiredFiles.message}\n\n`;
  itemNum++;
  
  checklist += `### ${itemNum}. Scope Verification\n`;
  checklist += `- [ ] Perfect Water content is EXCLUDED (not in scope)\n`;
  checklist += `- [ ] Only Heavy Metal and The Browns exceptions included\n`;
  checklist += `- [ ] No invented rates, volumes, or guest facts\n`;
  checklist += `\n**Reminder:** This pack is for SA Ops exceptions only. Perfect Water operations are out of scope.\n\n`;
  itemNum++;
  
  checklist += `### ${itemNum}. Content Warnings\n`;
  checklist += `- [ ] PACK.md reviewed for warnings\n`;
  checklist += `- [ ] Missing input flags acknowledged\n`;
  checklist += `- [ ] Corresponding notes present for each warning\n`;
  checklist += `\n**Status:** ${checks.packWarnings.passed ? '✅ PASS' : '⚠️ WARNING'} - ${checks.packWarnings.message}\n\n`;
  itemNum++;
  
  checklist += `### ${itemNum}. Hospitality Section\n`;
  checklist += `- [ ] hospitality.md reviewed\n`;
  checklist += `- [ ] Guest facts are from bookings only (never invented)\n`;
  checklist += `- [ ] Special requests accurately reflected\n`;
  checklist += `\n**Status:** ${checks.hospitality.passed ? '✅ PASS' : '❌ FAIL'} - ${checks.hospitality.message}\n\n`;
  itemNum++;
  
  checklist += `### ${itemNum}. Heavy Metal Section\n`;
  checklist += `- [ ] heavy-metal.md reviewed\n`;
  checklist += `- [ ] Quotes are filename references only\n`;
  checklist += `- [ ] No rates or volumes invented\n`;
  checklist += `\n**Status:** ${checks.heavyMetal.passed ? '✅ PASS' : '❌ FAIL'} - ${checks.heavyMetal.message}\n\n`;
  itemNum++;
  
  checklist += `### ${itemNum}. Approval Gates\n`;
  checklist += `- [ ] APPROVAL.md reviewed\n`;
  checklist += `- [ ] CoS owns WhatsApp workflow\n`;
  checklist += `- [ ] Manual approval required before posting\n`;
  checklist += `- [ ] Never auto-send\n`;
  checklist += `\n**Status:** ${checks.approval.passed ? '✅ PASS' : '❌ FAIL'} - ${checks.approval.message}\n\n`;
  itemNum++;
  
  checklist += `### ${itemNum}. Final Go/No-Go\n`;
  checklist += `- [ ] All checklist items above reviewed\n`;
  checklist += `- [ ] CoS authorization obtained\n`;
  checklist += `- [ ] Ready to draft WhatsApp Admin post\n`;
  checklist += `\n**Action:** CoS manually posts to WhatsApp Admin after final review.\n\n`;
  
  checklist += `---\n\n`;
  checklist += `**OFFLINE ONLY:** This tool never sends WhatsApp messages. CoS owns all posting.\n`;
  checklist += `**NEVER INVENTS:** No rates, volumes, or guest facts fabricated.\n`;
  checklist += `**PERFECT WATER:** Excluded from this pack scope.\n`;
  
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
      if (checkName === 'packWarnings') {
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

export function generateApprovalCopy(date: string | null): string {
  const dateLabel = date || 'Unknown Date';
  
  let approval = `# APPROVAL - SA Texas Exception Post\n\n`;
  approval += `**Date:** ${dateLabel}\n`;
  approval += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  approval += `## CoS Approval Workflow\n\n`;
  approval += `### Pre-Post Checklist\n\n`;
  approval += `1. **Review POST-CHECKLIST.md** for all go/no-go items\n`;
  approval += `2. **Review ISSUES.md** for any failures or warnings\n`;
  approval += `3. **Verify hospitality.md and heavy-metal.md content**\n`;
  approval += `4. **Obtain CoS authorization** before WhatsApp posting\n\n`;
  
  approval += `## Safety Gates\n\n`;
  approval += `### Never Auto-Send\n`;
  approval += `- ❌ **NO automated WhatsApp posting**\n`;
  approval += `- ✅ CoS manually drafts and sends all WhatsApp Admin posts\n`;
  approval += `- ✅ This tool is offline and read-only only\n\n`;
  
  approval += `### Never Invent\n`;
  approval += `- ❌ **NO invented rates** (Heavy Metal pricing stays manual)\n`;
  approval += `- ❌ **NO invented volumes** (Heavy Metal quantities from source only)\n`;
  approval += `- ❌ **NO invented guest facts** (Browns data from bookings only)\n`;
  approval += `- ✅ All data from pack source files only\n\n`;
  
  approval += `### Scope Boundaries\n`;
  approval += `- ✅ **Heavy Metal Sand & Stone:** Open quotes (filenames only)\n`;
  approval += `- ✅ **The Browns / Hospitality Partners:** Exceptional bookings only\n`;
  approval += `- ❌ **Perfect Water:** EXCLUDED (not in scope for this pack)\n\n`;
  
  approval += `### Offline Only\n`;
  approval += `- ✅ No WhatsApp Cloud API calls\n`;
  approval += `- ✅ No network operations\n`;
  approval += `- ✅ Pack validation only\n\n`;
  
  approval += `## CoS Responsibilities\n\n`;
  approval += `1. **Review:** Read POST-CHECKLIST.md and verify all items\n`;
  approval += `2. **Authorize:** Obtain CoS approval for WhatsApp posting\n`;
  approval += `3. **Post:** Manually draft and send WhatsApp Admin messages\n`;
  approval += `4. **Never bypass:** All safety gates are mandatory\n\n`;
  
  approval += `---\n\n`;
  approval += `**CoS owns WhatsApp workflow. Never auto-send. Never invent rates/volumes/guest facts. Perfect Water out of scope. Offline only.**\n`;
  
  return approval;
}
