import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BriefSections, ManifestEntry } from './types.js';
import { generateTeamBrief, generateGuestWelcomeStub } from './brief-generator.js';

export function writeOutputs(
  day: string,
  sections: BriefSections,
  outdir: string,
  facts?: Record<string, string>
): void {
  mkdirSync(outdir, { recursive: true });
  
  const manifest: ManifestEntry[] = [];
  
  const teamBrief = generateTeamBrief(day, sections, facts);
  const teamBriefPath = join(outdir, 'draft-team-group-whatsapp.txt');
  writeFileSync(teamBriefPath, teamBrief, 'utf-8');
  manifest.push({
    filename: 'draft-team-group-whatsapp.txt',
    type: 'team-message',
  });
  
  if (sections.arrivals.length > 0) {
    const stubsDir = join(outdir, 'draft-guest-welcome-stubs');
    mkdirSync(stubsDir, { recursive: true });
    
    sections.arrivals.forEach(booking => {
      const sanitizedName = booking.guestName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      const stub = generateGuestWelcomeStub(booking);
      const stubPath = join(stubsDir, `${sanitizedName}.txt`);
      writeFileSync(stubPath, stub, 'utf-8');
      
      manifest.push({
        filename: `draft-guest-welcome-stubs/${sanitizedName}.txt`,
        type: 'guest-stub',
        guest: booking.guestName,
      });
    });
  }
  
  const approvalDoc = generateApprovalDoc(day, sections);
  const approvalPath = join(outdir, 'APPROVAL.md');
  writeFileSync(approvalPath, approvalDoc, 'utf-8');
  manifest.push({
    filename: 'APPROVAL.md',
    type: 'approval',
  });
  
  const manifestPath = join(outdir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  manifest.push({
    filename: 'manifest.json',
    type: 'manifest',
  });
  
  console.log(`\n✅ Outputs written to: ${outdir}`);
  console.log(`   📄 ${manifest.length} files generated`);
  console.log(`   🛬 ${sections.arrivals.length} arrival(s)`);
  console.log(`   🏠 ${sections.inhouse.length} in-house`);
  console.log(`   🛫 ${sections.departures.length} departure(s)`);
}

function generateApprovalDoc(day: string, sections: BriefSections): string {
  const lines: string[] = [];
  
  lines.push('# APPROVAL REQUIRED');
  lines.push('');
  lines.push(`**Date:** ${day}`);
  lines.push(`**Property:** Dullstroom The Browns Luxury Guest Suites`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Arrivals:** ${sections.arrivals.length}`);
  lines.push(`- **In-house:** ${sections.inhouse.length}`);
  lines.push(`- **Departures:** ${sections.departures.length}`);
  lines.push('');
  lines.push('## Files Generated');
  lines.push('');
  lines.push('- `draft-team-group-whatsapp.txt` - Daily ops brief for team WhatsApp group');
  if (sections.arrivals.length > 0) {
    lines.push('- `draft-guest-welcome-stubs/` - Welcome message stubs (use browns-guest-comms-draft for full messages)');
  }
  lines.push('- `manifest.json` - File inventory');
  lines.push('');
  lines.push('## ⚠️ BEFORE SENDING');
  lines.push('');
  lines.push('1. **Review all guest names** - Verify spelling and suite assignments');
  lines.push('2. **Check special requests** - Confirm all notes are accurate');
  lines.push('3. **Verify timing** - Late check-ins flagged correctly');
  lines.push('4. **Never send without Grant/Ops approval** - This tool generates DRAFTS ONLY');
  lines.push('');
  lines.push('## Safety Rules');
  lines.push('');
  lines.push('- ❌ NO auto-send to WhatsApp or email');
  lines.push('- ❌ NO invented rates or amounts');
  lines.push('- ❌ NO modifications to NightsBridge/calendar');
  lines.push('- ✅ Draft review workflow only');
  lines.push('- ✅ Human approval required for every send');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Approval phrase (when ready):**  ');
  lines.push('`APPROVE SEND DAILY BRIEF ${day}`');
  
  return lines.join('\n');
}
