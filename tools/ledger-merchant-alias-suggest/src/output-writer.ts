import * as fs from 'fs';
import * as path from 'path';
import { MerchantSuggestion, SuggestionOutput, ManifestOutput } from './types.js';

export function writeSuggestionsJson(
  outdir: string,
  suggestions: MerchantSuggestion[],
  noMatches: string[],
  minScore: number
): string {
  const outputPath = path.join(outdir, 'suggestions.json');
  
  const output: SuggestionOutput = {
    suggestions,
    noMatches,
    generatedAt: new Date().toISOString(),
    minScore,
    totalMerchants: suggestions.length + noMatches.length
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  return outputPath;
}

export function writeSuggestionsMd(
  outdir: string,
  suggestions: MerchantSuggestion[]
): string {
  const outputPath = path.join(outdir, 'suggestions.md');
  
  let content = '# Merchant Alias Suggestions\n\n';
  content += `Generated: ${new Date().toISOString()}\n\n`;
  content += `Total suggestions: ${suggestions.length}\n\n`;
  
  const highConf = suggestions.filter(s => s.confidence === 'high');
  const medConf = suggestions.filter(s => s.confidence === 'medium');
  const lowConf = suggestions.filter(s => s.confidence === 'low');
  
  content += `- High confidence: ${highConf.length}\n`;
  content += `- Medium confidence: ${medConf.length}\n`;
  content += `- Low confidence: ${lowConf.length}\n\n`;
  content += '---\n\n';
  
  content += '## High Confidence (score ≥ 0.7)\n\n';
  if (highConf.length === 0) {
    content += 'None\n\n';
  } else {
    highConf.forEach((sug, idx) => {
      content += `### ${idx + 1}. ${sug.merchant}\n\n`;
      content += `**Suggested alias:** ${sug.topMatch.alias}\n\n`;
      content += `**Score:** ${sug.topMatch.score.toFixed(3)}\n\n`;
      if (sug.topMatch.matchedPattern) {
        content += `**Matched pattern:** ${sug.topMatch.matchedPattern}\n\n`;
      }
      if (sug.allMatches.length > 1) {
        content += '**Other matches:**\n\n';
        sug.allMatches.slice(1, 4).forEach(m => {
          content += `- ${m.alias} (${m.score.toFixed(3)})`;
          if (m.matchedPattern) {
            content += ` — pattern: ${m.matchedPattern}`;
          }
          content += '\n';
        });
        content += '\n';
      }
    });
  }
  
  content += '## Medium Confidence (score 0.5–0.7)\n\n';
  if (medConf.length === 0) {
    content += 'None\n\n';
  } else {
    medConf.forEach((sug, idx) => {
      content += `### ${highConf.length + idx + 1}. ${sug.merchant}\n\n`;
      content += `**Suggested alias:** ${sug.topMatch.alias}\n\n`;
      content += `**Score:** ${sug.topMatch.score.toFixed(3)}\n\n`;
      if (sug.topMatch.matchedPattern) {
        content += `**Matched pattern:** ${sug.topMatch.matchedPattern}\n\n`;
      }
      if (sug.allMatches.length > 1) {
        content += '**Other matches:**\n\n';
        sug.allMatches.slice(1, 4).forEach(m => {
          content += `- ${m.alias} (${m.score.toFixed(3)})`;
          if (m.matchedPattern) {
            content += ` — pattern: ${m.matchedPattern}`;
          }
          content += '\n';
        });
        content += '\n';
      }
    });
  }
  
  content += '## Low Confidence (score 0.4–0.5)\n\n';
  content += '⚠️ **Review carefully** — these suggestions may be incorrect.\n\n';
  if (lowConf.length === 0) {
    content += 'None\n\n';
  } else {
    lowConf.forEach((sug, idx) => {
      content += `### ${highConf.length + medConf.length + idx + 1}. ${sug.merchant}\n\n`;
      content += `**Suggested alias:** ${sug.topMatch.alias}\n\n`;
      content += `**Score:** ${sug.topMatch.score.toFixed(3)}\n\n`;
      if (sug.topMatch.matchedPattern) {
        content += `**Matched pattern:** ${sug.topMatch.matchedPattern}\n\n`;
      }
      if (sug.allMatches.length > 1) {
        content += '**Other matches:**\n\n';
        sug.allMatches.slice(1, 4).forEach(m => {
          content += `- ${m.alias} (${m.score.toFixed(3)})`;
          if (m.matchedPattern) {
            content += ` — pattern: ${m.matchedPattern}`;
          }
          content += '\n';
        });
        content += '\n';
      }
    });
  }

  fs.writeFileSync(outputPath, content);
  return outputPath;
}

export function writeNoMatchMd(
  outdir: string,
  noMatches: string[]
): string {
  const outputPath = path.join(outdir, 'no-match.md');
  
  let content = '# No Match Found\n\n';
  content += `Generated: ${new Date().toISOString()}\n\n`;
  content += `Total: ${noMatches.length}\n\n`;
  
  if (noMatches.length === 0) {
    content += 'All merchants matched.\n';
  } else {
    content += 'The following merchants had no alias matches above the minimum score threshold.\n\n';
    content += '**Next steps:**\n\n';
    content += '1. Research each merchant manually\n';
    content += '2. Create new alias patterns if appropriate\n';
    content += '3. Update aliases file\n';
    content += '4. Re-run suggest tool\n\n';
    content += '---\n\n';
    
    noMatches.forEach((merchant, idx) => {
      content += `${idx + 1}. ${merchant}\n`;
    });
  }

  fs.writeFileSync(outputPath, content);
  return outputPath;
}

export function writeApproval(outdir: string): string {
  const outputPath = path.join(outdir, 'APPROVAL.md');
  
  const content = `# APPROVAL — Merchant Alias Suggestions

## What This Tool Did

✅ **Scored unmatched merchants** against known alias patterns using heuristic token overlap (Jaccard similarity)  
✅ **Ranked suggestions** by confidence (high/medium/low) based on score thresholds  
✅ **Flagged no-match merchants** that need manual research  
✅ **Never invented dollar amounts** — this tool does not handle transaction amounts  

## What Ledger Owns

- **Alias approval** — Review all suggestions before applying
- **Google Sheet writes** — H2 approval required before any sheet updates
- **Manual research** — Investigate no-match merchants using public sources (S1 approval)
- **Alias pattern maintenance** — Update aliases file with new patterns as needed

## Out of Scope

❌ **No auto-apply** — Never writes aliases to live Budget sheet  
❌ **No invented amounts** — Tool never handles or invents transaction amounts  
❌ **No auto-categorization** — Human review required for every suggestion  
❌ **No payment actions** — This is a research aid only  

## Required Approval Gates

Per \`docs/automation/approval-gates.md\`:

- **S1:** Ledger research using public sources (standing approval)
- **H2:** Required before any Google Sheet writes or alias rule changes

## Next Steps

1. ✅ Review \`suggestions.md\` (all confidence levels)
2. ✅ Verify high-confidence suggestions are correct
3. ✅ Manually research no-match merchants (\`no-match.md\`)
4. ✅ Update aliases file with new patterns
5. ⚠️ Get H2 approval before applying changes to Google Sheet
6. ✅ Apply approved aliases to Budget sheet manually

---

**Reminder:** Amounts stay in source files. Never paste dollar amounts into chat or prose.
`;

  fs.writeFileSync(outputPath, content);
  return outputPath;
}

export function writeManifest(
  outdir: string,
  inputFiles: { merchants?: string; unmatched?: string; aliases: string },
  outputFiles: string[],
  stats: {
    totalMerchants: number;
    withSuggestions: number;
    noMatch: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  },
  minScore: number
): string {
  const outputPath = path.join(outdir, 'manifest.json');
  
  const manifest: ManifestOutput = {
    tool: 'ledger-merchant-alias-suggest',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    inputFiles,
    outputFiles: outputFiles.map(f => path.basename(f)),
    stats,
    config: { minScore }
  };

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  return outputPath;
}
