/**
 * Generator for digest outputs
 */

import * as fs from 'fs';
import * as path from 'path';
import { ParsedItem, DigestItem, GeneratorOptions } from './types.js';
import { hasActionVerb } from './classifier.js';

/**
 * Generate human-readable digest
 */
function generateDigestMarkdown(items: ParsedItem[], options: GeneratorOptions): string {
  const schoolItems = items.filter(item => item.tag === 'school');
  const adminItems = items.filter(item => item.tag !== 'school');
  
  const lines: string[] = [];
  
  lines.push(`# Family Digest - ${options.date}`);
  lines.push('');
  lines.push(`*Generated: ${new Date().toISOString()}*`);
  lines.push(`*Timezone: ${options.timezone}*`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Kids School section
  if (schoolItems.length > 0) {
    lines.push('## Kids School');
    lines.push('');
    
    for (const item of schoolItems) {
      const dueDateText = item.dueDate ? ` (Due: ${item.dueDate})` : '';
      const snippetText = item.snippet ? ` — ${item.snippet}` : '';
      lines.push(`${item.n}. ${item.subject}${dueDateText}${snippetText}`);
    }
    
    lines.push('');
  }
  
  // Family admin section
  if (adminItems.length > 0) {
    lines.push('## Family Admin');
    lines.push('');
    
    for (const item of adminItems) {
      const dueDateText = item.dueDate ? ` (Due: ${item.dueDate})` : '';
      const snippetText = item.snippet ? ` — ${item.snippet}` : '';
      const tagLabel = item.tag !== 'other' ? ` [${item.tag}]` : '';
      lines.push(`${item.n}. ${item.subject}${dueDateText}${snippetText}${tagLabel}`);
    }
    
    lines.push('');
  }
  
  if (schoolItems.length === 0 && adminItems.length === 0) {
    lines.push('*No items to display*');
    lines.push('');
  }
  
  lines.push('---');
  lines.push('');
  lines.push('*This digest is for Grant and Liana Brown only.*');
  lines.push('*Do not send automatically. Family bot owns WhatsApp send path.*');
  
  return lines.join('\n');
}

/**
 * Generate missing fields report
 */
function generateMissingFieldsMarkdown(items: ParsedItem[]): string {
  const lines: string[] = [];
  
  lines.push('# Missing Fields Report');
  lines.push('');
  lines.push('Items that may need clarification:');
  lines.push('');
  
  const missingItems = items.filter(item => 
    !hasActionVerb(item.subject) || !item.dueDate
  );
  
  if (missingItems.length === 0) {
    lines.push('*All items have clear action verbs and due dates (where applicable)*');
  } else {
    for (const item of missingItems) {
      lines.push(`## Item ${item.n}: ${item.subject}`);
      lines.push('');
      
      if (!hasActionVerb(item.subject)) {
        lines.push('- ⚠️  No clear action verb detected');
      }
      
      if (!item.dueDate) {
        lines.push('- ℹ️  No due date found in subject/snippet');
      }
      
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * Generate approval document
 */
function generateApprovalMarkdown(items: ParsedItem[], options: GeneratorOptions): string {
  const lines: string[] = [];
  
  lines.push('# APPROVAL REQUIRED');
  lines.push('');
  lines.push('## Digest Summary');
  lines.push('');
  lines.push(`- Date: ${options.date}`);
  lines.push(`- Timezone: ${options.timezone}`);
  lines.push(`- Total items: ${items.length}`);
  lines.push(`- School items: ${items.filter(i => i.tag === 'school').length}`);
  lines.push(`- Admin items: ${items.filter(i => i.tag !== 'school').length}`);
  lines.push('');
  lines.push('## Safety Checks');
  lines.push('');
  lines.push('- ✅ No LLM used - keyword classification only');
  lines.push('- ✅ No invented due dates or amounts');
  lines.push('- ✅ No automatic sending');
  lines.push('- ✅ Offline operation only');
  lines.push('');
  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review `digest.md` for accuracy');
  lines.push('2. Check `missing-fields.md` for items needing clarification');
  lines.push('3. Update `items.json` with any additional metadata');
  lines.push('4. Family bot owns the WhatsApp send workflow');
  lines.push('');
  lines.push('## Approval');
  lines.push('');
  lines.push('**This is a DRAFT digest only.**');
  lines.push('');
  lines.push('Do NOT send this digest without explicit approval from Grant or Liana.');
  lines.push('');
  lines.push('Family bot (via CoS) is the only approved channel for WhatsApp sends.');
  
  return lines.join('\n');
}

/**
 * Generate manifest
 */
function generateManifest(items: ParsedItem[], options: GeneratorOptions): object {
  return {
    tool: 'family-school-subject-digest',
    version: '1.0.0',
    generated: new Date().toISOString(),
    date: options.date,
    timezone: options.timezone,
    itemCount: items.length,
    schoolItemCount: items.filter(i => i.tag === 'school').length,
    adminItemCount: items.filter(i => i.tag !== 'school').length,
    tags: {
      school: items.filter(i => i.tag === 'school').length,
      forms: items.filter(i => i.tag === 'forms').length,
      calendar: items.filter(i => i.tag === 'calendar').length,
      payment: items.filter(i => i.tag === 'payment').length,
      sports: items.filter(i => i.tag === 'sports').length,
      other: items.filter(i => i.tag === 'other').length,
    },
  };
}

/**
 * Generate all output files
 */
export async function generateOutputs(
  items: ParsedItem[],
  options: GeneratorOptions
): Promise<string> {
  // Create output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(options.outdir, `digest-${timestamp}`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate files
  const digestMd = generateDigestMarkdown(items, options);
  const missingFieldsMd = generateMissingFieldsMarkdown(items);
  const approvalMd = generateApprovalMarkdown(items, options);
  const manifest = generateManifest(items, options);
  
  // Write files
  fs.writeFileSync(path.join(outputDir, 'digest.md'), digestMd);
  fs.writeFileSync(path.join(outputDir, 'items.json'), JSON.stringify(items, null, 2));
  fs.writeFileSync(path.join(outputDir, 'missing-fields.md'), missingFieldsMd);
  fs.writeFileSync(path.join(outputDir, 'APPROVAL.md'), approvalMd);
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  return outputDir;
}
