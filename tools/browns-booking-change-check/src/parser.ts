import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { BookingRecord } from './types.js';

export function parseBookingsFile(filePath: string): BookingRecord[] {
  const content = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  
  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain an array of bookings`);
  }
  
  return parsed;
}

export function computeFileHash(filePath: string): string {
  const content = readFileSync(filePath, 'utf-8');
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

export function generateMatchingKey(booking: BookingRecord): string {
  if (booking.id) {
    return `id:${booking.id}`;
  }
  
  // Normalize for matching: guestName|arrive|depart|room
  const guest = (booking.guestName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const arrive = (booking.checkInDate || '').trim();
  const depart = (booking.checkOutDate || '').trim();
  const room = (booking.suiteOrUnit || '').trim().toLowerCase();
  
  return `${guest}|${arrive}|${depart}|${room}`;
}
