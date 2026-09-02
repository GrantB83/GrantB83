import * as fs from 'fs';
import * as path from 'path';
import { PreflightReport, MissingItems } from './types.js';

/**
 * Generate PREFLIGHT.md report
 */
function generatePreflightMd(report: PreflightReport): string {
  const lines: string[] = [];
  
  lines.push('# YouTube Upload Preflight Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`);
  lines.push(`**Package:** \`${report.package_dir}\``);
  lines.push('');
  lines.push('## Preflight Checks');
  lines.push('');
  
  let checkNum = 1;
  
  // Required files check
  const { required_files } = report.checks;
  lines.push(`${checkNum}. **Required Files:** ${required_files.passed ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(`   - ${required_files.message}`);
  if (required_files.details) {
    lines.push(`   - Details: ${required_files.details}`);
  }
  lines.push('');
  checkNum++;
  
  // Validate report check (if present)
  if (report.checks.validate_report) {
    const { validate_report } = report.checks;
    lines.push(`${checkNum}. **Package Validation:** ${validate_report.passed ? '✅ PASS' : '❌ FAIL'}`);
    lines.push(`   - ${validate_report.message}`);
    if (validate_report.details) {
      lines.push(`   - Details: ${validate_report.details}`);
    }
    lines.push('');
    checkNum++;
  }
  
  // Drive URL check
  const { drive_url } = report.checks;
  lines.push(`${checkNum}. **Drive Approval Link:** ${drive_url.passed ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(`   - ${drive_url.message}`);
  if (drive_url.details) {
    lines.push(`   - Details: ${drive_url.details}`);
  }
  if (report.drive_url) {
    lines.push(`   - URL: ${report.drive_url}`);
  }
  lines.push('');
  checkNum++;
  
  // Video check (if present)
  if (report.checks.video_exists) {
    const { video_exists } = report.checks;
    lines.push(`${checkNum}. **Video File:** ${video_exists.passed ? '✅ PASS' : '❌ FAIL'}`);
    lines.push(`   - ${video_exists.message}`);
    if (video_exists.details) {
      lines.push(`   - Details: ${video_exists.details}`);
    }
    if (report.video_path) {
      lines.push(`   - Path: ${report.video_path}`);
    }
    lines.push('');
    checkNum++;
  }
  
  // PII check
  const { pii_patterns } = report.checks;
  lines.push(`${checkNum}. **PII Pattern Scan:** ${pii_patterns.passed ? '✅ PASS' : '⚠️  WARNING'}`);
  lines.push(`   - ${pii_patterns.message}`);
  if (pii_patterns.details) {
    lines.push(`   - Details: ${pii_patterns.details}`);
  }
  lines.push('');
  
  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total checks:** ${report.summary.total_checks}`);
  lines.push(`- **Passed:** ${report.summary.passed}`);
  lines.push(`- **Failed:** ${report.summary.failed}`);
  lines.push(`- **Status:** ${report.summary.all_passed ? '✅ READY FOR APPROVAL' : '❌ NOT READY'}`);
  lines.push('');
  
  // Reminder
  lines.push('## ⚠️  APPROVAL GATE REMINDER');
  lines.push('');
  lines.push('**This tool NEVER uploads to YouTube.**');
  lines.push('');
  lines.push('Before any YouTube upload:');
  lines.push('1. CoS must include Drive approval link in chat');
  lines.push('2. Grant must approve in CoS');
  lines.push('3. Never auto-upload');
  lines.push('4. Studio owns paste workflow only');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate APPROVAL.md
 */
function generateApprovalMd(): string {
  const lines: string[] = [];
  
  lines.push('# YouTube Upload Approval Gate');
  lines.push('');
  lines.push('## Hard Rules');
  lines.push('');
  lines.push('1. **CoS chat Drive link REQUIRED:** Grant bots must include Drive approval link before any YouTube upload request');
  lines.push('2. **Grant must approve in CoS:** No auto-upload, ever');
  lines.push('3. **Never auto-upload:** This tool and all Studio tools are offline only');
  lines.push('4. **Studio owns paste workflow only:** Manual Chrome paste to Suno; no YouTube upload automation');
  lines.push('');
  lines.push('## Approval Flow');
  lines.push('');
  lines.push('```');
  lines.push('1. Studio/BrownieTunez runs preflight (this tool)');
  lines.push('2. If preflight passes → Studio prepares package');
  lines.push('3. CoS bot shares Drive link in chat');
  lines.push('4. Grant reviews and approves in CoS');
  lines.push('5. Only then: Studio may upload to YouTube');
  lines.push('```');
  lines.push('');
  lines.push('## What This Tool Does NOT Do');
  lines.push('');
  lines.push('- ❌ No YouTube API calls');
  lines.push('- ❌ No Suno API calls');
  lines.push('- ❌ No Drive uploads');
  lines.push('- ❌ No WhatsApp sends');
  lines.push('- ❌ No auto-upload of any kind');
  lines.push('- ❌ No invention of lyrics, titles, or URLs');
  lines.push('');
  lines.push('## What This Tool DOES');
  lines.push('');
  lines.push('- ✅ Validates package files are present');
  lines.push('- ✅ Checks validation report (if provided)');
  lines.push('- ✅ Verifies Drive approval link is present');
  lines.push('- ✅ Checks video file exists (optional)');
  lines.push('- ✅ Scans for PII patterns in lyrics');
  lines.push('- ✅ Generates preflight reports');
  lines.push('- ✅ Works 100% offline');
  lines.push('');
  lines.push('## Ownership');
  lines.push('');
  lines.push('- **Studio/BrownieTunez:** Manual Chrome/Suno paste workflow');
  lines.push('- **CoS:** Drive link sharing and Grant approval coordination');
  lines.push('- **Grant:** Final YouTube upload approval decision');
  lines.push('');
  lines.push('This tool is a **preflight checker only**. It does not replace human judgment or approval gates.');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate missing.md
 */
function generateMissingMd(report: PreflightReport): string {
  const lines: string[] = [];
  const missing: string[] = [];
  
  lines.push('# Missing Items');
  lines.push('');
  lines.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`);
  lines.push('');
  
  // Check each required item
  if (!report.checks.required_files.passed) {
    missing.push('Required package files (see PREFLIGHT.md for details)');
  }
  
  if (report.checks.validate_report && !report.checks.validate_report.passed) {
    missing.push('Valid package validation report');
  }
  
  if (!report.checks.drive_url.passed) {
    missing.push('Drive approval link (BLOCKING)');
  }
  
  if (report.checks.video_exists && !report.checks.video_exists.passed) {
    missing.push('Video file');
  }
  
  if (!report.checks.pii_patterns.passed) {
    missing.push('PII pattern violations in lyrics (WARNING)');
  }
  
  if (missing.length === 0) {
    lines.push('✅ **No missing items. Ready for approval workflow.**');
    lines.push('');
  } else {
    lines.push('❌ **The following items are missing or failed checks:**');
    lines.push('');
    missing.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item}`);
    });
    lines.push('');
    lines.push('## What\'s Blocking?');
    lines.push('');
    lines.push('**Drive approval link** is the primary blocking item. Without it, no YouTube upload request can proceed.');
    lines.push('');
    lines.push('Other items may be warnings or preparatory checks. Review PREFLIGHT.md for full details.');
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Write all report files
 */
export async function writeReports(report: PreflightReport, outdir: string): Promise<void> {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }
  
  // Write PREFLIGHT.md
  const preflightMd = generatePreflightMd(report);
  fs.writeFileSync(path.join(outdir, 'PREFLIGHT.md'), preflightMd, 'utf-8');
  
  // Write APPROVAL.md
  const approvalMd = generateApprovalMd();
  fs.writeFileSync(path.join(outdir, 'APPROVAL.md'), approvalMd, 'utf-8');
  
  // Write missing.md
  const missingMd = generateMissingMd(report);
  fs.writeFileSync(path.join(outdir, 'missing.md'), missingMd, 'utf-8');
  
  // Write manifest.json (machine-readable)
  const manifest = {
    tool: 'studio-youtube-preflight-pack',
    version: '1.0.0',
    timestamp: report.timestamp,
    package_dir: report.package_dir,
    summary: report.summary,
    drive_url: report.drive_url,
    video_path: report.video_path,
    files: {
      preflight: 'PREFLIGHT.md',
      approval: 'APPROVAL.md',
      missing: 'missing.md',
      manifest: 'manifest.json'
    }
  };
  fs.writeFileSync(path.join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
}
