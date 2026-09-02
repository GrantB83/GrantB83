import { BookingRecord, ChangeRecord } from './types.js';
import { generateMatchingKey } from './parser.js';

export function diffBookings(before: BookingRecord[], after: BookingRecord[]): ChangeRecord[] {
  const changes: ChangeRecord[] = [];
  
  // Build maps keyed by matching key
  const beforeMap = new Map<string, BookingRecord>();
  const afterMap = new Map<string, BookingRecord>();
  
  for (const booking of before) {
    const key = generateMatchingKey(booking);
    beforeMap.set(key, booking);
  }
  
  for (const booking of after) {
    const key = generateMatchingKey(booking);
    afterMap.set(key, booking);
  }
  
  // Find removes
  for (const [key, booking] of beforeMap) {
    if (!afterMap.has(key)) {
      changes.push({
        type: 'remove',
        key,
        before: booking
      });
    }
  }
  
  // Find adds
  for (const [key, booking] of afterMap) {
    if (!beforeMap.has(key)) {
      changes.push({
        type: 'add',
        key,
        after: booking
      });
    }
  }
  
  // Find updates (same key, different fields)
  for (const [key, afterBooking] of afterMap) {
    const beforeBooking = beforeMap.get(key);
    if (beforeBooking) {
      const changedFields = detectChangedFields(beforeBooking, afterBooking);
      if (changedFields.length > 0) {
        changes.push({
          type: 'update',
          key,
          before: beforeBooking,
          after: afterBooking,
          fields: changedFields
        });
      }
    }
  }
  
  return changes;
}

function detectChangedFields(before: BookingRecord, after: BookingRecord): string[] {
  const fields: string[] = [];
  
  // Check important fields
  const fieldsToCheck = [
    'guestName', 'suiteOrUnit', 'checkInDate', 'checkOutDate',
    'status', 'phone', 'notes', 'adults', 'children'
  ] as const;
  
  for (const field of fieldsToCheck) {
    const beforeVal = normalizeValue(before[field]);
    const afterVal = normalizeValue(after[field]);
    
    if (beforeVal !== afterVal) {
      fields.push(field);
    }
  }
  
  return fields;
}

function normalizeValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  return String(val);
}
