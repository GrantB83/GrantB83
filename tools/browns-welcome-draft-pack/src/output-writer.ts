import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { WelcomeStub, ManifestData } from './types.js';

interface OutputContext {
  asOfDate: string;
  windowDays: number;
  totalBookings: number;
  outdir: string;
}

/**
 * Write all output files to outdir
 */
export function writeOutputs(
  stubs: WelcomeStub[],
  ctx: OutputContext
): void {
  // Create output directories
  mkdirSync(ctx.outdir, { recursive: true });
  const draftsDir = join(ctx.outdir, 'drafts');
  mkdirSync(draftsDir, { recursive: true });

  // Write individual draft files
  for (const stub of stubs) {
    const draftPath = join(draftsDir, `${stub.safeName}.md`);
    writeFileSync(draftPath, stub.content, 'utf-8');
  }

  // Write queue.md (numbered list)
  writeQueueFile(stubs, ctx.outdir);

  // Write missing-fields.md
  writeMissingFieldsFile(stubs, ctx.outdir);

  // Write APPROVAL.md
  writeApprovalFile(ctx.outdir);

  // Write manifest.json
  writeManifestFile(stubs, ctx);
}

function writeQueueFile(stubs: WelcomeStub[], outdir: string): void {
  const lines: string[] = [];

  lines.push('# Welcome Message Queue');
  lines.push('');
  lines.push('**Purpose:** Same-day/upcoming welcome message stubs for CoS WhatsApp Admin - The Browns.');
  lines.push('');
  lines.push('**⚠️ DRAFT ONLY:** Never auto-sends. CoS posts to Admin after Grant approval.');
  lines.push('');
  lines.push('---');
  lines.push('');

  if (stubs.length === 0) {
    lines.push('_No welcome messages in queue._');
  } else {
    stubs.forEach((stub, idx) => {
      lines.push(`## ${idx + 1}. ${stub.guestName} — ${formatDate(stub.checkInDate)}`);
      lines.push('');
      
      // Only missing phone blocks; missing rate is ops-only and never blocks
      if (!stub.hasPhone) {
        lines.push(`**🚫 BLOCKED:** Missing guest phone`);
        lines.push('');
        lines.push('⚠️ Resolve guest phone from NightsBridge booking detail or Browns/stay inbox before CoS Admin post.');
        lines.push('');
      }

      lines.push(`See: \`drafts/${stub.safeName}.md\``);
      lines.push('');
      lines.push('---');
      lines.push('');
    });
  }

  writeFileSync(join(outdir, 'queue.md'), lines.join('\n'), 'utf-8');
}

function writeMissingFieldsFile(stubs: WelcomeStub[], outdir: string): void {
  const lines: string[] = [];

  lines.push('# Missing Fields Report');
  lines.push('');
  lines.push('**Ops-only tracking.** Never invented. Never embedded in guest-facing WhatsApp draft bodies.');
  lines.push('');
  lines.push('---');
  lines.push('');

  const missingPhone = stubs.filter((s) => !s.hasPhone);
  const missingRate = stubs.filter((s) => !s.hasRate);

  lines.push(`## 🚫 Missing Guest Phone — BLOCKED (${missingPhone.length})`);
  lines.push('');
  lines.push('**Action required:** Resolve from NightsBridge booking detail or Browns/stay inbox before CoS Admin post.');
  lines.push('**Blocks CoS Admin post:** YES — do not send until phone resolved.');
  lines.push('');
  if (missingPhone.length === 0) {
    lines.push('_None._');
  } else {
    missingPhone.forEach((s) => {
      lines.push(`- ${s.guestName} (Check-in: ${s.checkInDate})`);
    });
  }
  lines.push('');

  lines.push(`## Missing Rate Card — Ops-only tracking (${missingRate.length})`);
  lines.push('');
  lines.push('**Note:** Rate cards are ops/pricing only. Never mentioned in guest welcome WhatsApp drafts.');
  lines.push('**Blocks CoS Admin post:** NO — rate gaps do not block guest welcome messages.');
  lines.push('');
  if (missingRate.length === 0) {
    lines.push('_None._');
  } else {
    missingRate.forEach((s) => {
      lines.push(`- ${s.guestName} (Check-in: ${s.checkInDate})`);
    });
  }
  lines.push('');

  writeFileSync(join(outdir, 'missing-fields.md'), lines.join('\n'), 'utf-8');
}

function writeApprovalFile(outdir: string): void {
  const lines: string[] = [];

  lines.push('# APPROVAL — Browns Welcome Draft Pack');
  lines.push('');
  lines.push('## Safety Gates (Grant Law — CoS 6 Sep 2026)');
  lines.push('');
  lines.push('- ✅ **Offline only** — No WhatsApp API or NightsBridge integration');
  lines.push('- ✅ **DRAFT ONLY** — Never sends messages automatically');
  lines.push('- ✅ **Never invents guest phone** — Missing phone → BLOCKED; resolve from NB booking detail or Browns/stay inbox');
  lines.push('- ✅ **Never mentions rates in guest body** — Rate cards are ops/pricing only; never in guest-facing WhatsApp draft text');
  lines.push('- ✅ **No placeholders in guest drafts** — Guest welcome draft bodies never contain `[GUEST_PHONE]` or `[RATE CARD REQUIRED]`');
  lines.push('- ✅ **CoS owns WhatsApp** — Coexistence of Service required for all Admin posts');
  lines.push('');
  lines.push('## Workflow');
  lines.push('');
  lines.push('1. **Review `queue.md`** — Numbered list of welcome stubs; check for BLOCKED status');
  lines.push('2. **Check `missing-fields.md`** — Resolve missing phones from NB booking detail before posting');
  lines.push('3. **Review individual stubs** — Check `drafts/<safe-name>.md` for tone (warm, practical, Dullstroom)');
  lines.push('4. **Grant approval required** — Before posting to WhatsApp Admin - The Browns');
  lines.push('5. **CoS posts to Admin** — Manual copy/paste to WhatsApp Admin - The Browns only');
  lines.push('');
  lines.push('## Hard Rules');
  lines.push('');
  lines.push('1. **NEVER** include rate card language, amounts, or currency in guest welcome WhatsApp draft text');
  lines.push('2. **NEVER** ship `[GUEST_PHONE]` in a draft that CoS would paste to WhatsApp');
  lines.push('3. Missing phone → mark guest **blocked / hold for phone** in queue + missing-fields.md');
  lines.push('4. Missing rate → ops-only tracking (if any); not mentioned in guest WhatsApp body');
  lines.push('');
  lines.push('## Integration Notes');
  lines.push('');
  lines.push('This pack can feed into:');
  lines.push('- `browns-guest-comms-draft` — For full welcome messages');
  lines.push('- `browns-ct-pack-assemble` — For timed CT packs');
  lines.push('');
  lines.push('## Approval Statement');
  lines.push('');
  lines.push('**I confirm:**');
  lines.push('- [ ] Reviewed all welcome stubs in `queue.md`');
  lines.push('- [ ] Verified blocked guests (missing phone) are resolved or will be offline until resolved');
  lines.push('- [ ] No `[GUEST_PHONE]` or `[RATE CARD REQUIRED]` placeholders in guest draft bodies');
  lines.push('- [ ] Tone matches The Browns hospitality standards (warm, practical, Dullstroom)');
  lines.push('- [ ] Ready for CoS to post to WhatsApp Admin - The Browns');
  lines.push('');
  lines.push('**Approved by:** _____________  **Date:** _____________');
  lines.push('');

  writeFileSync(join(outdir, 'APPROVAL.md'), lines.join('\n'), 'utf-8');
}

function writeManifestFile(stubs: WelcomeStub[], ctx: OutputContext): void {
  const skippedNoName = 0; // Already filtered in filter.ts
  const missingPhones = stubs.filter((s) => !s.hasPhone).length;
  const missingRates = stubs.filter((s) => !s.hasRate).length;

  const manifest: ManifestData = {
    toolName: 'browns-welcome-draft-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    asOfDate: ctx.asOfDate,
    windowDays: ctx.windowDays,
    totalBookings: ctx.totalBookings,
    draftCount: stubs.length,
    skippedNoName,
    missingPhones,
    missingRates,
    outdir: ctx.outdir,
  };

  writeFileSync(
    join(ctx.outdir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
  } catch {
    return dateStr;
  }
}
