import * as fs from 'fs';
import * as path from 'path';
import { GroupedSuggestions, ManifestOutput } from './types.js';

export function writeApplyChecklist(
  outdir: string,
  grouped: GroupedSuggestions,
  month?: string
): string {
  const outputPath = path.join(outdir, 'APPLY-CHECKLIST.md');
  
  let content = '# Merchant Alias Apply Checklist\n\n';
  content += `Generated: ${new Date().toISOString()}\n`;
  if (month) {
    content += `Month: ${month}\n`;
  }
  content += '\n';
  
  content += '**Instructions:** Review each proposed merchant→alias mapping below. Check the box when verified and ready to apply.\n\n';
  content += '⚠️ **Do NOT apply to Google Sheet until H2 approval is received.**\n\n';
  content += '---\n\n';
  
  let itemNum = 1;
  
  if (grouped.high.length > 0) {
    content += '## High Confidence Mappings\n\n';
    content += 'These suggestions have strong pattern matches (score ≥ 0.7).\n\n';
    
    grouped.high.forEach(sug => {
      content += `### ${itemNum}. [ ] ${sug.merchant} → ${sug.topMatch.alias}\n\n`;
      content += `- **Score:** ${sug.topMatch.score.toFixed(3)}\n`;
      if (sug.topMatch.matchedPattern) {
        content += `- **Pattern:** ${sug.topMatch.matchedPattern}\n`;
      }
      content += '\n';
      itemNum++;
    });
  }
  
  if (grouped.medium.length > 0) {
    content += '## Medium Confidence Mappings\n\n';
    content += 'These suggestions have moderate pattern matches (score 0.5–0.7). Review carefully.\n\n';
    
    grouped.medium.forEach(sug => {
      content += `### ${itemNum}. [ ] ${sug.merchant} → ${sug.topMatch.alias}\n\n`;
      content += `- **Score:** ${sug.topMatch.score.toFixed(3)}\n`;
      if (sug.topMatch.matchedPattern) {
        content += `- **Pattern:** ${sug.topMatch.matchedPattern}\n`;
      }
      content += '\n';
      itemNum++;
    });
  }
  
  content += '---\n\n';
  content += `**Total mappings:** ${grouped.high.length + grouped.medium.length}\n\n`;
  content += '**Next steps:**\n\n';
  content += '1. Review and check each mapping\n';
  content += '2. Obtain H2 approval\n';
  content += '3. Apply approved aliases to Budget sheet manually\n';

  fs.writeFileSync(outputPath, content);
  return outputPath;
}

export function writeSkipped(
  outdir: string,
  grouped: GroupedSuggestions,
  noMatches: string[]
): string {
  const outputPath = path.join(outdir, 'SKIPPED.md');
  
  let content = '# Skipped Items\n\n';
  content += `Generated: ${new Date().toISOString()}\n\n`;
  
  content += 'The following items were excluded from the apply checklist due to low confidence or no match.\n\n';
  
  if (grouped.low.length > 0) {
    content += '## Low Confidence Suggestions\n\n';
    content += 'These suggestions have weak pattern matches (score 0.4–0.5). Manual research recommended.\n\n';
    
    grouped.low.forEach((sug, idx) => {
      content += `${idx + 1}. **${sug.merchant}**\n`;
      content += `   - Suggested: ${sug.topMatch.alias} (score: ${sug.topMatch.score.toFixed(3)})\n`;
      if (sug.topMatch.matchedPattern) {
        content += `   - Pattern: ${sug.topMatch.matchedPattern}\n`;
      }
      content += '\n';
    });
  }
  
  if (noMatches.length > 0) {
    content += '## No Match Found\n\n';
    content += 'These merchants had no alias matches above the minimum score threshold.\n\n';
    
    noMatches.forEach((merchant, idx) => {
      content += `${idx + 1}. ${merchant}\n`;
    });
    content += '\n';
  }
  
  if (grouped.low.length === 0 && noMatches.length === 0) {
    content += 'None — all suggestions were high or medium confidence.\n';
  }
  
  content += '\n**Next steps:**\n\n';
  content += '1. Research each merchant manually\n';
  content += '2. Create new alias patterns if appropriate\n';
  content += '3. Update aliases file and re-run ledger-merchant-alias-suggest\n';

  fs.writeFileSync(outputPath, content);
  return outputPath;
}

export function writeApproval(outdir: string): string {
  const outputPath = path.join(outdir, 'APPROVAL.md');
  
  const content = `# APPROVAL — Alias Apply Workflow

## What This Tool Did

✅ **Parsed suggestions** from ledger-merchant-alias-suggest output  
✅ **Grouped by confidence** (high/medium/low) using score thresholds  
✅ **Generated apply checklist** with numbered merchant→alias mappings for human tick-off  
✅ **Excluded low-confidence items** to SKIPPED.md for manual research  
✅ **Never invented amounts or aliases** — pass-through from suggestion tool only  
✅ **Offline and read-only** — no Google Sheets API or network calls  

## What Ledger Owns

- **Alias approval** — H2 gate required before any Google Sheet writes
- **Sheet writes** — Ledger owns Budget sheet; Coding/CoS never write Budget directly
- **Manual research** — Investigate skipped items using public sources (S1 approval)
- **Alias pattern maintenance** — Update aliases file with new patterns as needed

## Out of Scope

❌ **No auto-apply** — This tool never writes to Google Sheets  
❌ **No invented amounts** — Tool works with names/patterns only  
❌ **No invented aliases** — All suggestions come from ledger-merchant-alias-suggest  
❌ **No auto-categorization** — Human review required for every mapping  

## Required Approval Gates

Per \`docs/automation/approval-gates.md\`:

- **S1:** Ledger research using public sources (standing approval)
- **H2:** Required before any Google Sheet writes or alias rule changes

## Hard Constraints

1. **Offline only** — No Google Sheets API, no network calls
2. **Read-only** — Never modifies input files
3. **H2 before sheet writes** — Human approval gate enforced
4. **Amounts stay in files** — Never paste transaction amounts into prose

## Workflow Integration

This tool sits between \`ledger-merchant-alias-suggest\` and manual Budget sheet updates:

\`\`\`
ledger-merchant-alias-suggest → ledger-alias-apply-checklist → H2 approval → Manual sheet update
\`\`\`

## Next Steps

1. ✅ Review \`APPLY-CHECKLIST.md\` — verify each merchant→alias mapping
2. ✅ Check boxes for confirmed mappings
3. ✅ Review \`SKIPPED.md\` — manually research low-confidence/no-match items
4. ⚠️ **Get H2 approval** before applying any changes to Google Sheet
5. ✅ Apply approved aliases to Budget sheet manually

---

**Reminder:** Ledger owns Budget sheet writes. Coding/CoS provides tooling only.
`;

  fs.writeFileSync(outputPath, content);
  return outputPath;
}

export function writeManifest(
  outdir: string,
  inputFiles: { suggestions?: string; suggestionsMd?: string; noMatch?: string },
  outputFiles: string[],
  stats: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    skipped: number;
    totalMappings: number;
  },
  month?: string
): string {
  const outputPath = path.join(outdir, 'manifest.json');
  
  const manifest: ManifestOutput = {
    tool: 'ledger-alias-apply-checklist',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    month,
    inputFiles,
    outputFiles: outputFiles.map(f => path.basename(f)),
    stats
  };

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  return outputPath;
}
