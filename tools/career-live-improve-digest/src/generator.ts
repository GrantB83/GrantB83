import * as fs from 'fs';
import * as path from 'path';
import { Stats } from './types';
import { sortPatternsByCount } from './analyzer';

export function generateLearningDraft(stats: Stats): string {
  let md = '# Career Hunt Learning Digest\n\n';
  
  // Period
  md += `**Period:** ${stats.period.since} to ${stats.period.until}\n`;
  md += `**Total Days:** ${stats.period.totalDays}\n`;
  md += `**Total Entries:** ${stats.totals.entries}\n`;
  md += `**Actions:** Scored ${stats.totals.scored}, Applied ${stats.totals.applied}, `;
  md += `Skipped ${stats.totals.skipped}, Rejected ${stats.totals.rejected}\n\n`;
  
  // Skip Patterns
  if (Object.keys(stats.skipReasons).length > 0) {
    md += '## Skip Patterns\n\n';
    const sortedSkips = sortPatternsByCount(stats.skipReasons);
    sortedSkips.forEach(([reason, count], idx) => {
      md += `${idx + 1}. **${reason}** (${count} occurrence${count > 1 ? 's' : ''})\n`;
    });
    md += '\n';
  }
  
  // Reject Patterns
  if (Object.keys(stats.rejectReasons).length > 0) {
    md += '## Reject Patterns\n\n';
    const sortedRejects = sortPatternsByCount(stats.rejectReasons);
    sortedRejects.forEach(([reason, count], idx) => {
      md += `${idx + 1}. **${reason}** (${count} occurrence${count > 1 ? 's' : ''})\n`;
    });
    md += '\n';
  }
  
  // Score Patterns
  if (stats.totals.scored > 0) {
    md += '## Score Patterns\n\n';
    let scoreIdx = 1;
    if (stats.scoreBands.excellent_9_10 > 0) {
      md += `${scoreIdx++}. **Excellent (9-10):** ${stats.scoreBands.excellent_9_10} role${stats.scoreBands.excellent_9_10 > 1 ? 's' : ''}\n`;
    }
    if (stats.scoreBands.good_7_8 > 0) {
      md += `${scoreIdx++}. **Good (7-8):** ${stats.scoreBands.good_7_8} role${stats.scoreBands.good_7_8 > 1 ? 's' : ''}\n`;
    }
    if (stats.scoreBands.medium_5_6 > 0) {
      md += `${scoreIdx++}. **Medium (5-6):** ${stats.scoreBands.medium_5_6} role${stats.scoreBands.medium_5_6 > 1 ? 's' : ''}\n`;
    }
    if (stats.scoreBands.low_0_4 > 0) {
      md += `${scoreIdx++}. **Low (0-4):** ${stats.scoreBands.low_0_4} role${stats.scoreBands.low_0_4 > 1 ? 's' : ''}\n`;
    }
    md += '\n';
  }
  
  // Gate Fail Patterns
  if (stats.gateFails.total > 0) {
    md += '## Gate Fail Patterns\n\n';
    md += `**Total Gate Fails:** ${stats.gateFails.total}\n\n`;
    const sortedGateFails = sortPatternsByCount(stats.gateFails.patterns);
    sortedGateFails.forEach(([pattern, count], idx) => {
      md += `${idx + 1}. **${pattern}** (${count} occurrence${count > 1 ? 's' : ''})\n`;
    });
    md += '\n';
  }
  
  // Source Distribution
  if (Object.keys(stats.sources).length > 0) {
    md += '## Source Distribution\n\n';
    const sortedSources = sortPatternsByCount(stats.sources);
    sortedSources.forEach(([source, count]) => {
      md += `- ${source}: ${count} role${count > 1 ? 's' : ''}\n`;
    });
    md += '\n';
  }
  
  // Notes for learning.md
  md += '## Notes for learning.md\n\n';
  md += '_Review patterns above and fold relevant insights into career-os learning.md manually._\n\n';
  md += '**Remember:**\n';
  md += '- Career bot owns apply decisions\n';
  md += '- Never auto-update learning.md\n';
  md += '- Validate all patterns against runs.jsonl\n';
  
  return md;
}

export function generateApproval(): string {
  return `# Career Live-Improve Digest Approval

## Critical Rules

1. **Career owns apply decisions** - This digest is for learning only
2. **Never invents employers** - Only quotes from runs.jsonl
3. **Never invents scores** - Only processes provided scores
4. **Never invents gate outcomes** - Only reports logged gatePass values
5. **Offline only** - No job board APIs or live data
6. **Never auto-updates learning.md** - Career reviews and folds in manually

## Review Checklist

- [ ] All patterns extracted from runs.jsonl
- [ ] No invented skip reasons or patterns
- [ ] Score bands reflect actual distribution
- [ ] Gate fail patterns match logged data
- [ ] Source counts are accurate
- [ ] Period filter applied correctly (if --since used)

## Next Steps

1. Review LEARNING-DRAFT.md
2. Validate patterns against runs.jsonl
3. Fold selected insights into career-os learning.md
4. Career bot uses updated learning.md for future decisions

## Never

- ❌ Auto-apply insights without Career review
- ❌ Invent companies or roles not in log
- ❌ Fabricate skip reasons or gate failures
- ❌ Write directly to learning.md
- ❌ Send applications based on digest alone
`;
}

export function generateManifest(options: {
  tool: string;
  version: string;
  timestamp: string;
  inputs: {
    logPath?: string;
    summaryPath?: string;
    since?: string;
  };
  outputs: {
    learningDraftPath: string;
    statsPath: string;
    approvalPath: string;
    manifestPath: string;
  };
  stats: Stats;
}): string {
  return JSON.stringify({
    tool: options.tool,
    version: options.version,
    timestamp: options.timestamp,
    inputs: options.inputs,
    outputs: options.outputs,
    summary: {
      period: options.stats.period,
      totals: options.stats.totals,
      skipPatternsCount: Object.keys(options.stats.skipReasons).length,
      rejectPatternsCount: Object.keys(options.stats.rejectReasons).length,
      gateFailsCount: options.stats.gateFails.total,
      sourcesCount: Object.keys(options.stats.sources).length
    }
  }, null, 2);
}

export function writeOutputs(outdir: string, stats: Stats, inputs: {
  logPath?: string;
  summaryPath?: string;
  since?: string;
}): void {
  // Create output directory
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  const learningDraftPath = path.join(outdir, 'LEARNING-DRAFT.md');
  const statsPath = path.join(outdir, 'stats.json');
  const approvalPath = path.join(outdir, 'APPROVAL.md');
  const manifestPath = path.join(outdir, 'manifest.json');

  // Generate and write files
  const learningDraft = generateLearningDraft(stats);
  fs.writeFileSync(learningDraftPath, learningDraft, 'utf-8');

  const statsJson = JSON.stringify(stats, null, 2);
  fs.writeFileSync(statsPath, statsJson, 'utf-8');

  const approval = generateApproval();
  fs.writeFileSync(approvalPath, approval, 'utf-8');

  const manifest = generateManifest({
    tool: 'career-live-improve-digest',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    inputs,
    outputs: {
      learningDraftPath,
      statsPath,
      approvalPath,
      manifestPath
    },
    stats
  });
  fs.writeFileSync(manifestPath, manifest, 'utf-8');

  console.log(`✅ Generated outputs in ${outdir}/`);
  console.log(`   - LEARNING-DRAFT.md`);
  console.log(`   - stats.json`);
  console.log(`   - APPROVAL.md`);
  console.log(`   - manifest.json`);
}
