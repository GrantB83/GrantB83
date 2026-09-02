import { BookingRecord, RawNightsbridgeRow, MissingField, TransformResult } from './types.js';

function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return ['true', '1', 'yes', 'late'].includes(normalized);
}

function parseNumber(value: string): number | undefined {
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

function deriveStatus(
  targetDay: string,
  checkInDate: string | undefined,
  checkOutDate: string | undefined
): 'arriving' | 'inhouse' | 'departing' | '' {
  if (!checkInDate || !checkOutDate) {
    return '';
  }
  
  if (checkInDate === targetDay) {
    return 'arriving';
  }
  
  if (checkOutDate === targetDay) {
    return 'departing';
  }
  
  const target = new Date(targetDay);
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  
  if (target > checkIn && target < checkOut) {
    return 'inhouse';
  }
  
  return '';
}

function detectLateCheckIn(row: RawNightsbridgeRow): boolean {
  if (row.lateCheckIn) {
    return parseBoolean(row.lateCheckIn);
  }
  
  const notes = row.notes?.toLowerCase() || '';
  return notes.includes('late check-in') || 
         notes.includes('late checkin') || 
         notes.includes('late arrival');
}

export function transformRows(
  rows: RawNightsbridgeRow[],
  targetDay: string
): TransformResult {
  const bookings: BookingRecord[] = [];
  const missingFields: MissingField[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    
    const guestName = row.guestName || '';
    const suiteOrUnit = row.suiteOrUnit || '';
    
    if (!guestName) {
      missingFields.push({
        row: rowNum,
        guest: `Row ${rowNum}`,
        field: 'guestName',
        reason: 'Required field missing'
      });
    }
    
    if (!suiteOrUnit) {
      missingFields.push({
        row: rowNum,
        guest: guestName || `Row ${rowNum}`,
        field: 'suiteOrUnit',
        reason: 'Required field missing'
      });
    }
    
    const checkInDate = row.checkInDate || undefined;
    const checkOutDate = row.checkOutDate || undefined;
    
    const explicitStatus = row.status?.toLowerCase().trim();
    let status: 'arriving' | 'inhouse' | 'departing' | '';
    
    if (explicitStatus && ['arriving', 'inhouse', 'departing'].includes(explicitStatus)) {
      status = explicitStatus as 'arriving' | 'inhouse' | 'departing';
    } else {
      status = deriveStatus(targetDay, checkInDate, checkOutDate);
    }
    
    if (!checkInDate || !checkOutDate) {
      missingFields.push({
        row: rowNum,
        guest: guestName || `Row ${rowNum}`,
        field: !checkInDate ? 'checkInDate' : 'checkOutDate',
        reason: 'Date missing, cannot derive status'
      });
    }
    
    const lateCheckIn = detectLateCheckIn(row);
    const adults = row.adults ? parseNumber(row.adults) : undefined;
    const children = row.children ? parseNumber(row.children) : undefined;
    const notes = row.notes || undefined;
    
    const booking: BookingRecord = {
      guestName,
      suiteOrUnit,
      status,
      checkInDate,
      checkOutDate,
      lateCheckIn: lateCheckIn || undefined,
      adults,
      children,
      notes
    };
    
    bookings.push(booking);
  }
  
  return { bookings, missingFields };
}
