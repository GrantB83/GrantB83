/**
 * Generate PACK.md index with timed checklist
 */

import type { CliOptions, TimedChecklistItem } from './types.js';

export function generatePackIndex(
  options: CliOptions,
  ranFlags: { ranAdapter: boolean; ranChangeCheck: boolean; ranDailyOps: boolean; ranGuestComms: boolean },
  sourcesProvided: { bookings: boolean; beforeAfter: boolean; facts: boolean; guestBooking: boolean }
): string {
  const lines: string[] = [];
  
  lines.push('# Browns CT Pack');
  lines.push(`Date: ${options.day}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('CoS runs timed Browns CT packs for same-day operations:');
  lines.push('- **20:00 CT**: Same-day morning guest drafts');
  lines.push('- **09:00 CT**: After-hours check-ins');
  lines.push('- **21:00 CT**: Staff ops brief');
  lines.push('');
  lines.push('**All outputs are DRAFT.** WhatsApp Admin - The Browns (Liana vet / Grant approval).');
  lines.push('');
  lines.push('## Timed Checklist');
  lines.push('');
  
  const checklist = buildTimedChecklist(ranFlags, sourcesProvided);
  for (const item of checklist) {
    lines.push(`### ${item.time}`);
    lines.push('');
    lines.push(item.description);
    lines.push('');
    if (item.files.length > 0) {
      lines.push('**Files:**');
      for (const file of item.files) {
        lines.push(`- ${file}`);
      }
      lines.push('');
    }
  }
  
  lines.push('## Pack Contents');
  lines.push('');
  lines.push('| File | Purpose |');
  lines.push('|------|---------|');
  lines.push('| PACK.md | This index + timed checklist |');
  lines.push('| APPROVAL.md | Safety gates + never auto-send reminder |');
  
  if (ranFlags.ranChangeCheck || sourcesProvided.beforeAfter) {
    lines.push('| changes.md | Booking change check output |');
  }
  
  if (ranFlags.ranDailyOps) {
    lines.push('| daily-ops.md | Daily ops brief (copied from browns-daily-ops-brief) |');
  }
  
  if (ranFlags.ranGuestComms) {
    lines.push('| guest-*.md | Guest welcome drafts (copied from browns-guest-comms-draft) |');
  }
  
  lines.push('| manifest.json | Machine-readable pack inventory |');
  lines.push('');
  
  lines.push('## Sources');
  lines.push('');
  lines.push(`- Bookings provided: ${sourcesProvided.bookings ? 'Yes' : 'No'}`);
  lines.push(`- Before/After provided: ${sourcesProvided.beforeAfter ? 'Yes' : 'No'}`);
  lines.push(`- Facts provided: ${sourcesProvided.facts ? 'Yes' : 'No'}`);
  lines.push(`- Guest booking provided: ${sourcesProvided.guestBooking ? 'Yes' : 'No'}`);
  lines.push('');
  
  lines.push('## Ran Flags');
  lines.push('');
  lines.push(`- Ran adapter: ${ranFlags.ranAdapter ? 'Yes' : 'No'}`);
  lines.push(`- Ran change-check: ${ranFlags.ranChangeCheck ? 'Yes' : 'No'}`);
  lines.push(`- Ran daily-ops: ${ranFlags.ranDailyOps ? 'Yes' : 'No'}`);
  lines.push(`- Ran guest-comms: ${ranFlags.ranGuestComms ? 'Yes' : 'No'}`);
  lines.push('');
  
  lines.push('## Safety Reminder');
  lines.push('');
  lines.push('- ✅ **DRAFT ONLY** - Never auto-send');
  lines.push('- ✅ **CoS owns WhatsApp** - Coexistence of Service required');
  lines.push('- ✅ **Last-minute change check** - Always review booking changes before send');
  lines.push('- ✅ **Liana vet / Grant approval** - Both humans must approve guest-facing comms');
  lines.push('- ❌ **Never invent rates/amounts/phones**');
  lines.push('- ❌ **Dullstroom / The Browns only** - Not for other properties');
  lines.push('');
  
  return lines.join('\\n');
}

function buildTimedChecklist(
  ranFlags: { ranAdapter: boolean; ranChangeCheck: boolean; ranDailyOps: boolean; ranGuestComms: boolean },
  sourcesProvided: { bookings: boolean; beforeAfter: boolean; facts: boolean; guestBooking: boolean }
): TimedChecklistItem[] {
  const items: TimedChecklistItem[] = [];
  
  // 20:00 CT - Same-day morning guest drafts
  items.push({
    time: '20:00 CT',
    description: 'Review and send same-day morning guest drafts (welcome messages for arrivals)',
    files: ranFlags.ranGuestComms ? ['guest-*.md'] : ['(No guest drafts in this pack)'],
  });
  
  // 09:00 CT (next morning) - After-hours check-ins
  items.push({
    time: '09:00 CT (next morning)',
    description: 'Review after-hours check-ins and booking changes',
    files: ranFlags.ranChangeCheck || sourcesProvided.beforeAfter 
      ? ['changes.md'] 
      : ['(No change check in this pack)'],
  });
  
  // 21:00 CT - Staff ops brief
  items.push({
    time: '21:00 CT',
    description: 'Send staff ops brief to team WhatsApp',
    files: ranFlags.ranDailyOps ? ['daily-ops.md'] : ['(No daily ops brief in this pack)'],
  });
  
  return items;
}
