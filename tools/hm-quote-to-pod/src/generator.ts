/**
 * Generate output files: pod.json, mapping.md, APPROVAL.md, manifest.json
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PodData, MappingReport, Manifest } from './types.js';

/**
 * Generate all output files
 */
export function generateOutputs(
  outdir: string,
  pod: PodData,
  report: MappingReport,
  source: string,
  notesAppended: boolean
): Manifest {
  const outputs = {
    pod: join(outdir, 'pod.json'),
    mapping: join(outdir, 'mapping.md'),
    approval: join(outdir, 'APPROVAL.md'),
    manifest: join(outdir, 'manifest.json'),
  };

  // pod.json
  writeFileSync(outputs.pod, JSON.stringify(pod, null, 2));

  // mapping.md
  const mappingContent = generateMappingMd(report);
  writeFileSync(outputs.mapping, mappingContent);

  // APPROVAL.md
  const approvalContent = generateApprovalMd(pod, report);
  writeFileSync(outputs.approval, approvalContent);

  // manifest.json
  const manifest: Manifest = {
    generated_at: new Date().toISOString(),
    source,
    notes_appended: notesAppended,
    outputs,
  };
  writeFileSync(outputs.manifest, JSON.stringify(manifest, null, 2));

  return manifest;
}

function generateMappingMd(report: MappingReport): string {
  const lines: string[] = [];

  lines.push('# Heavy Metal Quote → POD Mapping Report');
  lines.push('');
  lines.push('Field bridge from `quote.json` (hm-quote-intake) to `pod.json` (hm-delivery-pod-draft).');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## ✅ Fields Carried');
  lines.push('');
  if (report.carried.length > 0) {
    report.carried.forEach((field, i) => {
      lines.push(`${i + 1}. ${field}`);
    });
  } else {
    lines.push('None (all fields missing in quote).');
  }
  lines.push('');

  lines.push('## ❌ Fields Missing or Not Carried');
  lines.push('');
  if (report.missing.length > 0) {
    report.missing.forEach((field, i) => {
      lines.push(`${i + 1}. ${field}`);
    });
  } else {
    lines.push('None (all possible fields carried).');
  }
  lines.push('');

  if (report.notes.length > 0) {
    lines.push('## 📝 Mapping Notes');
    lines.push('');
    report.notes.forEach((note, i) => {
      lines.push(`${i + 1}. ${note}`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('**Next step:** `hm-delivery-pod-draft --pod pod.json`');
  lines.push('');

  return lines.join('\n');
}

function generateApprovalMd(pod: PodData, report: MappingReport): string {
  const lines: string[] = [];

  lines.push('# Heavy Metal Quote-to-POD Mapping Approval');
  lines.push('');
  lines.push('**DRAFT ONLY - Review before using pod.json**');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 🎯 Purpose');
  lines.push('');
  lines.push('This tool mapped a `quote.json` (from hm-quote-intake) into a `pod.json` stub (for hm-delivery-pod-draft).');
  lines.push('');
  lines.push('**What this tool does:**');
  lines.push('- ✅ Maps known fields from quote to pod');
  lines.push('- ✅ Leaves missing fields undefined');
  lines.push('- ✅ Never invents volume, signature, or price');
  lines.push('- ✅ Never sends WhatsApp');
  lines.push('');
  lines.push('**What this tool does NOT do:**');
  lines.push('- ❌ Does not invent missing data');
  lines.push('- ❌ Does not populate signedBy (manual only)');
  lines.push('- ❌ Does not populate vehicle or driver (not in quote)');
  lines.push('- ❌ Does not send any communications');
  lines.push('');

  lines.push('## 🔍 Review Checklist');
  lines.push('');
  lines.push('Before using `pod.json` with `hm-delivery-pod-draft`:');
  lines.push('');
  lines.push('1. ✅ Review `mapping.md` - Verify all carried fields are correct');
  lines.push('2. ✅ Fill missing fields manually if needed');
  lines.push('3. ✅ Verify volume and location (never invent)');
  lines.push('4. ✅ Update deliveredAt with actual delivery timestamp');
  lines.push('5. ✅ Add vehicle and driver when known');
  lines.push('6. ✅ Add signedBy ONLY when delivery is actually signed for');
  lines.push('7. ✅ Review pod.json for accuracy');
  lines.push('');

  lines.push('## 🚨 Critical Safety Rules');
  lines.push('');
  lines.push('From `docs/automation/approval-gates.md` lane:heavy-metal:');
  lines.push('');
  lines.push('- **Confirm volume + location** before any delivery');
  lines.push('- **Never invent volumes** - missing volume = missing in pod.json');
  lines.push('- **Never invent signatures** - signedBy ONLY when actually signed');
  lines.push('- **WhatsApp stays on CoS** (Coexistence of Service)');
  lines.push('');

  lines.push('## 📦 Mapped POD Stub');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(pod, null, 2));
  lines.push('```');
  lines.push('');

  const missingCount = report.missing.filter(
    (m) => !m.includes('signedBy') && !m.includes('vehicle') && !m.includes('driver')
  ).length;
  if (missingCount > 0) {
    lines.push('⚠️ **Warning:** Some fields are missing. Review `mapping.md` and fill manually if needed.');
    lines.push('');
  }

  lines.push('## ➡️ Next Steps');
  lines.push('');
  lines.push('1. Review and edit `pod.json` if needed');
  lines.push('2. Run `hm-delivery-pod-draft --pod pod.json`');
  lines.push('3. Review POD draft outputs');
  lines.push('4. File pod.md for records');
  lines.push('5. Send summary via CoS WhatsApp if needed (manual approval required)');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('**Entity:** Heavy Metal Sand & Stone, Dullstroom');
  lines.push('**Lane:** heavy-metal');
  lines.push('**CoS owns WhatsApp send. Never auto-send.**');
  lines.push('');

  return lines.join('\n');
}
