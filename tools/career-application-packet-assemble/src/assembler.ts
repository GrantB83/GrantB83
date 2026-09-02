/**
 * Career Application Packet Assemble - Core Assembler Logic
 */

import { readFile, copyFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';
import type { CliOptions, PacketResult, PacketManifest, ScoreSummary, LintSummary } from './types.js';

const VERSION = '1.0.0';

/**
 * Run sibling score tool
 */
async function runScoreTool(jdPath: string, tempDir: string): Promise<string> {
  const scoreOutdir = join(tempDir, 'score-output');
  await mkdir(scoreOutdir, { recursive: true });

  const cmd = `cd tools/career-jd-hard-gates-score && npm run score -- --jd ${jdPath} --outdir ${scoreOutdir}`;
  console.error(`[INFO] Running score tool: ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });

  return join(scoreOutdir, 'scorecard.md');
}

/**
 * Run sibling cover lint tool
 */
async function runCoverLintTool(draftPath: string, factsPath: string, tempDir: string): Promise<string> {
  const lintOutdir = join(tempDir, 'lint-output');
  await mkdir(lintOutdir, { recursive: true });

  const cmd = `cd tools/career-cover-letter-facts-lint && npm run lint -- --draft ${draftPath} --facts ${factsPath} --outdir ${lintOutdir}`;
  console.error(`[INFO] Running cover lint tool: ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });

  return join(lintOutdir, 'report.md');
}

/**
 * Extract score summary from scorecard.md (heuristic parsing)
 */
function extractScoreSummary(content: string): ScoreSummary {
  const companyMatch = content.match(/\*\*Company:\*\*\s+(.+)/i);
  const titleMatch = content.match(/\*\*Title:\*\*\s+(.+)/i);
  const scoreMatch = content.match(/\*\*Total Score:\*\*\s+(\d+)/i);
  const verdictMatch = content.match(/\*\*Verdict:\*\*\s+(\w+)/i);
  const gatesMatch = content.match(/\*\*All Hard Gates:\*\*\s+(pass|fail)/i);

  return {
    company: companyMatch ? companyMatch[1].trim() : null,
    title: titleMatch ? titleMatch[1].trim() : null,
    totalScore: scoreMatch ? parseInt(scoreMatch[1], 10) : 0,
    verdict: verdictMatch ? verdictMatch[1].trim() : 'unknown',
    gatesPassed: gatesMatch ? gatesMatch[1].toLowerCase() === 'pass' : false,
  };
}

/**
 * Extract lint summary from report.md (heuristic parsing)
 */
function extractLintSummary(content: string): LintSummary {
  const totalMatch = content.match(/Total Claims:\s+(\d+)/i);
  const matchedMatch = content.match(/Matched:\s+(\d+)/i);
  const unmatchedMatch = content.match(/Unmatched:\s+(\d+)/i);
  const suspiciousMatch = content.match(/Suspicious:\s+(\d+)/i);
  const safeMatch = content.match(/Safe to Apply:\s+(yes|no)/i);

  return {
    totalClaims: totalMatch ? parseInt(totalMatch[1], 10) : 0,
    matched: matchedMatch ? parseInt(matchedMatch[1], 10) : 0,
    unmatched: unmatchedMatch ? parseInt(unmatchedMatch[1], 10) : 0,
    suspicious: suspiciousMatch ? parseInt(suspiciousMatch[1], 10) : 0,
    safeToApply: safeMatch ? safeMatch[1].toLowerCase() === 'yes' : false,
  };
}

/**
 * Assemble application packet
 */
export async function assemblePacket(options: CliOptions): Promise<PacketResult> {
  const warnings: string[] = [];
  const timestamp = new Date().toISOString();
  const packetDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

  // Validate outdir
  if (!options.outdir) {
    throw new Error('--outdir is required');
  }

  const outdir = options.outdir;
  await mkdir(outdir, { recursive: true });

  // Handle score report
  let scoreReportPath = options.score || null;
  if (options.runScore && options.jd) {
    console.error('[INFO] Running score tool...');
    scoreReportPath = await runScoreTool(options.jd, outdir);
  }

  // Handle cover lint report
  let coverLintReportPath = options.coverLint || null;
  if (options.runCoverLint && options.draft && options.facts) {
    console.error('[INFO] Running cover lint tool...');
    coverLintReportPath = await runCoverLintTool(options.draft, options.facts, outdir);
  }

  // Copy inputs to packet
  const outputs: string[] = [];

  let scoreContent: string | null = null;
  let scoreSummary: ScoreSummary | null = null;
  if (scoreReportPath) {
    try {
      scoreContent = await readFile(scoreReportPath, 'utf-8');
      scoreSummary = extractScoreSummary(scoreContent);
      const dest = join(outdir, 'score-report.md');
      await copyFile(scoreReportPath, dest);
      outputs.push('score-report.md');
    } catch (err) {
      warnings.push(`Failed to read score report: ${err}`);
    }
  } else {
    warnings.push('No score report provided');
  }

  let lintContent: string | null = null;
  let lintSummary: LintSummary | null = null;
  if (coverLintReportPath) {
    try {
      lintContent = await readFile(coverLintReportPath, 'utf-8');
      lintSummary = extractLintSummary(lintContent);
      const dest = join(outdir, 'cover-lint-report.md');
      await copyFile(coverLintReportPath, dest);
      outputs.push('cover-lint-report.md');
    } catch (err) {
      warnings.push(`Failed to read cover lint report: ${err}`);
    }
  } else {
    warnings.push('No cover lint report provided');
  }

  if (options.facts) {
    try {
      const dest = join(outdir, 'facts.json');
      await copyFile(options.facts, dest);
      outputs.push('facts.json');
    } catch (err) {
      warnings.push(`Failed to copy facts: ${err}`);
    }
  } else {
    warnings.push('No facts provided');
  }

  if (options.jd) {
    try {
      const dest = join(outdir, 'jd.txt');
      await copyFile(options.jd, dest);
      outputs.push('jd.txt');
    } catch (err) {
      warnings.push(`Failed to copy JD: ${err}`);
    }
  }

  if (options.draft) {
    try {
      const dest = join(outdir, 'cover-draft.md');
      await copyFile(options.draft, dest);
      outputs.push('cover-draft.md');
    } catch (err) {
      warnings.push(`Failed to copy draft: ${err}`);
    }
  }

  // Generate PACK.md
  const packMd = generatePackMd(scoreSummary, lintSummary, outputs, warnings);
  const packPath = join(outdir, 'PACK.md');
  await mkdir(outdir, { recursive: true });
  await import('node:fs/promises').then((fs) => fs.writeFile(packPath, packMd, 'utf-8'));
  outputs.push('PACK.md');

  // Generate APPROVAL.md
  const approvalMd = generateApprovalMd(scoreSummary, lintSummary);
  const approvalPath = join(outdir, 'APPROVAL.md');
  await import('node:fs/promises').then((fs) => fs.writeFile(approvalPath, approvalMd, 'utf-8'));
  outputs.push('APPROVAL.md');

  // Generate manifest.json
  const manifest: PacketManifest = {
    tool: 'career-application-packet-assemble',
    version: VERSION,
    timestamp,
    packetDate,
    inputs: {
      scoreReportPath,
      coverLintReportPath,
      factsPath: options.facts || null,
      jdPath: options.jd || null,
    },
    runOptions: {
      ranScore: options.runScore || false,
      ranCoverLint: options.runCoverLint || false,
    },
    outputs,
    checks: {
      hasScoreReport: !!scoreContent,
      hasCoverLintReport: !!lintContent,
      hasFacts: !!options.facts,
      hasApproval: true,
    },
  };

  const manifestPath = join(outdir, 'manifest.json');
  await import('node:fs/promises').then((fs) => fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8'));
  outputs.push('manifest.json');

  return {
    success: true,
    outdir,
    manifest,
    warnings,
  };
}

/**
 * Generate PACK.md
 */
function generatePackMd(
  score: ScoreSummary | null,
  lint: LintSummary | null,
  outputs: string[],
  warnings: string[]
): string {
  const lines: string[] = [];

  lines.push('# Career Application Packet');
  lines.push('');
  lines.push('**Generated:** ' + new Date().toISOString());
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push('This packet contains all materials for one job application:');
  lines.push('');
  lines.push('- Score report (hard gates + scoring)');
  lines.push('- Cover letter lint report (facts validation)');
  lines.push('- Facts snapshot (career-os claims)');
  lines.push('- APPROVAL checklist (safety gates)');
  lines.push('');

  if (score) {
    lines.push('## Score Summary');
    lines.push('');
    lines.push(`- **Company:** ${score.company || 'Unknown'}`);
    lines.push(`- **Title:** ${score.title || 'Unknown'}`);
    lines.push(`- **Total Score:** ${score.totalScore}/10`);
    lines.push(`- **Verdict:** ${score.verdict}`);
    lines.push(`- **Hard Gates:** ${score.gatesPassed ? 'PASS' : 'FAIL'}`);
    lines.push('');
  }

  if (lint) {
    lines.push('## Cover Letter Lint Summary');
    lines.push('');
    lines.push(`- **Total Claims:** ${lint.totalClaims}`);
    lines.push(`- **Matched:** ${lint.matched}`);
    lines.push(`- **Unmatched:** ${lint.unmatched}`);
    lines.push(`- **Suspicious:** ${lint.suspicious}`);
    lines.push(`- **Safe to Apply:** ${lint.safeToApply ? 'YES' : 'NO'}`);
    lines.push('');
  }

  lines.push('## Packet Contents');
  lines.push('');
  outputs.forEach((file, idx) => {
    lines.push(`${idx + 1}. \`${file}\``);
  });
  lines.push('');

  if (warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    warnings.forEach((w, idx) => {
      lines.push(`${idx + 1}. ${w}`);
    });
    lines.push('');
  }

  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review `APPROVAL.md` for safety gates');
  lines.push('2. Verify score ≥8 and all hard gates pass');
  lines.push('3. Verify cover letter lint shows safe to apply');
  lines.push('4. Career bot owns final apply decision');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate APPROVAL.md
 */
function generateApprovalMd(score: ScoreSummary | null, lint: LintSummary | null): string {
  const lines: string[] = [];

  lines.push('# Application Packet Approval Checklist');
  lines.push('');
  lines.push('**Safety gates for Career / CoS:**');
  lines.push('');
  lines.push('## Hard Gates');
  lines.push('');

  if (score) {
    lines.push(`- [ ] Score ≥8 (actual: ${score.totalScore}/10)`);
    lines.push(`- [ ] All hard gates pass (actual: ${score.gatesPassed ? 'PASS' : 'FAIL'})`);
    lines.push(`- [ ] Verdict is "apply" (actual: ${score.verdict})`);
  } else {
    lines.push('- [ ] Score ≥8 (no score report provided)');
    lines.push('- [ ] All hard gates pass (no score report provided)');
  }

  lines.push('');
  lines.push('## Cover Letter');
  lines.push('');

  if (lint) {
    lines.push(`- [ ] All claims matched or safe (actual: unmatched=${lint.unmatched}, suspicious=${lint.suspicious})`);
    lines.push(`- [ ] Safe to apply (actual: ${lint.safeToApply ? 'YES' : 'NO'})`);
  } else {
    lines.push('- [ ] All claims matched or safe (no lint report provided)');
  }

  lines.push('');
  lines.push('## Ownership');
  lines.push('');
  lines.push('- [ ] **Never invent facts or comp** - Only use career-os claims');
  lines.push('- [ ] **Career bot owns apply** - This is an aid, not auto-apply');
  lines.push('- [ ] **No LinkedIn send from this tool** - Career bot handles sends');
  lines.push('');
  lines.push('## Reminders');
  lines.push('');
  lines.push('1. This packet is DRAFT-only');
  lines.push('2. Career bot makes final apply decision');
  lines.push('3. All compensation claims must come from career-os');
  lines.push('4. Score floor: ≥8 required for apply');
  lines.push('5. Lint must show safe to apply');
  lines.push('');

  return lines.join('\n');
}
