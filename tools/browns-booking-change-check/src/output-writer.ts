import { mkdirSync, writeFileSync } from 'fs';
import { ChangeRecord, OutputSummary, ManifestEntry } from './types.js';
import { generateMarkdownReport } from './report-generator.js';

export function writeOutputs(
  changes: ChangeRecord[],
  outdir: string,
  summary: OutputSummary,
  day?: string
): void {
  mkdirSync(outdir, { recursive: true });
  
  // changes.json
  const changesJson = {
    summary,
    changes
  };
  writeFileSync(`${outdir}/changes.json`, JSON.stringify(changesJson, null, 2), 'utf-8');
  
  // changes.md
  const changesMd = generateMarkdownReport(changes, day);
  writeFileSync(`${outdir}/changes.md`, changesMd, 'utf-8');
  
  // APPROVAL.md
  const approvalMd = generateApprovalDoc(summary, day);
  writeFileSync(`${outdir}/APPROVAL.md`, approvalMd, 'utf-8');
  
  // manifest.json
  const manifest: ManifestEntry[] = [
    { filename: 'changes.json', type: 'changes-json', recordCount: changes.length },
    { filename: 'changes.md', type: 'changes-md', recordCount: changes.length },
    { filename: 'APPROVAL.md', type: 'approval' },
    { filename: 'manifest.json', type: 'manifest' }
  ];
  writeFileSync(`${outdir}/manifest.json`, JSON.stringify(manifest, null, 2), 'utf-8');
}

function generateApprovalDoc(summary: OutputSummary, day?: string): string {
  const lines: string[] = [];
  
  lines.push('# Booking Change Check - Approval Required');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  
  if (day) {
    lines.push(`- **Target Day:** ${day}`);
  }
  lines.push(`- **Additions:** ${summary.adds}`);
  lines.push(`- **Removals:** ${summary.removes}`);
  lines.push(`- **Updates:** ${summary.updates}`);
  lines.push(`- **Total Changes:** ${summary.total}`);
  lines.push('');
  lines.push(`- **Before Hash:** ${summary.beforeHash}`);
  lines.push(`- **After Hash:** ${summary.afterHash}`);
  lines.push('');
  
  lines.push('## File Inventory');
  lines.push('');
  lines.push('- `changes.json` - Structured change records');
  lines.push('- `changes.md` - Human-readable numbered digest');
  lines.push('- `APPROVAL.md` - This file');
  lines.push('- `manifest.json` - Metadata');
  lines.push('');
  
  lines.push('## Pre-Post Checklist');
  lines.push('');
  lines.push('Before posting guest-comms or daily-ops drafts to WhatsApp Admin:');
  lines.push('');
  lines.push('- [ ] Review all additions, removals, and updates in `changes.md`');
  lines.push('- [ ] Verify guest names are correct');
  lines.push('- [ ] Check suite assignments make sense');
  lines.push('- [ ] Confirm dates are valid');
  lines.push('- [ ] No invented rates or amounts present');
  lines.push('- [ ] Missing fields are acceptable or resolved');
  lines.push('');
  
  lines.push('## Safety Rules');
  lines.push('');
  lines.push('- ✅ **Offline only** - No API calls, no auto-send');
  lines.push('- ✅ **DRAFT ONLY** - Never auto-posts to WhatsApp or email');
  lines.push('- ✅ **No invented data** - Missing fields flagged, never fabricated');
  lines.push('- ✅ **No rates/amounts** - This tool does not handle pricing');
  lines.push('- ⚠️ **CoS owns send path** - WhatsApp Admin posting requires human approval');
  lines.push('');
  
  lines.push('## Usage Context');
  lines.push('');
  lines.push('This report is for **last-minute booking change checks** before CoS posts:');
  lines.push('- Guest-comms drafts (pre-arrival messages)');
  lines.push('- Daily-ops briefs (team WhatsApp messages)');
  lines.push('');
  lines.push('**Typical workflow:**');
  lines.push('1. Export bookings before CT-pack preparation (e.g., 19:00 SAST)');
  lines.push('2. Export bookings after CT-pack preparation (e.g., 20:45 SAST)');
  lines.push('3. Run this tool to diff snapshots');
  lines.push('4. Review changes.md for last-minute updates');
  lines.push('5. Update drafts if changes affect guest-comms or ops brief');
  lines.push('6. Post to WhatsApp Admin after approval');
  lines.push('');
  
  lines.push('## Approval Phrase');
  lines.push('');
  lines.push('When ready to proceed:');
  lines.push('');
  if (day) {
    lines.push(`\`\`\`
APPROVE POST CT-PACK ${day}
\`\`\``);
  } else {
    lines.push('```');
    lines.push('APPROVE POST CT-PACK YYYY-MM-DD');
    lines.push('```');
  }
  lines.push('');
  
  lines.push('---');
  lines.push('');
  lines.push('**Remember:** CoS SA Ops runs this check, not an automation. Human judgment required.');
  lines.push('');
  
  return lines.join('\n');
}
