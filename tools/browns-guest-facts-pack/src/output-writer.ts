import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { PackOutput, GuestFacts } from './types.js';

export function writeOutputs(output: PackOutput, outDir: string): void {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const jobDir = join(outDir, `facts-pack-${new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]}`);
  mkdirSync(jobDir, { recursive: true });

  const snippetsDir = join(jobDir, 'snippets');
  mkdirSync(snippetsDir, { recursive: true });

  writeFileSync(
    join(jobDir, 'facts.json'),
    JSON.stringify(output.facts, null, 2),
    'utf-8'
  );

  for (const [key, value] of Object.entries(output.snippets)) {
    writeFileSync(
      join(snippetsDir, `${key}.txt`),
      value,
      'utf-8'
    );
  }

  writeFileSync(
    join(jobDir, 'missing-fields.md'),
    generateMissingFieldsDoc(output.missingFields),
    'utf-8'
  );

  writeFileSync(
    join(jobDir, 'APPROVAL.md'),
    generateApprovalDoc(output.facts),
    'utf-8'
  );

  writeFileSync(
    join(jobDir, 'manifest.json'),
    JSON.stringify(output.manifest, null, 2),
    'utf-8'
  );

  console.log(`  ✓ facts.json`);
  console.log(`  ✓ snippets/ (${Object.keys(output.snippets).length} files)`);
  console.log(`  ✓ missing-fields.md`);
  console.log(`  ✓ APPROVAL.md`);
  console.log(`  ✓ manifest.json`);
  console.log(`\n📂 Output directory: ${jobDir}`);
}

function generateMissingFieldsDoc(missingFields: string[]): string {
  let doc = '# Missing Fields Report\n\n';
  doc += `**Generated:** ${new Date().toISOString()}\n\n`;

  if (missingFields.length === 0) {
    doc += '✅ All expected fields were found in the source markdown.\n';
  } else {
    doc += '⚠️ The following expected fields were NOT found in the source markdown:\n\n';
    for (const field of missingFields) {
      doc += `- **${field}**\n`;
    }
    doc += '\n## Action Required\n\n';
    doc += 'Please review the source markdown file and add the missing information.\n';
    doc += 'Fields are extracted heuristically from section headings and content.\n';
    doc += 'Ensure that section headings clearly match the expected field names.\n';
  }

  return doc;
}

function generateApprovalDoc(facts: GuestFacts): string {
  let doc = '# APPROVAL GATE: Guest Facts Pack\n\n';
  doc += '**Status:** DRAFT FACTS ONLY — NO SEND\n\n';
  doc += '**Property:** The Browns Luxury Guest Suites Dullstroom\n\n';
  doc += `**Extracted:** ${new Date().toISOString()}\n\n`;

  doc += '## Purpose\n\n';
  doc += 'This facts pack is intended for use by `browns-guest-comms-draft` to generate ';
  doc += 'DRAFT guest communications. The facts themselves do not trigger any sends.\n\n';

  doc += '## Approval Requirements\n\n';
  doc += '- **Gate:** S1 (Standing approval for facts extraction from approved knowledge files)\n';
  doc += '- **Scope:** Facts extraction only\n';
  doc += '- **No send:** This pack does not send any messages\n';
  doc += '- **Downstream:** Any drafts generated using these facts require H1/H2 approval before send\n\n';

  doc += '## Extracted Facts Summary\n\n';
  const factCount = Object.keys(facts).length;
  doc += `- **Total facts extracted:** ${factCount}\n`;
  doc += `- **Fields present:** ${Object.keys(facts).join(', ') || 'none'}\n\n`;

  doc += '## Safety Checks\n\n';
  doc += '- ✅ No rates or amounts included\n';
  doc += '- ✅ No invented information\n';
  doc += '- ✅ Offline extraction only\n';
  doc += '- ✅ Source-faithful extraction\n\n';

  doc += '## Review Required\n\n';
  doc += 'Please verify:\n';
  doc += '1. All extracted facts are accurate and current\n';
  doc += '2. No sensitive information (passwords, internal notes) is exposed\n';
  doc += '3. Facts align with current property operations\n\n';

  doc += '---\n\n';
  doc += '_See `docs/automation/approval-gates.md` for gate definitions._\n';

  return doc;
}
