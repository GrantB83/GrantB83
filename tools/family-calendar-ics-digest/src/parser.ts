import ICAL from 'ical.js';
import { readFileSync } from 'fs';
import { CalendarEvent } from './types.js';

export function parseICS(filePath: string): ICAL.Component {
  const icsData = readFileSync(filePath, 'utf-8');
  const jcalData = ICAL.parse(icsData);
  return new ICAL.Component(jcalData);
}

export function extractEvents(
  vcalendar: ICAL.Component,
  fromDate: Date,
  toDate: Date,
  timezone: string
): CalendarEvent[] {
  const vevents = vcalendar.getAllSubcomponents('vevent');
  const events: CalendarEvent[] = [];

  for (const vevent of vevents) {
    const event = extractEvent(vevent, timezone);
    
    if (!event.dtstart) {
      continue;
    }

    const eventStart = new Date(event.dtstart);
    
    if (eventStart >= fromDate && eventStart <= toDate) {
      events.push(event);
    }
  }

  events.sort((a, b) => {
    if (!a.dtstart || !b.dtstart) return 0;
    return new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime();
  });

  return events;
}

function extractEvent(vevent: ICAL.Component, timezone: string): CalendarEvent {
  const missingFields: string[] = [];
  
  const uid = vevent.getFirstPropertyValue('uid') || `generated-${Date.now()}`;
  
  const summary = vevent.getFirstPropertyValue('summary');
  if (!summary) {
    missingFields.push('SUMMARY');
  }

  let dtstart: string | null = null;
  let dtend: string | null = null;
  let allDay = false;

  const dtstartProp = vevent.getFirstProperty('dtstart');
  if (dtstartProp) {
    const dtstartValue = dtstartProp.getFirstValue();
    if (dtstartValue) {
      if (dtstartValue.isDate) {
        allDay = true;
        dtstart = formatDate(dtstartValue, timezone, true);
      } else {
        dtstart = formatDate(dtstartValue, timezone, false);
      }
    }
  } else {
    missingFields.push('DTSTART');
  }

  const dtendProp = vevent.getFirstProperty('dtend');
  if (dtendProp) {
    const dtendValue = dtendProp.getFirstValue();
    if (dtendValue) {
      if (dtendValue.isDate) {
        dtend = formatDate(dtendValue, timezone, true);
      } else {
        dtend = formatDate(dtendValue, timezone, false);
      }
    }
  }

  const location = vevent.getFirstPropertyValue('location');
  if (!location) {
    missingFields.push('LOCATION');
  }

  const description = vevent.getFirstPropertyValue('description');

  return {
    uid,
    summary,
    dtstart,
    dtend,
    location,
    description,
    allDay,
    missingFields
  };
}

function formatDate(icalTime: any, timezone: string, isAllDay: boolean): string {
  if (isAllDay) {
    return icalTime.toString();
  }
  
  try {
    if (timezone && timezone !== 'UTC') {
      icalTime.zone = ICAL.Timezone.localTimezone;
    }
    return icalTime.toJSDate().toISOString();
  } catch {
    return icalTime.toString();
  }
}
