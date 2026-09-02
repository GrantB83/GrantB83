/**
 * Checklist validation logic for vault-due-digest-post-checklist
 */

import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import type { PackFiles, CheckResult } from './types.js';

/**
 * Validate pack structure and return file paths
 */
export function validatePackStructure(packPath: string): PackFiles {
  const approvalMd = join(packPath, 'APPROVAL.md');
  
  // APPROVAL.md is required
  if (!existsSync(approvalMd)) {
    throw new Error(`APPROVAL.md not found in pack directory: ${packPath}`);
  }
  
  const digestMd = join(packPath, 'DIGEST.md');
  const masterMd = join(packPath, 'master.md');
  const byEntityDir = join(packPath, 'by-entity');
  const missingSignalsMd = join(packPath, 'missing-signals.md');
  
  return {
    digestMd: existsSync(digestMd) ? digestMd : undefined,
    masterMd: existsSync(masterMd) ? masterMd : undefined,
    approvalMd,
    byEntityDir: existsSync(byEntityDir) ? byEntityDir : undefined,
    missingSignalsMd: existsSync(missingSignalsMd) ? missingSignalsMd : undefined,
  };
}

/**
 * Check if required overview file (DIGEST.md or master.md) is present
 */
export function checkOverviewPresent(files: PackFiles): CheckResult {
  if (!files.digestMd && !files.masterMd) {
    return {
      passed: false,
      message: 'Neither DIGEST.md nor master.md found in pack',
    };
  }
  
  return {
    passed: true,
    message: files.digestMd ? 'DIGEST.md present' : 'master.md present',
  };
}

/**
 * Check if APPROVAL.md is present and has approval content
 */
export function checkApprovalPresent(files: PackFiles): CheckResult {
  try {
    const content = readFileSync(files.approvalMd, 'utf-8');
    const hasApprovalContent = 
      content.includes('APPROVAL') || 
      content.includes('approval') ||
      content.includes('Vault') ||
      content.includes('N2');
    
    return {
      passed: hasApprovalContent,
      message: hasApprovalContent
        ? 'APPROVAL.md present with relevant keywords'
        : 'APPROVAL.md exists but lacks expected content',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error reading APPROVAL.md: ${err.message}`,
    };
  }
}

/**
 * Check if by-entity directory exists (warn if missing)
 */
export function checkByEntityDir(files: PackFiles): CheckResult {
  if (!files.byEntityDir) {
    return {
      passed: false,
      message: 'by-entity/ directory not found (expected entity packs)',
    };
  }
  
  try {
    const stat = statSync(files.byEntityDir);
    if (!stat.isDirectory()) {
      return {
        passed: false,
        message: 'by-entity exists but is not a directory',
      };
    }
    
    const entries = readdirSync(files.byEntityDir);
    const entityDirs = entries.filter(entry => {
      const fullPath = join(files.byEntityDir!, entry);
      return statSync(fullPath).isDirectory();
    });
    
    return {
      passed: true,
      message: `by-entity/ directory present with ${entityDirs.length} entity pack(s)`,
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error reading by-entity/ directory: ${err.message}`,
    };
  }
}

/**
 * Check if DIGEST/master contains currency tokens (amounts should stay in files)
 */
export function checkNoCurrencyInProse(files: PackFiles): CheckResult {
  const overviewFile = files.digestMd || files.masterMd;
  
  if (!overviewFile) {
    return {
      passed: true,
      message: 'No overview file to check for currency violations',
    };
  }
  
  try {
    const content = readFileSync(overviewFile, 'utf-8');
    
    // Currency patterns: R, ZAR, USD, $, £, €, amounts like R1000, $500
    const currencyPatterns = [
      /R\s*\d+/,           // R 1000, R1000
      /\$\s*\d+/,          // $ 500, $500
      /ZAR\s*\d+/i,        // ZAR 1000
      /USD\s*\d+/i,        // USD 500
      /£\s*\d+/,           // £ 100
      /€\s*\d+/,           // € 100
      /\d+\s*rand/i,       // 1000 rand
    ];
    
    const foundCurrency: string[] = [];
    
    for (const pattern of currencyPatterns) {
      if (pattern.test(content)) {
        foundCurrency.push(pattern.toString());
      }
    }
    
    if (foundCurrency.length > 0) {
      return {
        passed: false,
        message: `Currency tokens found in ${overviewFile.includes('DIGEST') ? 'DIGEST.md' : 'master.md'} - amounts must stay in files, not prose`,
      };
    }
    
    return {
      passed: true,
      message: 'No currency tokens detected in overview',
    };
  } catch (err: any) {
    return {
      passed: false,
      message: `Error checking for currency: ${err.message}`,
    };
  }
}

/**
 * Generate checklist markdown
 */
export function generateChecklist(
  date: string | null,
  files: PackFiles,
  checks: { [key: string]: CheckResult }
): string {
  const dateLabel = date || 'Unknown Date';
  
  let checklist = `# Vault Due Digest Post Checklist\n\n`;
  checklist += `**Date:** ${dateLabel}\n`;
  checklist += `**Generated:** ${new Date().toISOString()}\n`;
  checklist += `**Pack Path:** ${files.approvalMd.replace(/\/APPROVAL\.md$/, '')}\n\n`;
  checklist += `## Pre-Action Checklist for Vault / CoS\n\n`;
  checklist += `Review each item before any CIPC/SARS/trust research or filing steps.\n\n`;
  
  let itemNum = 1;
  
  checklist += `### ${itemNum}. Required Pack Files\n`;
  checklist += `- [ ] DIGEST.md or master.md present\n`;
  checklist += `- [ ] APPROVAL.md present\n`;
  checklist += `\n**Status:** ${checks.overview.passed ? '✅ PASS' : '❌ FAIL'} - ${checks.overview.message}\n`;
  checklist += `**Status:** ${checks.approval.passed ? '✅ PASS' : '❌ FAIL'} - ${checks.approval.message}\n\n`;
  itemNum++;
  
  checklist += `### ${itemNum}. Entity Packs\n`;
  checklist += `- [ ] by-entity/ directory exists\n`;
  checklist += `- [ ] Entity pack subdirectories present\n`;
  checklist += `\n**Status:** ${checks.byEntity.passed ? '✅ PASS' : '⚠️ WARNING'} - ${checks.byEntity.message}\n\n`;
  itemNum++;
  
  checklist += `### ${itemNum}. Currency Violation Check\n`;
  checklist += `- [ ] DIGEST/master does NOT contain amounts with currency tokens\n`;
  checklist += `- [ ] Amounts stay in files, not prose\n`;
  checklist += `\n**Status:** ${checks.currency.passed ? '✅ PASS' : '⚠️ WARNING'} - ${checks.currency.message}\n\n`;
  itemNum++;
  
  checklist += `### ${itemNum}. N2 Gate Reminder\n`;
  checklist += `- [ ] Human approval required before SARS/CIPC submit\n`;
  checklist += `- [ ] Vault owns all research and filings\n`;
  checklist += `- [ ] Never auto-submit via tool\n`;
  checklist += `\n**Reminder:** All CIPC/SARS/trust filings require explicit N2 approval gate.\n\n`;
  itemNum++;
  
  checklist += `### ${itemNum}. Final Go/No-Go\n`;
  checklist += `- [ ] All checklist items above reviewed\n`;
  checklist += `- [ ] Pack structure validated\n`;
  checklist += `- [ ] Ready for Vault weekday ops research\n`;
  checklist += `\n**Action:** Vault proceeds with research workflow (never auto-submits).\n\n`;
  
  checklist += `---\n\n`;
  checklist += `**OFFLINE ONLY:** This tool never opens file bodies or submits to CIPC/SARS.\n`;
  checklist += `**FILENAME HEURISTICS ONLY:** Classification and due dates from filenames/markdown only.\n`;
  checklist += `**NO INVENTED DATES/AMOUNTS:** This tool never fabricates dates or monetary values.\n`;
  
  return checklist;
}

/**
 * Generate issues report
 */
export function generateIssues(
  checks: { [key: string]: CheckResult }
): string {
  let issues = `# Issues and Warnings\n\n`;
  issues += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  const failures: [string, CheckResult][] = [];
  const warnings: [string, CheckResult][] = [];
  
  for (const [checkName, result] of Object.entries(checks)) {
    if (!result.passed) {
      // by-entity and currency checks are warnings, others are failures
      if (checkName === 'byEntity' || checkName === 'currency') {
        warnings.push([checkName, result]);
      } else {
        failures.push([checkName, result]);
      }
    }
  }
  
  if (failures.length === 0 && warnings.length === 0) {
    issues += `✅ **No issues detected**\n\n`;
    issues += `All checks passed. Pack is ready for Vault weekday ops.\n`;
    return issues;
  }
  
  if (failures.length > 0) {
    issues += `## ❌ Failures\n\n`;
    failures.forEach(([name, result], idx) => {
      issues += `${idx + 1}. **${name}:** ${result.message}\n`;
    });
    issues += `\n`;
  }
  
  if (warnings.length > 0) {
    issues += `## ⚠️ Warnings\n\n`;
    warnings.forEach(([name, result], idx) => {
      issues += `${idx + 1}. **${name}:** ${result.message}\n`;
    });
    issues += `\n`;
  }
  
  issues += `---\n\n`;
  issues += `**Action Required:** Review and resolve issues before proceeding with Vault research.\n`;
  
  return issues;
}

/**
 * Generate approval document
 */
export function generateApprovalCopy(date: string | null): string {
  const dateLabel = date || 'Unknown Date';
  
  let approval = `# APPROVAL - Vault Due Digest Post Checklist\n\n`;
  approval += `**Date:** ${dateLabel}\n`;
  approval += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  approval += `## Vault Ownership\n\n`;
  approval += `Vault / CoS owns all CIPC/SARS/trust research and filings:\n\n`;
  approval += `- ✅ **Research only** - This checklist is for Vault weekday ops research workflow\n`;
  approval += `- ✅ **No auto-submit** - All CIPC/SARS filings require human approval (N2 gate)\n`;
  approval += `- ✅ **No body reads** - Filename and markdown heuristics only\n`;
  approval += `- ✅ **Offline only** - No file body opens, no network calls\n\n`;
  
  approval += `## Safety Rules\n\n`;
  approval += `### Never Open File Bodies\n`;
  approval += `- ❌ **NO file body reads** - Filenames and markdown structure only\n`;
  approval += `- ✅ Classification from filename keywords and DIGEST/master structure\n`;
  approval += `- ✅ Due dates from filename tokens only\n\n`;
  
  approval += `### Never Invent Dates or Amounts\n`;
  approval += `- ❌ **NO invented due dates** - Date tokens from source filenames only\n`;
  approval += `- ❌ **NO invented amounts** - This tool never handles monetary values\n`;
  approval += `- ✅ Amounts stay in files, never in prose\n\n`;
  
  approval += `### Never Submit\n`;
  approval += `- ❌ **NO CIPC submissions** - Vault owns filings (N2 gate)\n`;
  approval += `- ❌ **NO SARS submissions** - Vault owns filings (N2 gate)\n`;
  approval += `- ✅ Checklist output only for Vault research workflow\n\n`;
  
  approval += `### N2 Gate Reminder\n`;
  approval += `All CIPC/SARS/trust filings require explicit human approval:\n\n`;
  approval += `- **N2 gate:** Attorney, SARS, CIPC, or municipal submissions\n`;
  approval += `- **Vault owns:** All research and next actions on compliance documents\n`;
  approval += `- **Human approval:** Required before any statutory filing\n\n`;
  
  approval += `## Scope\n\n`;
  approval += `- ✅ **Vault due digest packs** - Post-validation before research steps\n`;
  approval += `- ✅ **Filename heuristics** - Entity and due date classification guidance only\n`;
  approval += `- ❌ **Legal positions** - Category classification is heuristic, not legal advice\n\n`;
  
  approval += `## Vault Responsibilities\n\n`;
  approval += `1. **Review:** Read ACTION-CHECKLIST.md and verify all items\n`;
  approval += `2. **Research:** Use by-entity/ packs for targeted research (never opens file bodies)\n`;
  approval += `3. **N2 approval:** Obtain explicit approval before any CIPC/SARS submission\n`;
  approval += `4. **Never bypass:** All safety gates are mandatory\n\n`;
  
  approval += `---\n\n`;
  approval += `**Vault owns research and filings. Never submit via tool. Filename heuristics only. No body reads. Offline only.**\n`;
  
  return approval;
}
