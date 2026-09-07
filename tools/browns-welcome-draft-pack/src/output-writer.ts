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
  lines.push('**Purpose:** Same-day/upcoming welcome message **link stubs** for CoS WhatsApp Admin - The Browns.');
  lines.push('**Portal-First Law (Grant 2026-09-07):** Guest-facing WA = name + check-in date + portal URL ONLY. NO Wi-Fi, access codes, parking, rates in WA body.');
  lines.push('');
  lines.push('**⚠️ DRAFT ONLY:** Never auto-sends. CoS posts to Admin after Grant approval. `[PORTAL_URL]` must be replaced with actual magic-link before send.');
  lines.push('');
  lines.push('---');
  lines.push('');

  if (stubs.length === 0) {
    lines.push('_No welcome messages in queue._');
  } else {
    stubs.forEach((stub, idx) => {
      lines.push(`## ${idx + 1}. ${stub.guestName} — ${formatDate(stub.checkInDate)}`);
      lines.push('');
      
      // Only missing phone blocks delivery of portal link
      if (!stub.hasPhone) {
        lines.push(`**🚫 BLOCKED:** Missing guest phone`);
        lines.push('');
        lines.push('⚠️ Resolve guest phone from NightsBridge booking detail or Browns/stay inbox before CoS Admin post. Cannot deliver portal link without guest phone.');
        lines.push('');
      }

      lines.push(`See: \`drafts/${stub.safeName}.md\``);
      lines.push('');
      lines.push('**Before send:** Replace `[PORTAL_URL]` with actual magic-link from GuestFlow or manual source.');
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
  lines.push('**Ops-only tracking.** Never invented. Portal-First Law (Grant 2026-09-07): Guest-facing WA = name + check-in + portal link ONLY.');
  lines.push('');
  lines.push('---');
  lines.push('');

  const missingPhone = stubs.filter((s) => !s.hasPhone);
  const missingRate = stubs.filter((s) => !s.hasRate);

  lines.push(`## 🚫 Missing Guest Phone — BLOCKED (${missingPhone.length})`);
  lines.push('');
  lines.push('**Action required:** Resolve from NightsBridge booking detail or Browns/stay inbox before CoS Admin post.');
  lines.push('**Blocks CoS Admin post:** YES — cannot deliver portal link without guest phone.');
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
  lines.push('**Note:** Rate cards are ops/pricing only. Never mentioned in guest welcome WhatsApp link stubs (Portal-First Law).');
  lines.push('**Blocks CoS Admin post:** NO — rate gaps do not block guest welcome link stubs.');
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
  lines.push('## Safety Gates (Portal-First Law — Grant 2026-09-07)');
  lines.push('');
  lines.push('- ✅ **Offline only** — No WhatsApp API or NightsBridge integration');
  lines.push('- ✅ **DRAFT ONLY** — Never sends messages automatically');
  lines.push('- ✅ **Portal-first link stubs** — Guest-facing WA = name + check-in date + portal URL ONLY');
  lines.push('- ✅ **NO property details in WA** — No Wi-Fi, access codes, parking, rates in guest-facing message body');
  lines.push('- ✅ **Never invents guest phone or portal URLs** — Missing phone → BLOCKED; resolve from NB booking detail or Browns/stay inbox');
  lines.push('- ✅ **Only `[PORTAL_URL]` placeholder** — Must be replaced with actual magic-link before send');
  lines.push('- ✅ **CoS owns WhatsApp** — Coexistence of Service required for all Admin posts');
  lines.push('');
  lines.push('## Portal-First Law (Grant 2026-09-07)');
  lines.push('');
  lines.push('**Guest-facing WhatsApp = short human-gated stub:**');
  lines.push('- ✅ Guest name');
  lines.push('- ✅ Check-in date');
  lines.push('- ✅ `[PORTAL_URL]` placeholder (replace with actual magic-link before send)');
  lines.push('- ❌ NO Wi-Fi, access codes, parking');
  lines.push('- ❌ NO rates, pricing, or financial details');
  lines.push('- ❌ NO detailed property information');
  lines.push('');
  lines.push('**All stay packet content (check-in details, access codes, property info) lives in the magic-link portal.**');
  lines.push('');
  lines.push('## Workflow');
  lines.push('');
  lines.push('1. **Review `queue.md`** — Numbered list of welcome link stubs; check for BLOCKED status');
  lines.push('2. **Check `missing-fields.md`** — Resolve missing phones from NB booking detail before posting');
  lines.push('3. **Review individual stubs** — Check `drafts/<safe-name>.md` for portal-first format');
  lines.push('4. **Generate portal URLs** — Use GuestFlow `POST /api/bookings/[id]/generate-link` or manual source');
  lines.push('5. **Replace `[PORTAL_URL]`** — Each stub must have actual magic-link before send');
  lines.push('6. **Grant approval required** — Before posting to WhatsApp Admin - The Browns');
  lines.push('7. **CoS posts to Admin** — Manual copy/paste to WhatsApp Admin - The Browns only');
  lines.push('');
  lines.push('## Hard Rules');
  lines.push('');
  lines.push('1. **NEVER** include Wi-Fi, access codes, parking, rates, or detailed property info in guest WhatsApp body');
  lines.push('2. **NEVER** ship `[PORTAL_URL]` placeholder in actual send — must be replaced with magic-link');
  lines.push('3. Missing phone → mark guest **blocked / hold for phone** in queue + missing-fields.md (cannot deliver link)');
  lines.push('4. Portal URL must be from GuestFlow or approved manual source — never invented');
  lines.push('');
  lines.push('## Integration Notes');
  lines.push('');
  lines.push('This pack can feed into:');
  lines.push('- `browns-ct-pack-assemble` — For timed CT packs');
  lines.push('- GuestFlow `POST /api/bookings/[id]/generate-link` — For portal URL generation');
  lines.push('');
  lines.push('## Approval Statement');
  lines.push('');
  lines.push('**I confirm:**');
  lines.push('- [ ] Reviewed all welcome link stubs in `queue.md`');
  lines.push('- [ ] Verified blocked guests (missing phone) are resolved or will be offline until resolved');
  lines.push('- [ ] Portal-First Law verified: stubs are name + date + portal link ONLY');
  lines.push('- [ ] NO Wi-Fi/access/parking/rates in guest-facing message bodies');
  lines.push('- [ ] `[PORTAL_URL]` placeholders will be replaced with actual magic-links before send');
  lines.push('- [ ] Tone matches The Browns hospitality standards (warm, brief, directs to portal)');
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
