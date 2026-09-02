/**
 * Core checklist logic for family-digest-post-checklist
 */

import * as fs from 'fs';
import * as path from 'path';
import { CheckResult, ChecklistOutput } from './types.js';

/**
 * Check if required files exist in pack
 */
export function checkRequiredFiles(packPath: string): CheckResult {
  const required = ['PACK.md', 'school.md', 'family.md'];
  const missing: string[] = [];
  
  for (const file of required) {
    const filePath = path.join(packPath, file);
    if (!fs.existsSync(filePath)) {
      missing.push(file);
    }
  }
  
  if (missing.length > 0) {
    return {
      passed: false,
      message: `Missing required files: ${missing.join(', ')}`
    };
  }
  
  return {
    passed: true,
    message: 'All required files present'
  };
}

/**
 * Check if school.md and family.md are non-empty or explicitly empty-with-header
 */
export function checkContentFiles(packPath: string): CheckResult {
  const files = ['school.md', 'family.md'];
  const issues: string[] = [];
  
  for (const file of files) {
    const filePath = path.join(packPath, file);
    
    if (!fs.existsSync(filePath)) {
      issues.push(`${file} missing`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    
    // Empty file is not allowed
    if (content.length === 0) {
      issues.push(`${file} is completely empty`);
      continue;
    }
    
    // Must have a header line (starts with #)
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0 || !lines[0].startsWith('#')) {
      issues.push(`${file} missing header`);
      continue;
    }
    
    // If only header, that's OK (explicitly empty-with-header)
    // If more than header, that's also OK (has content)
  }
  
  if (issues.length > 0) {
    return {
      passed: false,
      message: issues.join('; ')
    };
  }
  
  return {
    passed: true,
    message: 'Content files are valid (non-empty or empty-with-header)'
  };
}

/**
 * Check for duplicate line items between school.md and family.md
 * Simple normalized-line overlap detection
 */
export function checkDuplicateItems(packPath: string): CheckResult {
  const schoolPath = path.join(packPath, 'school.md');
  const familyPath = path.join(packPath, 'family.md');
  
  if (!fs.existsSync(schoolPath) || !fs.existsSync(familyPath)) {
    return {
      passed: true,
      message: 'Cannot check duplicates (files missing)'
    };
  }
  
  const schoolContent = fs.readFileSync(schoolPath, 'utf-8');
  const familyContent = fs.readFileSync(familyPath, 'utf-8');
  
  // Extract numbered items (lines starting with digit followed by dot)
  const itemPattern = /^\d+\.\s+(.+)$/;
  
  const schoolItems = schoolContent
    .split('\n')
    .map(line => {
      const match = line.match(itemPattern);
      return match ? normalizeItem(match[1]) : null;
    })
    .filter(item => item !== null) as string[];
  
  const familyItems = familyContent
    .split('\n')
    .map(line => {
      const match = line.match(itemPattern);
      return match ? normalizeItem(match[1]) : null;
    })
    .filter(item => item !== null) as string[];
  
  // Find overlaps
  const schoolSet = new Set(schoolItems);
  const duplicates = familyItems.filter(item => schoolSet.has(item));
  
  if (duplicates.length > 0) {
    return {
      passed: false,
      message: `Found ${duplicates.length} duplicate item(s) between school.md and family.md`
    };
  }
  
  return {
    passed: true,
    message: 'No duplicate items detected'
  };
}

/**
 * Normalize item text for comparison
 * Remove extra whitespace, lowercase, remove common punctuation
 */
function normalizeItem(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:—–-]+$/g, '')
    .trim();
}

/**
 * Check if APPROVAL.md is present
 */
export function checkApprovalFile(packPath: string): CheckResult {
  const approvalPath = path.join(packPath, 'APPROVAL.md');
  
  if (!fs.existsSync(approvalPath)) {
    return {
      passed: false,
      message: 'APPROVAL.md missing from pack'
    };
  }
  
  return {
    passed: true,
    message: 'APPROVAL.md present'
  };
}

/**
 * Check if calendar/due sections are referenced in PACK.md but files missing
 */
export function checkReferencedFiles(packPath: string): CheckResult {
  const packMdPath = path.join(packPath, 'PACK.md');
  
  if (!fs.existsSync(packMdPath)) {
    return {
      passed: true,
      message: 'Cannot check references (PACK.md missing)'
    };
  }
  
  const packContent = fs.readFileSync(packMdPath, 'utf-8');
  const warnings: string[] = [];
  
  // Check for calendar references
  if (packContent.includes('calendar') || packContent.includes('Calendar')) {
    const calendarMdPath = path.join(packPath, 'calendar.md');
    if (!fs.existsSync(calendarMdPath)) {
      warnings.push('calendar.md referenced but missing');
    }
  }
  
  // Check for school due references
  if (packContent.includes('school-due') || packContent.includes('due queue')) {
    const dueMdPath = path.join(packPath, 'school-due-queue.md');
    if (!fs.existsSync(dueMdPath)) {
      warnings.push('school-due-queue.md referenced but missing');
    }
  }
  
  if (warnings.length > 0) {
    return {
      passed: false,
      message: warnings.join('; ')
    };
  }
  
  return {
    passed: true,
    message: 'All referenced files present'
  };
}

/**
 * Run all checks and return checklist output
 */
export function runAllChecks(packPath: string): ChecklistOutput {
  const checks = [
    {
      id: 'required-files',
      label: 'Required files present (PACK.md, school.md, family.md)',
      result: checkRequiredFiles(packPath)
    },
    {
      id: 'content-files',
      label: 'Content files are non-empty or empty-with-header',
      result: checkContentFiles(packPath)
    },
    {
      id: 'no-duplicates',
      label: 'No duplicate items between school.md and family.md',
      result: checkDuplicateItems(packPath)
    },
    {
      id: 'approval-file',
      label: 'APPROVAL.md present in pack',
      result: checkApprovalFile(packPath)
    },
    {
      id: 'referenced-files',
      label: 'Calendar/due sections referenced in PACK.md have matching files',
      result: checkReferencedFiles(packPath)
    }
  ];
  
  const failures: string[] = [];
  const warnings: string[] = [];
  
  const checkResults = checks.map(check => {
    if (!check.result.passed) {
      if (check.id === 'referenced-files') {
        warnings.push(`⚠️  ${check.label}: ${check.result.message}`);
      } else {
        failures.push(`❌ ${check.label}: ${check.result.message}`);
      }
    }
    
    return {
      id: check.id,
      label: check.label,
      passed: check.result.passed,
      notes: check.result.message
    };
  });
  
  const allPassed = failures.length === 0;
  
  return {
    checks: checkResults,
    allPassed,
    warnings,
    failures
  };
}
