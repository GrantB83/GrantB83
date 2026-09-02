/**
 * Pack builder - assembles digest sections into pack outputs
 */

import { DigestItem, Section } from './types.js';

/**
 * Split items into school and family sections
 */
export function splitSections(items: DigestItem[]): { school: DigestItem[]; family: DigestItem[] } {
  const school: DigestItem[] = [];
  const family: DigestItem[] = [];

  for (const item of items) {
    if (item.tag === 'school') {
      school.push(item);
    } else {
      family.push(item);
    }
  }

  return { school, family };
}

/**
 * Generate markdown for a single item
 */
export function formatItem(item: DigestItem): string {
  let line = `${item.n}. ${item.subject}`;
  
  if (item.snippet) {
    line += ` — ${item.snippet}`;
  }
  
  if (item.dueDate) {
    line += ` (Due: ${item.dueDate})`;
  }
  
  return line;
}

/**
 * Generate school.md content
 */
export function generateSchoolMarkdown(items: DigestItem[], date: string): string {
  const lines: string[] = [];
  
  lines.push(`# Kids School — ${date}`);
  lines.push('');
  
  if (items.length === 0) {
    lines.push('No school items for today.');
  } else {
    lines.push('Open items from AISD and school administration:');
    lines.push('');
    
    for (const item of items) {
      lines.push(formatItem(item));
    }
  }
  
  lines.push('');
  return lines.join('\n');
}

/**
 * Generate family.md content
 */
export function generateFamilyMarkdown(items: DigestItem[], date: string): string {
  const lines: string[] = [];
  
  lines.push(`# Family Admin — ${date}`);
  lines.push('');
  
  if (items.length === 0) {
    lines.push('No family admin items for today.');
  } else {
    lines.push('Open items from household, medical, finance, and other family administration:');
    lines.push('');
    
    for (const item of items) {
      lines.push(formatItem(item));
    }
  }
  
  lines.push('');
  return lines.join('\n');
}

/**
 * Generate PACK.md index with checklist
 */
export function generatePackIndex(date: string, schoolCount: number, familyCount: number, calendarEventCount?: number, schoolDueItemCount?: number): string {
  const lines: string[] = [];
  
  lines.push(`# Family Morning Digest Pack — ${date}`);
  lines.push('');
  lines.push('**Purpose:** Assemble morning digest for WhatsApp Admin - Grant & Liana Private.');
  lines.push('');
  lines.push('## Contents');
  lines.push('');
  lines.push(`- **school.md** — Kids School items (${schoolCount} items)`);
  lines.push(`- **family.md** — Family Admin items (${familyCount} items, no school repeats)`);
  
  if (calendarEventCount !== undefined) {
    lines.push(`- **calendar.md** — Calendar events from ICS digest (${calendarEventCount} events)`);
    lines.push('- **calendar-events.json** — Structured calendar event data');
  }
  
  if (schoolDueItemCount !== undefined) {
    lines.push(`- **school-due-queue.md** — School due queue from family-school-due-queue (${schoolDueItemCount} items)`);
  }
  
  lines.push('- **APPROVAL.md** — Review document with safety gates');
  lines.push('- **manifest.json** — Machine-readable pack metadata');
  lines.push('');
  lines.push('## Checklist');
  lines.push('');
  lines.push('- [ ] Review school.md for accuracy');
  lines.push('- [ ] Review family.md for accuracy');
  lines.push('- [ ] No school items repeated in family.md');
  lines.push('- [ ] No invented due dates or school facts');
  
  if (calendarEventCount !== undefined) {
    lines.push('- [ ] Review calendar.md for accuracy');
    lines.push('- [ ] No invented events or times in calendar digest');
  }
  
  if (schoolDueItemCount !== undefined) {
    lines.push('- [ ] Review school-due-queue.md for accuracy');
    lines.push('- [ ] No invented due dates in school due queue');
  }
  
  lines.push('- [ ] Read APPROVAL.md before posting');
  lines.push('- [ ] Family / CoS owns WhatsApp send');
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This is a DRAFT pack only.');
  lines.push('- Never auto-send to WhatsApp.');
  lines.push('- Family bot or CoS owns the send workflow.');
  lines.push('- School items are clearly separated from Family Admin items.');
  lines.push('- No items appear in both sections.');
  
  if (calendarEventCount !== undefined) {
    lines.push('- Calendar events are pass-through from ICS file only.');
  }
  
  if (schoolDueItemCount !== undefined) {
    lines.push('- School due queue extracted from subjects/filenames only (never opens email bodies).');
  }
  
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate APPROVAL.md content
 */
export function generateApproval(date: string): string {
  const lines: string[] = [];
  
  lines.push(`# APPROVAL — Family Morning Digest Pack ${date}`);
  lines.push('');
  lines.push('## Review Checklist');
  lines.push('');
  lines.push('Before posting this pack to WhatsApp Admin - Grant & Liana Private:');
  lines.push('');
  lines.push('1. **Accuracy** — All items are correctly classified as Kids School or Family Admin');
  lines.push('2. **No duplication** — No items appear in both school.md and family.md');
  lines.push('3. **No invented data** — Due dates and amounts only extracted if explicitly present');
  lines.push('4. **No school facts** — No teacher names, policies, or deadlines were fabricated');
  lines.push('5. **Full sentences** — Items are written in complete, readable sentences');
  lines.push('6. **School due queue** — If included, verify due dates are from subjects/filenames only (never opens email bodies)');
  lines.push('');
  lines.push('## Safety Gates');
  lines.push('');
  lines.push('- ✅ **Offline only** — No API calls of any kind');
  lines.push('- ✅ **DRAFT ONLY** — Never auto-sends to WhatsApp');
  lines.push('- ✅ **No LLM** — Keyword classification heuristics only');
  lines.push('- ✅ **Family / CoS owns send** — WhatsApp posting via Family bot or CoS workflow');
  lines.push('');
  lines.push('## Approval Statement');
  lines.push('');
  lines.push('**DRAFT for review.** Family bot or CoS owns the WhatsApp send workflow.');
  lines.push('');
  lines.push('This pack is ready for manual review and posting to WhatsApp Admin - Grant & Liana Private.');
  lines.push('');
  
  return lines.join('\n');
}
