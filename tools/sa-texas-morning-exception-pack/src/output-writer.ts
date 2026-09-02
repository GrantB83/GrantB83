import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ExceptionSection, PackManifest } from './types.js';

export function writeOutputs(
  date: string,
  hospitalitySection: ExceptionSection,
  heavyMetalSection: ExceptionSection,
  notesSection: ExceptionSection,
  outdir: string,
  manifest: PackManifest
): void {
  mkdirSync(outdir, { recursive: true });
  
  writePACK(date, outdir, manifest);
  
  writeHospitalityMd(date, hospitalitySection, outdir);
  
  writeHeavyMetalMd(date, heavyMetalSection, outdir);
  
  writeAPPROVAL(date, outdir);
  
  writeManifest(manifest, outdir);
  
  console.log(`\n✓ Pack generated successfully in: ${outdir}`);
  console.log('\nOutput files:');
  console.log('  - PACK.md');
  console.log('  - hospitality.md');
  console.log('  - heavy-metal.md');
  console.log('  - APPROVAL.md');
  console.log('  - manifest.json');
}

function writePACK(date: string, outdir: string, manifest: PackManifest): void {
  const sections: string[] = [];
  
  sections.push(`# SA Texas-Morning Exception Pack — ${date}`);
  sections.push('');
  sections.push('**Scope:** Heavy Metal + hospitality / The Browns only');
  sections.push('**Perfect Water:** Excluded');
  sections.push('**Generated:** America/Chicago timezone context');
  sections.push('');
  
  sections.push('## Contents');
  sections.push('');
  sections.push('1. [hospitality.md](./hospitality.md) — The Browns Dullstroom exceptional bookings');
  sections.push('2. [heavy-metal.md](./heavy-metal.md) — Heavy Metal Sand & Stone open quotes');
  sections.push('3. [APPROVAL.md](./APPROVAL.md) — Safety gates and CoS ownership');
  sections.push('');
  
  sections.push('## Data Sources');
  sections.push('');
  
  if (manifest.sources.brownsBookings) {
    sections.push(`- **Browns bookings:** ${manifest.sources.brownsBookings}`);
  } else {
    sections.push('- **Browns bookings:** Not provided');
  }
  
  if (manifest.sources.hmQuotesDir) {
    sections.push(`- **HM quotes directory:** ${manifest.sources.hmQuotesDir}`);
  } else {
    sections.push('- **HM quotes directory:** Not provided');
  }
  
  if (manifest.sources.notes) {
    sections.push(`- **Exception notes:** ${manifest.sources.notes}`);
  } else {
    sections.push('- **Exception notes:** Not provided');
  }
  
  sections.push('');
  
  if (manifest.warnings.length > 0) {
    sections.push('## Warnings');
    sections.push('');
    for (const warning of manifest.warnings) {
      sections.push(`⚠️  ${warning}`);
    }
    sections.push('');
  }
  
  sections.push('## Next Steps');
  sections.push('');
  sections.push('1. Review `hospitality.md` for Browns exceptional bookings');
  sections.push('2. Review `heavy-metal.md` for Heavy Metal open quotes');
  sections.push('3. Review `APPROVAL.md` for safety gates');
  sections.push('4. **NEVER AUTO-SEND** — CoS owns WhatsApp workflow');
  sections.push('5. Manual WhatsApp posting via Coexistence of Service only');
  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push('**Generated at:** ' + manifest.generatedAt);
  
  writeFileSync(join(outdir, 'PACK.md'), sections.join('\n'));
}

function writeHospitalityMd(
  date: string,
  section: ExceptionSection,
  outdir: string
): void {
  const lines: string[] = [];
  
  lines.push(`# Hospitality / The Browns — ${date}`);
  lines.push('');
  lines.push('**Property:** The Browns Luxury Guest Suites Dullstroom');
  lines.push('**Scope:** Exceptional bookings only');
  lines.push('');
  
  lines.push('## Exception Items');
  lines.push('');
  
  if (section.items.length === 0) {
    lines.push('No exceptional items identified.');
  } else {
    for (const item of section.items) {
      if (!item.startsWith('-') && !item.startsWith('*')) {
        lines.push(`- ${item}`);
      } else {
        lines.push(item);
      }
    }
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Note:** This digest includes only exceptional bookings with special requests or notable flags.');
  lines.push('Standard arrivals/departures are handled via `browns-daily-ops-brief`.');
  
  writeFileSync(join(outdir, 'hospitality.md'), lines.join('\n'));
}

function writeHeavyMetalMd(
  date: string,
  section: ExceptionSection,
  outdir: string
): void {
  const lines: string[] = [];
  
  lines.push(`# Heavy Metal Sand & Stone — ${date}`);
  lines.push('');
  lines.push('**Trading Name:** Heavy Metal Sand & Stone');
  lines.push('**Location:** Dullstroom (yard)');
  lines.push('**Scope:** Open quotes requiring follow-up');
  lines.push('');
  
  lines.push('## Open Quotes');
  lines.push('');
  
  if (section.items.length === 0) {
    lines.push('No open quotes identified.');
  } else {
    for (const item of section.items) {
      lines.push(item);
    }
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Note:** Quote filenames only. Never invents rates, volumes, or customer facts.');
  lines.push('Review individual quote files for details.');
  
  writeFileSync(join(outdir, 'heavy-metal.md'), lines.join('\n'));
}

function writeAPPROVAL(date: string, outdir: string): void {
  const lines: string[] = [];
  
  lines.push(`# APPROVAL — SA Texas-Morning Exception Pack — ${date}`);
  lines.push('');
  lines.push('## Safety Gates');
  lines.push('');
  lines.push('### Critical Rules');
  lines.push('');
  lines.push('- ✅ **DRAFT ONLY** — Never auto-send');
  lines.push('- ✅ **CoS owns WhatsApp** — All sends via Coexistence of Service');
  lines.push('- ✅ **Never invents rates** — Heavy Metal pricing stays manual');
  lines.push('- ✅ **Never invents volumes** — Heavy Metal quantities from source only');
  lines.push('- ✅ **Never invents guest facts** — Browns data from bookings only');
  lines.push('- ✅ **Perfect Water excluded** — Not in scope for this pack');
  lines.push('- ⚠️  **Manual review required** — Every pack before WhatsApp posting');
  lines.push('');
  
  lines.push('### Approval Workflow');
  lines.push('');
  lines.push('1. **CoS reviews** `PACK.md`, `hospitality.md`, `heavy-metal.md`');
  lines.push('2. **CoS verifies** all flagged exceptions and missing data');
  lines.push('3. **CoS drafts** WhatsApp messages manually');
  lines.push('4. **CoS posts** via Coexistence of Service only');
  lines.push('5. **Never bypass** manual approval gates');
  lines.push('');
  
  lines.push('### Scope Boundaries');
  lines.push('');
  lines.push('**In scope:**');
  lines.push('- Heavy Metal Sand & Stone open quotes (filenames only)');
  lines.push('- The Browns exceptional bookings (special requests, timing notes)');
  lines.push('');
  lines.push('**Out of scope:**');
  lines.push('- Perfect Water operations');
  lines.push('- Standard Browns arrivals/departures (use `browns-daily-ops-brief`)');
  lines.push('- Heavy Metal quote details (review individual files)');
  lines.push('- Any automated WhatsApp sending');
  lines.push('');
  
  lines.push('---');
  lines.push('');
  lines.push('**Generated for:** Chief of Staff (CoS) manual workflow only');
  lines.push('**Timezone context:** America/Chicago (Texas morning)');
  lines.push('**Target desk:** SA Ops / CoS');
  
  writeFileSync(join(outdir, 'APPROVAL.md'), lines.join('\n'));
}

function writeManifest(manifest: PackManifest, outdir: string): void {
  writeFileSync(
    join(outdir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
}
