/**
 * Career JD Hard Gates Score - Output Generator
 * Generates scorecard files (JSON, Markdown, APPROVAL)
 */

import * as fs from 'fs';
import * as path from 'path';
import { Scorecard, Manifest } from './types.js';

/**
 * Generate all output files
 */
export async function generateOutputs(
  scorecard: Scorecard,
  options: {
    jdPath: string;
    gatesPath: string | null;
    companyOverride: string | null;
    titleOverride: string | null;
    outdir: string;
  }
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(options.outdir, `score-${timestamp}`);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate files
  const files: string[] = [];
  
  // scorecard.json
  const scorecardPath = path.join(outputDir, 'scorecard.json');
  fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2));
  files.push('scorecard.json');
  
  // scorecard.md
  const markdownPath = path.join(outputDir, 'scorecard.md');
  fs.writeFileSync(markdownPath, generateMarkdown(scorecard));
  files.push('scorecard.md');
  
  // APPROVAL.md
  const approvalPath = path.join(outputDir, 'APPROVAL.md');
  fs.writeFileSync(approvalPath, generateApproval(scorecard));
  files.push('APPROVAL.md');
  
  // manifest.json
  const manifest: Manifest = {
    tool: 'career-jd-hard-gates-score',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    inputs: {
      jdPath: options.jdPath,
      gatesPath: options.gatesPath,
      companyOverride: options.companyOverride,
      titleOverride: options.titleOverride,
    },
    outputs: files,
  };
  
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  files.push('manifest.json');
  
  return outputDir;
}

/**
 * Generate scorecard.md (Grant-facing)
 */
function generateMarkdown(scorecard: Scorecard): string {
  const lines: string[] = [];
  
  lines.push('# Career JD Scorecard\n');
  
  if (scorecard.company) {
    lines.push(`**Company:** ${scorecard.company}\n`);
  }
  
  if (scorecard.title) {
    lines.push(`**Title:** ${scorecard.title}\n`);
  }
  
  lines.push(`**Verdict:** ${scorecard.verdict.toUpperCase()}\n`);
  lines.push('---\n');
  
  // Hard Gates
  lines.push('## Hard Gates\n');
  
  const gates = [
    scorecard.gates.dnc,
    scorecard.gates.comp,
    scorecard.gates.location,
    scorecard.gates.function,
    scorecard.gates.seniority,
  ];
  
  for (const gate of gates) {
    const icon = gate.status === 'pass' ? '✅' : gate.status === 'fail' ? '❌' : '⚠️';
    lines.push(`### ${icon} ${gate.gate}`);
    lines.push(`**Status:** ${gate.status}`);
    lines.push(`**Reason:** ${humanizeReason(gate.reason)}`);
    lines.push(`**Confidence:** ${gate.confidence}\n`);
  }
  
  lines.push('---\n');
  
  // Scores
  lines.push('## Scores (total: /10)\n');
  lines.push(`- **Title Match:** ${scorecard.scores.titleMatch}/2`);
  lines.push(`- **Proof Point Match:** ${scorecard.scores.proofPointMatch}/2`);
  lines.push(`- **Seniority:** ${scorecard.scores.seniority}/2`);
  lines.push(`- **Pay Confidence:** ${scorecard.scores.payConfidence}/2`);
  lines.push(`- **Commute/WFH Fit:** ${scorecard.scores.commuteOrWfhFit}/2`);
  lines.push(`- **TOTAL:** ${scorecard.scores.total}/10\n`);
  
  lines.push('---\n');
  
  // Verdict interpretation
  lines.push('## Verdict Interpretation\n');
  
  if (scorecard.verdict === 'apply') {
    lines.push('**Apply-eligible:** All hard gates pass and total score ≥8. Proceed with application preparation.');
  } else if (scorecard.verdict === 'watch') {
    lines.push('**Watch:** All hard gates pass but total score 6-7. Consider applying if other factors are strong.');
  } else if (scorecard.verdict === 'discard') {
    lines.push('**Discard:** All hard gates pass but total score ≤5. Not a strong match.');
  } else {
    lines.push('**Skip:** One or more hard gates failed. Do not apply.');
  }
  
  lines.push('\n---\n');
  
  // Facts-only reminder
  lines.push('## ⚠️ Facts-Only Reminder\n');
  lines.push(scorecard.factsOnlyReminder);
  
  return lines.join('\n');
}

/**
 * Humanize gate reason to avoid showing dollar amounts in markdown
 */
function humanizeReason(reason: string): string {
  // Replace any specific amounts with generic terms
  if (reason.includes('Below floor')) {
    return 'Listed compensation appears below floor';
  }
  if (reason.includes('Meets or exceeds floor')) {
    return 'Listed compensation meets or exceeds floor';
  }
  return reason;
}

/**
 * Generate APPROVAL.md
 */
function generateApproval(scorecard: Scorecard): string {
  const lines: string[] = [];
  
  lines.push('# Career JD Score - Approval Document\n');
  
  lines.push('## Summary\n');
  lines.push(`**Company:** ${scorecard.company || 'Unknown'}`);
  lines.push(`**Title:** ${scorecard.title || 'Unknown'}`);
  lines.push(`**Verdict:** ${scorecard.verdict.toUpperCase()}\n`);
  
  lines.push('## Hard Gates\n');
  const overallPass = scorecard.gates.overallPass ? '✅ ALL PASS' : '❌ ONE OR MORE FAILED';
  lines.push(`**Overall:** ${overallPass}\n`);
  
  lines.push('## Score\n');
  lines.push(`**Total:** ${scorecard.scores.total}/10\n`);
  
  lines.push('## Recommendation\n');
  
  if (scorecard.verdict === 'apply') {
    lines.push('**Proceed with application preparation.**\n');
    lines.push('Next steps:');
    lines.push('1. Review JD for specific proof points needed');
    lines.push('2. Ensure resume claims exist in career-os.md (do not invent)');
    lines.push('3. Draft application using Career bot workflow');
  } else if (scorecard.verdict === 'watch') {
    lines.push('**Conditional apply - review carefully.**\n');
    lines.push('Consider:');
    lines.push('- Are there mitigating factors that boost fit?');
    lines.push('- Is this role strategically important despite lower score?');
    lines.push('- Can you strengthen proof points from career-os?');
  } else if (scorecard.verdict === 'discard') {
    lines.push('**Not recommended.**\n');
    lines.push('Low score indicates weak match. Time better spent on higher-scoring roles.');
  } else {
    lines.push('**DO NOT APPLY - hard gate failure.**\n');
    lines.push('One or more hard gates failed. This role is not eligible per career policy.');
  }
  
  lines.push('\n---\n');
  lines.push('## ⚠️ Important Notes\n');
  lines.push('- This is an **offline scoring aid** for Career bot');
  lines.push('- Career bot owns final apply decision and LinkedIn send');
  lines.push('- Never invent resume metrics or proof points');
  lines.push('- All claims must exist in career-os.md');
  
  return lines.join('\n');
}
