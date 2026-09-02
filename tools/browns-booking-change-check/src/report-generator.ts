import { ChangeRecord } from './types.js';

export function generateMarkdownReport(changes: ChangeRecord[], day?: string): string {
  const lines: string[] = [];
  
  lines.push('# Booking Change Report');
  lines.push('');
  
  if (day) {
    lines.push(`**Target Day:** ${day}`);
    lines.push('');
  }
  
  const adds = changes.filter(c => c.type === 'add');
  const removes = changes.filter(c => c.type === 'remove');
  const updates = changes.filter(c => c.type === 'update');
  
  lines.push(`**Summary:** ${adds.length} add(s), ${removes.length} removal(s), ${updates.length} update(s)`);
  lines.push('');
  
  if (changes.length === 0) {
    lines.push('✅ **No changes detected.**');
    lines.push('');
    return lines.join('\n');
  }
  
  // Adds
  if (adds.length > 0) {
    lines.push('## ➕ Additions');
    lines.push('');
    adds.forEach((change, idx) => {
      lines.push(`### ${idx + 1}. ${change.after?.guestName || 'Unknown Guest'}`);
      lines.push('');
      if (change.after?.suiteOrUnit) {
        lines.push(`- **Suite:** ${change.after.suiteOrUnit}`);
      }
      if (change.after?.checkInDate) {
        lines.push(`- **Check-in:** ${change.after.checkInDate}`);
      }
      if (change.after?.checkOutDate) {
        lines.push(`- **Check-out:** ${change.after.checkOutDate}`);
      }
      if (change.after?.status) {
        lines.push(`- **Status:** ${change.after.status}`);
      }
      if (change.after?.phone) {
        lines.push(`- **Phone:** ${change.after.phone}`);
      }
      if (change.after?.notes) {
        lines.push(`- **Notes:** ${change.after.notes}`);
      }
      lines.push('');
    });
  }
  
  // Removes
  if (removes.length > 0) {
    lines.push('## ➖ Removals');
    lines.push('');
    removes.forEach((change, idx) => {
      lines.push(`### ${idx + 1}. ${change.before?.guestName || 'Unknown Guest'}`);
      lines.push('');
      if (change.before?.suiteOrUnit) {
        lines.push(`- **Suite:** ${change.before.suiteOrUnit}`);
      }
      if (change.before?.checkInDate) {
        lines.push(`- **Check-in:** ${change.before.checkInDate}`);
      }
      if (change.before?.checkOutDate) {
        lines.push(`- **Check-out:** ${change.before.checkOutDate}`);
      }
      if (change.before?.status) {
        lines.push(`- **Status:** ${change.before.status}`);
      }
      lines.push('');
    });
  }
  
  // Updates
  if (updates.length > 0) {
    lines.push('## 🔄 Updates');
    lines.push('');
    updates.forEach((change, idx) => {
      lines.push(`### ${idx + 1}. ${change.after?.guestName || change.before?.guestName || 'Unknown Guest'}`);
      lines.push('');
      lines.push(`**Changed fields:** ${change.fields?.join(', ')}`);
      lines.push('');
      
      for (const field of change.fields || []) {
        const beforeVal = formatFieldValue(change.before?.[field]);
        const afterVal = formatFieldValue(change.after?.[field]);
        lines.push(`- **${field}:** ${beforeVal} → ${afterVal}`);
      }
      lines.push('');
    });
  }
  
  lines.push('---');
  lines.push('');
  lines.push('⚠️ **Safety Notes:**');
  lines.push('- Never invented rates or amounts');
  lines.push('- Missing fields flagged as "Unknown" or blank');
  lines.push('- Review before posting to WhatsApp Admin');
  lines.push('');
  
  return lines.join('\n');
}

function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '(blank)';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
