/**
 * Generate output files
 */

import * as fs from 'fs';
import * as path from 'path';
import { LintReport, Manifest } from './types.js';

/**
 * Build lint report from match results
 */
export function buildLintReport(
  draftText: string,
  matchResults: import('./types.js').MatchResult[]
): LintReport {
  const matched = matchResults.filter(m => m.status === 'matched');
  const unmatched = matchResults.filter(m => m.status === 'unmatched');
  const suspicious = matchResults.filter(m => m.status === 'suspicious');
  
  return {
    draft: draftText,
    totalClaims: matchResults.length,
    matched,
    unmatched,
    suspicious,
    summary: {
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      suspiciousCount: suspicious.length,
      safeToApply: unmatched.length === 0 && suspicious.length === 0,
    },
    factsOnlyReminder: 'Career owns apply. Never invent compensation, titles, or employer claims.',
  };
}

/**
 * Generate all output files
 */
export async function generateOutputs(
  report: LintReport,
  inputs: {
    draftPath: string;
    factsPath: string;
    strictMode: boolean;
    outdir: string;
  }
): Promise<string> {
  const outputDir = path.resolve(inputs.outdir);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate report.json
  const reportJsonPath = path.join(outputDir, 'report.json');
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
  
  // Generate report.md
  const reportMdPath = path.join(outputDir, 'report.md');
  fs.writeFileSync(reportMdPath, generateReportMarkdown(report));
  
  // Generate APPROVAL.md
  const approvalPath = path.join(outputDir, 'APPROVAL.md');
  fs.writeFileSync(approvalPath, generateApprovalMarkdown(report, inputs.strictMode));
  
  // Generate manifest.json
  const manifestPath = path.join(outputDir, 'manifest.json');
  const manifest: Manifest = {
    tool: 'career-cover-letter-facts-lint',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    inputs: {
      draftPath: inputs.draftPath,
      factsPath: inputs.factsPath,
      strictMode: inputs.strictMode,
    },
    outputs: ['report.json', 'report.md', 'APPROVAL.md', 'manifest.json'],
    summary: {
      totalClaims: report.totalClaims,
      matched: report.summary.matchedCount,
      unmatched: report.summary.unmatchedCount,
      suspicious: report.summary.suspiciousCount,
    },
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  return outputDir;
}

/**
 * Generate report.md content
 */
function generateReportMarkdown(report: LintReport): string {
  let md = '# Cover Letter Facts Lint Report\n\n';
  
  md += '## Summary\n\n';
  md += `- **Total Claims:** ${report.totalClaims}\n`;
  md += `- **Matched:** ${report.summary.matchedCount}\n`;
  md += `- **Unmatched:** ${report.summary.unmatchedCount}\n`;
  md += `- **Suspicious:** ${report.summary.suspiciousCount}\n`;
  md += `- **Safe to Apply:** ${report.summary.safeToApply ? '✅ Yes' : '⚠️ No - Review findings below'}\n\n`;
  
  md += '---\n\n';
  
  // Unmatched claims (highest priority)
  if (report.unmatched.length > 0) {
    md += '## 🚨 Unmatched Claims\n\n';
    md += 'These claims have no sufficient match in the allowed facts.\n\n';
    
    report.unmatched.forEach((match, i) => {
      md += `### ${i + 1}. Unmatched Claim\n\n`;
      md += `**Text:** "${match.claim.text}"\n\n`;
      md += `**Reason:** ${match.reason}\n\n`;
      
      if (match.flagged.length > 0) {
        md += `**Flagged Tokens:** ${match.flagged.join(', ')}\n\n`;
      }
      
      md += `**Action:** Verify this claim against career-os. Remove or rewrite if not grounded in facts.\n\n`;
    });
    
    md += '---\n\n';
  }
  
  // Suspicious claims
  if (report.suspicious.length > 0) {
    md += '## ⚠️ Suspicious Claims\n\n';
    md += 'These claims partially match facts but contain unverified specific details.\n\n';
    
    report.suspicious.forEach((match, i) => {
      md += `### ${report.unmatched.length + i + 1}. Suspicious Claim\n\n`;
      md += `**Text:** "${match.claim.text}"\n\n`;
      md += `**Reason:** ${match.reason}\n\n`;
      
      if (match.matchedFact) {
        md += `**Closest Fact:** "${match.matchedFact}"\n\n`;
      }
      
      if (match.flagged.length > 0) {
        md += `**Flagged Tokens:** ${match.flagged.join(', ')}\n\n`;
      }
      
      md += `**Action:** Verify flagged details against career-os. Ensure numbers, employers, or titles are accurate.\n\n`;
    });
    
    md += '---\n\n';
  }
  
  // Matched claims (summary only)
  if (report.matched.length > 0) {
    md += '## ✅ Matched Claims\n\n';
    md += `${report.matched.length} claims successfully matched against allowed facts.\n\n`;
    
    md += '<details>\n<summary>View matched claims</summary>\n\n';
    
    report.matched.forEach((match, i) => {
      md += `${i + 1}. "${match.claim.text}" → "${match.matchedFact}" (${match.confidence} confidence)\n\n`;
    });
    
    md += '</details>\n\n';
  }
  
  md += '---\n\n';
  md += `## ⚠️ Important Reminder\n\n`;
  md += `${report.factsOnlyReminder}\n\n`;
  md += `Review all flagged items before submitting this cover letter.\n`;
  
  return md;
}

/**
 * Generate APPROVAL.md content
 */
function generateApprovalMarkdown(report: LintReport, strictMode: boolean): string {
  let md = '# Cover Letter Facts Lint - APPROVAL REQUIRED\n\n';
  
  md += '## Safety Gates\n\n';
  md += '⚠️ **Career owns apply. This tool does not auto-send.**\n\n';
  md += '⚠️ **Never invent compensation, titles, or employer claims.**\n\n';
  md += '⚠️ **All claims must be grounded in career-os or one-pager facts.**\n\n';
  
  md += '---\n\n';
  
  md += '## Lint Results\n\n';
  md += `- **Total Claims:** ${report.totalClaims}\n`;
  md += `- **Matched:** ${report.summary.matchedCount}\n`;
  md += `- **Unmatched:** ${report.summary.unmatchedCount}\n`;
  md += `- **Suspicious:** ${report.summary.suspiciousCount}\n\n`;
  
  if (report.summary.safeToApply) {
    md += '✅ **Status:** All claims matched - safe to proceed\n\n';
  } else {
    md += '🚨 **Status:** Unmatched or suspicious claims found - review required\n\n';
  }
  
  if (strictMode) {
    md += '**Strict Mode:** Enabled - any unmatched claim blocks apply\n\n';
  }
  
  md += '---\n\n';
  
  md += '## Actions Required\n\n';
  
  if (report.summary.safeToApply) {
    md += '1. Review `report.md` to verify matched claims\n';
    md += '2. Manually verify any numbers, employers, or titles\n';
    md += '3. Proceed with Career bot apply workflow\n\n';
  } else {
    md += '1. Review `report.md` for detailed findings\n';
    md += '2. Check unmatched/suspicious claims against career-os\n';
    md += '3. Rewrite or remove any claims not grounded in facts\n';
    md += '4. Re-run lint on updated draft\n';
    md += '5. Only proceed when all claims pass\n\n';
  }
  
  md += '---\n\n';
  
  md += '## Career Bot Workflow\n\n';
  md += 'Career bot must:\n';
  md += '- ✅ Use this lint as a facts-check, not auto-apply approval\n';
  md += '- ✅ Verify all flagged tokens against career-os\n';
  md += '- ✅ Never invent compensation amounts in rewrites\n';
  md += '- ✅ Keep final apply decision with human or Career bot judgment\n';
  md += '- ❌ Never send to LinkedIn without separate approval\n\n';
  
  return md;
}
