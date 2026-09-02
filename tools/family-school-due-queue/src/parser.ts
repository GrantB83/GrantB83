import type { QueueEntry } from './types.js';

const ISO_DATE_PATTERN = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const US_DATE_PATTERN = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ABBREV = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_ABBREV = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const DUE_KEYWORDS = [
  'due', 'deadline', 'by', 'before',
  'permission slip', 'form', 'rsvp', 'sign',
  'picture day', 'photo day',
  'volunteer', 'field trip',
  'registration', 'enrollment',
  'parent conference', 'teacher conference',
  'report card', 'grades',
  'reminder', 'urgent',
  'last day', 'final day',
  'submission', 'submit',
  'return by'
];

export function extractDueDateSignals(text: string, asOf: Date): QueueEntry {
  const lowerText = text.toLowerCase();
  const signals: string[] = [];
  let dueDate: string | undefined;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  ISO_DATE_PATTERN.lastIndex = 0;
  const isoMatch = ISO_DATE_PATTERN.exec(text);
  if (isoMatch) {
    dueDate = isoMatch[0];
    signals.push(`iso-date:${dueDate}`);
    confidence = 'high';
  }

  if (!dueDate) {
    US_DATE_PATTERN.lastIndex = 0;
    const usMatches = Array.from(text.matchAll(US_DATE_PATTERN));
    if (usMatches.length > 0) {
      const match = usMatches[0];
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      const year = match[3] ? (match[3].length === 2 ? 2000 + parseInt(match[3], 10) : parseInt(match[3], 10)) : asOf.getFullYear();
      
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        signals.push(`us-date:${match[0]}`);
        confidence = 'high';
      }
    }
  }

  for (const keyword of DUE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      signals.push(`keyword:${keyword}`);
      if (confidence === 'low') {
        confidence = 'medium';
      }
    }
  }

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    const dayAbbrev = DAY_ABBREV[i];
    
    if (lowerText.includes(dayName) || lowerText.includes(dayAbbrev)) {
      signals.push(`day:${dayName}`);
      if (!dueDate && confidence !== 'high') {
        confidence = 'medium';
      }
      
      const dueFridayPattern = new RegExp(`(?:due|by)\\s+(?:this\\s+)?${dayName}|(?:due|by)\\s+${dayAbbrev}`, 'i');
      if (dueFridayPattern.test(text)) {
        const nextDay = getNextWeekday(asOf, i);
        dueDate = nextDay.toISOString().split('T')[0];
        signals.push(`inferred:next-${dayName}`);
        confidence = 'medium';
      }
    }
  }

  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const monthName = MONTH_NAMES[i];
    const monthAbbrev = MONTH_ABBREV[i];
    
    if (lowerText.includes(monthName) || lowerText.includes(monthAbbrev)) {
      signals.push(`month:${monthName}`);
    }
  }

  const source = text.match(/\.(pdf|docx?|xlsx?|png|jpe?g)$/i) ? 'filename' : 'subject';

  return {
    text,
    source,
    dueDate,
    signals,
    confidence
  };
}

function getNextWeekday(from: Date, targetDay: number): Date {
  const result = new Date(from);
  const currentDay = result.getDay();
  const daysUntilTarget = (targetDay + 1 - currentDay + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

export function parseInputFile(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
}
