import { describe, it } from 'node:test';
import assert from 'node:assert';
import { transformRows } from './transformer.js';
import { RawNightsbridgeRow } from './types.js';

describe('transformRows', () => {
  it('should transform complete bookings', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: 'John Doe',
        suiteOrUnit: 'Suite 1',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22',
        adults: '2',
        children: '0',
        notes: 'Anniversary'
      }
    ];
    
    const { bookings, missingFields } = transformRows(rows, '2026-09-20');
    
    assert.strictEqual(bookings.length, 1);
    assert.strictEqual(bookings[0].guestName, 'John Doe');
    assert.strictEqual(bookings[0].suiteOrUnit, 'Suite 1');
    assert.strictEqual(bookings[0].status, 'arriving');
    assert.strictEqual(bookings[0].adults, 2);
    assert.strictEqual(bookings[0].children, 0);
    assert.strictEqual(bookings[0].notes, 'Anniversary');
    assert.strictEqual(missingFields.length, 0);
  });
  
  it('should derive arriving status', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: 'Test Guest',
        suiteOrUnit: 'Suite 1',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22'
      }
    ];
    
    const { bookings } = transformRows(rows, '2026-09-20');
    
    assert.strictEqual(bookings[0].status, 'arriving');
  });
  
  it('should derive departing status', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: 'Test Guest',
        suiteOrUnit: 'Suite 1',
        checkInDate: '2026-09-18',
        checkOutDate: '2026-09-20'
      }
    ];
    
    const { bookings } = transformRows(rows, '2026-09-20');
    
    assert.strictEqual(bookings[0].status, 'departing');
  });
  
  it('should derive inhouse status', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: 'Test Guest',
        suiteOrUnit: 'Suite 1',
        checkInDate: '2026-09-18',
        checkOutDate: '2026-09-22'
      }
    ];
    
    const { bookings } = transformRows(rows, '2026-09-20');
    
    assert.strictEqual(bookings[0].status, 'inhouse');
  });
  
  it('should use explicit status if provided', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: 'Test Guest',
        suiteOrUnit: 'Suite 1',
        status: 'inhouse',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22'
      }
    ];
    
    const { bookings } = transformRows(rows, '2026-09-20');
    
    assert.strictEqual(bookings[0].status, 'inhouse');
  });
  
  it('should detect late check-in from lateCheckIn field', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: 'Test Guest',
        suiteOrUnit: 'Suite 1',
        lateCheckIn: 'true',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22'
      }
    ];
    
    const { bookings } = transformRows(rows, '2026-09-20');
    
    assert.strictEqual(bookings[0].lateCheckIn, true);
  });
  
  it('should detect late check-in from notes', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: 'Test Guest',
        suiteOrUnit: 'Suite 1',
        notes: 'Late arrival around 19:00',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22'
      }
    ];
    
    const { bookings } = transformRows(rows, '2026-09-20');
    
    assert.strictEqual(bookings[0].lateCheckIn, true);
  });
  
  it('should flag missing guest name', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: '',
        suiteOrUnit: 'Suite 1',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22'
      }
    ];
    
    const { missingFields } = transformRows(rows, '2026-09-20');
    
    assert.strictEqual(missingFields.length, 1);
    assert.strictEqual(missingFields[0].field, 'guestName');
  });
  
  it('should flag missing suite', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: 'Test Guest',
        suiteOrUnit: '',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22'
      }
    ];
    
    const { missingFields } = transformRows(rows, '2026-09-20');
    
    assert.strictEqual(missingFields.length, 1);
    assert.strictEqual(missingFields[0].field, 'suiteOrUnit');
  });
  
  it('should flag missing dates', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: 'Test Guest',
        suiteOrUnit: 'Suite 1'
      }
    ];
    
    const { missingFields } = transformRows(rows, '2026-09-20');
    
    assert.strictEqual(missingFields.length, 1);
    assert.strictEqual(missingFields[0].field, 'checkInDate');
  });
  
  it('should handle multiple missing fields', () => {
    const rows: RawNightsbridgeRow[] = [
      {
        guestName: '',
        suiteOrUnit: ''
      },
      {
        guestName: 'Test',
        suiteOrUnit: 'Suite 1'
      }
    ];
    
    const { missingFields } = transformRows(rows, '2026-09-20');
    
    assert.ok(missingFields.length >= 3);
  });
});
