/**
 * Parser for bookings JSON
 */

import { readFileSync } from 'fs';
import type { Booking } from './types.js';

export function parseBookings(filePath: string): Booking[] {
  const content = readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  if (!Array.isArray(data)) {
    throw new Error('Bookings file must contain a JSON array');
  }
  
  // Validate each booking
  for (let i = 0; i < data.length; i++) {
    const booking = data[i];
    
    if (!booking.guestName || typeof booking.guestName !== 'string') {
      throw new Error(`Booking at index ${i} missing required field: guestName`);
    }
    
    if (!booking.suiteOrUnit || typeof booking.suiteOrUnit !== 'string') {
      throw new Error(`Booking at index ${i} missing required field: suiteOrUnit`);
    }
    
    if (!booking.status || !['arriving', 'inhouse', 'departing'].includes(booking.status)) {
      throw new Error(`Booking at index ${i} has invalid status (must be: arriving, inhouse, or departing)`);
    }
  }
  
  return data as Booking[];
}
