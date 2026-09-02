import { readFileSync } from 'fs';
import { BookingRecord } from './types.js';

export function parseBookings(filepath: string): BookingRecord[] {
  const content = readFileSync(filepath, 'utf-8').trim();
  
  if (filepath.endsWith('.json')) {
    return parseJSON(content);
  } else if (filepath.endsWith('.csv')) {
    return parseCSV(content);
  } else {
    throw new Error(`Unsupported file format: ${filepath}. Use .json or .csv`);
  }
}

function parseJSON(content: string): BookingRecord[] {
  try {
    const data = JSON.parse(content);
    
    if (!Array.isArray(data)) {
      throw new Error('JSON file must contain an array of booking records');
    }
    
    return data.map((record: any) => validateBooking(record));
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${err.message}`);
    }
    throw err;
  }
}

function parseCSV(content: string): BookingRecord[] {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const records: BookingRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      const lowerHeader = header.toLowerCase();
      
      if (lowerHeader === 'latecheckin') {
        record.lateCheckIn = value.toLowerCase() === 'true' || value === '1';
      } else if (lowerHeader === 'adults' || lowerHeader === 'children') {
        const num = parseInt(value, 10);
        if (!isNaN(num)) record[lowerHeader] = num;
      } else if (value) {
        const fieldMap: Record<string, string> = {
          'guestname': 'guestName',
          'suiteorunitsuite': 'suiteOrUnit',
          'status': 'status',
          'checkindate': 'checkInDate',
          'checkoutdate': 'checkOutDate',
          'notes': 'notes',
        };
        
        const mappedField = fieldMap[lowerHeader] || header;
        record[mappedField] = value;
      }
    });
    
    records.push(validateBooking(record));
  }
  
  return records;
}

function validateBooking(record: any): BookingRecord {
  if (!record.guestName || typeof record.guestName !== 'string') {
    throw new Error('Each booking must have a guestName (string)');
  }
  
  if (!record.suiteOrUnit || typeof record.suiteOrUnit !== 'string') {
    throw new Error('Each booking must have a suiteOrUnit (string)');
  }
  
  const validStatuses = ['arriving', 'inhouse', 'departing'];
  if (!validStatuses.includes(record.status)) {
    throw new Error(`Booking status must be one of: ${validStatuses.join(', ')}`);
  }
  
  return {
    guestName: record.guestName,
    suiteOrUnit: record.suiteOrUnit,
    status: record.status,
    checkInDate: record.checkInDate,
    checkOutDate: record.checkOutDate,
    lateCheckIn: record.lateCheckIn || false,
    notes: record.notes,
    adults: record.adults,
    children: record.children,
  };
}

export function parseFacts(filepath: string): Record<string, string> {
  const content = readFileSync(filepath, 'utf-8').trim();
  
  try {
    const data = JSON.parse(content);
    
    if (typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Facts file must be a JSON object (key-value pairs)');
    }
    
    return data;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON in facts file: ${err.message}`);
    }
    throw err;
  }
}
