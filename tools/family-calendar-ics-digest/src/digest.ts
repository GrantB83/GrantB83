import { CalendarEvent } from './types.js';

export function formatDigest(
  events: CalendarEvent[],
  fromDate: string,
  toDate: string,
  timezone: string
): string {
  const lines: string[] = [];
  
  lines.push(`# Family Calendar Digest`);
  lines.push(``);
  lines.push(`**Date Range:** ${fromDate} to ${toDate}`);
  lines.push(`**Timezone:** ${timezone}`);
  lines.push(`**Event Count:** ${events.length}`);
  lines.push(``);

  if (events.length === 0) {
    lines.push(`No events found in the specified date range.`);
    return lines.join('\n');
  }

  lines.push(`## Events`);
  lines.push(``);

  let currentDate = '';
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const eventNumber = i + 1;
    
    const eventDate = event.dtstart ? extractDate(event.dtstart) : 'Unknown date';
    
    if (eventDate !== currentDate) {
      if (currentDate !== '') {
        lines.push(``);
      }
      lines.push(`### ${eventDate}`);
      lines.push(``);
      currentDate = eventDate;
    }
    
    const timeStr = formatEventTime(event);
    const summaryStr = event.summary || '(No title)';
    const locationStr = event.location ? ` @ ${event.location}` : '';
    
    lines.push(`${eventNumber}. ${timeStr} — ${summaryStr}${locationStr}`);
    
    if (event.description) {
      const cleanDesc = event.description.replace(/\n/g, ' ').substring(0, 100);
      if (cleanDesc.trim()) {
        lines.push(`   ${cleanDesc}${event.description.length > 100 ? '...' : ''}`);
      }
    }
  }

  return lines.join('\n');
}

function extractDate(dateStr: string): string {
  if (!dateStr) return 'Unknown';
  
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  const match = dateStr.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  return dateStr;
}

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All day';
  }
  
  if (!event.dtstart) {
    return 'Time unknown';
  }
  
  try {
    const start = new Date(event.dtstart);
    const timeStr = start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (event.dtend) {
      const end = new Date(event.dtend);
      const endTimeStr = end.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `${timeStr} - ${endTimeStr}`;
    }
    
    return timeStr;
  } catch {
    return 'Time unknown';
  }
}

export function formatMissingFields(events: CalendarEvent[]): string {
  const lines: string[] = [];
  
  lines.push(`# Missing Fields Report`);
  lines.push(``);
  
  const eventsWithMissing = events.filter(e => e.missingFields.length > 0);
  
  if (eventsWithMissing.length === 0) {
    lines.push(`All events have complete field data.`);
    return lines.join('\n');
  }
  
  lines.push(`Found ${eventsWithMissing.length} event(s) with missing fields:`);
  lines.push(``);
  
  for (const event of eventsWithMissing) {
    lines.push(`## Event: ${event.summary || event.uid}`);
    lines.push(``);
    lines.push(`**Missing:** ${event.missingFields.join(', ')}`);
    if (event.dtstart) {
      lines.push(`**Date:** ${extractDate(event.dtstart)}`);
    }
    lines.push(``);
  }
  
  return lines.join('\n');
}

export function formatApproval(): string {
  return `# APPROVAL — Family Calendar ICS Digest

## Purpose

This digest is generated from an exported .ics calendar file for Family / CoS morning review.

## Safety Gates

- ✅ **Offline only** — No calendar API calls
- ✅ **Read-only** — Never modifies .ics files or live calendars
- ✅ **Pass-through only** — Never invents events or times
- ✅ **DRAFT ONLY** — This digest is for review; it does not send notifications

## Missing Data

Events with missing SUMMARY, DTSTART, or LOCATION fields are flagged in \`missing-fields.md\`.

## Ownership

- **Family bot / CoS** owns WhatsApp sending workflow
- **Never auto-send** — Manual review required before sharing digest

## Review Checklist

Before using this digest:

1. ☐ Verify date range matches intended period
2. ☐ Check \`missing-fields.md\` for incomplete events
3. ☐ Confirm events are from expected calendar source
4. ☐ Review event times are in correct timezone

## Approval

This is a **DRAFT digest**. Family owns posting to WhatsApp Admin or morning routine.

**Do not auto-send.** Manual approval required.
`;
}
