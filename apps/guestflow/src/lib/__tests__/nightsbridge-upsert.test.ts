/**
 * Unit Tests: Nightsbridge UPSERT Core Logic
 * 
 * Tests for incremental booking updates with durable identity (nbid + natural key fallback)
 * and window-based soft-cancel logic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  normalizeGuestName,
  normalizeSuite,
  upsertBooking,
  determineImportWindow,
  softCancelDisappearedBookings,
  type ParsedBooking,
} from '../nightsbridge-upsert'

describe('nightsbridge-upsert', () => {
  let db: Database.Database
  let tenantId: number

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:')

    // Create minimal schema
    db.exec(`
      CREATE TABLE tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );

      CREATE TABLE bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        guest_name TEXT NOT NULL,
        guest_name_norm TEXT,
        suite_or_unit TEXT,
        suite_or_unit_norm TEXT,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        adults INTEGER DEFAULT 2,
        children INTEGER DEFAULT 0,
        notes TEXT,
        late_check_in BOOLEAN DEFAULT 0,
        guest_phone TEXT,
        status TEXT,
        nightsbridge_booking_id TEXT,
        last_import_at DATETIME,
        import_batch_id TEXT,
        source TEXT DEFAULT 'nb',
        last_seen_import_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      CREATE UNIQUE INDEX idx_bookings_nbid 
      ON bookings(tenant_id, nightsbridge_booking_id) 
      WHERE nightsbridge_booking_id IS NOT NULL;

      CREATE UNIQUE INDEX idx_bookings_natural_key 
      ON bookings(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm);
    `)

    // Insert test tenant
    const result = db.prepare('INSERT INTO tenants (name) VALUES (?)').run('Test Tenant')
    tenantId = result.lastInsertRowid as number
  })

  afterEach(() => {
    db.close()
  })

  describe('normalizeGuestName', () => {
    it('should convert to lowercase', () => {
      expect(normalizeGuestName('Sarah Henderson')).toBe('sarah henderson')
      expect(normalizeGuestName('JOHN DOE')).toBe('john doe')
    })

    it('should trim whitespace', () => {
      expect(normalizeGuestName('  Sarah Henderson  ')).toBe('sarah henderson')
    })

    it('should collapse multiple spaces', () => {
      expect(normalizeGuestName('Sarah  Henderson')).toBe('sarah henderson')
      expect(normalizeGuestName('Sarah   Henderson')).toBe('sarah henderson')
    })

    it('should handle empty string', () => {
      expect(normalizeGuestName('')).toBe('')
    })
  })

  describe('normalizeSuite', () => {
    it('should convert to lowercase', () => {
      expect(normalizeSuite('Luxury Suite 1')).toBe('luxury suite 1')
      expect(normalizeSuite('GARDEN SUITE')).toBe('garden suite')
    })

    it('should trim whitespace', () => {
      expect(normalizeSuite('  Luxury Suite 1  ')).toBe('luxury suite 1')
    })

    it('should collapse multiple spaces', () => {
      expect(normalizeSuite('Luxury  Suite  1')).toBe('luxury suite 1')
    })

    it('should handle empty string', () => {
      expect(normalizeSuite('')).toBe('')
    })
  })

  describe('upsertBooking', () => {
    const batchId = 'test-batch-123'

    it('should insert new booking with nbid', () => {
      const booking: ParsedBooking = {
        guestName: 'Sarah Henderson',
        suiteOrUnit: 'Luxury Suite 1',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22',
        status: 'arriving',
        adults: 2,
        children: 0,
        notes: '',
        bookingId: 'NB12345',
        guestPhone: '+27123456789',
        lateCheckIn: false,
      }

      const result = upsertBooking(db, booking, tenantId, batchId)

      expect(result.action).toBe('inserted')
      expect(result.id).toBeGreaterThan(0)

      // Verify inserted data
      const inserted = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.id) as any
      expect(inserted.guest_name).toBe('Sarah Henderson')
      expect(inserted.guest_name_norm).toBe('sarah henderson')
      expect(inserted.suite_or_unit_norm).toBe('luxury suite 1')
      expect(inserted.nightsbridge_booking_id).toBe('NB12345')
      expect(inserted.import_batch_id).toBe(batchId)
      expect(inserted.source).toBe('nb')
    })

    it('should update existing booking with same nbid', () => {
      const booking: ParsedBooking = {
        guestName: 'Sarah Henderson',
        suiteOrUnit: 'Luxury Suite 1',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22',
        status: 'arriving',
        adults: 2,
        children: 0,
        notes: '',
        bookingId: 'NB12345',
        guestPhone: '+27123456789',
        lateCheckIn: false,
      }

      // First insert
      const first = upsertBooking(db, booking, tenantId, batchId)
      expect(first.action).toBe('inserted')

      // Update with same nbid but different phone
      const updated: ParsedBooking = {
        ...booking,
        guestPhone: '+27987654321',
        notes: 'Late arrival ~19:00',
      }

      const second = upsertBooking(db, updated, tenantId, 'batch-2')
      expect(second.action).toBe('updated')
      expect(second.id).toBe(first.id) // Same row

      // Verify updated data
      const record = db.prepare('SELECT * FROM bookings WHERE id = ?').get(second.id) as any
      expect(record.guest_phone).toBe('+27987654321')
      expect(record.notes).toBe('Late arrival ~19:00')
      expect(record.nightsbridge_booking_id).toBe('NB12345')
    })

    it('should update existing booking with natural key (no nbid)', () => {
      const booking: ParsedBooking = {
        guestName: 'Emma Thompson',
        suiteOrUnit: 'Garden Suite',
        checkInDate: '2026-09-21',
        checkOutDate: '2026-09-23',
        status: 'arriving',
        adults: 1,
        children: 0,
        notes: '',
        guestPhone: '+27111222333',
        lateCheckIn: false,
      }

      // First insert (no nbid)
      const first = upsertBooking(db, booking, tenantId, batchId)
      expect(first.action).toBe('inserted')

      // Update with same natural key but different status
      const updated: ParsedBooking = {
        ...booking,
        status: 'inhouse',
        adults: 2,
      }

      const second = upsertBooking(db, updated, tenantId, 'batch-2')
      expect(second.action).toBe('updated')
      expect(second.id).toBe(first.id) // Same row

      // Verify updated data
      const record = db.prepare('SELECT * FROM bookings WHERE id = ?').get(second.id) as any
      expect(record.status).toBe('inhouse')
      expect(record.adults).toBe(2)
    })

    it('should return unchanged when no mutable fields change', () => {
      const booking: ParsedBooking = {
        guestName: 'James Wilson',
        suiteOrUnit: 'Family Suite',
        checkInDate: '2026-09-22',
        checkOutDate: '2026-09-24',
        status: 'arriving',
        adults: 4,
        children: 0,
        notes: 'Test notes',
        bookingId: 'NB12347',
        guestPhone: '+27444555666',
        lateCheckIn: false,
      }

      // First insert
      const first = upsertBooking(db, booking, tenantId, batchId)
      expect(first.action).toBe('inserted')

      // Reimport with exact same data
      const second = upsertBooking(db, booking, tenantId, 'batch-2')
      expect(second.action).toBe('unchanged')
      expect(second.id).toBe(first.id)
    })

    it('should preserve immutable fields on update', () => {
      const booking: ParsedBooking = {
        guestName: 'Test Guest',
        suiteOrUnit: 'Test Suite',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-21',
        status: 'arriving',
        bookingId: 'NB99999',
        lateCheckIn: false,
      }

      const first = upsertBooking(db, booking, tenantId, batchId)
      const originalRecord = db.prepare('SELECT * FROM bookings WHERE id = ?').get(first.id) as any

      // Try to "update" with different guest_name, dates, etc (should not change these)
      const updated: ParsedBooking = {
        ...booking,
        guestPhone: '+27999888777', // This should update
      }

      const second = upsertBooking(db, updated, tenantId, 'batch-2')
      const updatedRecord = db.prepare('SELECT * FROM bookings WHERE id = ?').get(second.id) as any

      // Immutable fields preserved
      expect(updatedRecord.id).toBe(originalRecord.id)
      expect(updatedRecord.tenant_id).toBe(originalRecord.tenant_id)
      expect(updatedRecord.guest_name).toBe(originalRecord.guest_name)
      expect(updatedRecord.check_in).toBe(originalRecord.check_in)
      expect(updatedRecord.check_out).toBe(originalRecord.check_out)
      expect(updatedRecord.suite_or_unit).toBe(originalRecord.suite_or_unit)
      expect(updatedRecord.created_at).toBe(originalRecord.created_at)

      // Mutable field updated
      expect(updatedRecord.guest_phone).toBe('+27999888777')
    })

    it('should handle case-insensitive name matching via normalization', () => {
      const booking1: ParsedBooking = {
        guestName: 'Sarah Henderson',
        suiteOrUnit: 'Luxury Suite 1',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22',
        status: 'arriving',
        lateCheckIn: false,
      }

      const first = upsertBooking(db, booking1, tenantId, batchId)

      // Same booking with different casing
      const booking2: ParsedBooking = {
        guestName: 'SARAH HENDERSON',
        suiteOrUnit: 'LUXURY  SUITE  1', // Also test whitespace normalization
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22',
        status: 'arriving',
        guestPhone: '+27123456789',
        lateCheckIn: false,
      }

      const second = upsertBooking(db, booking2, tenantId, 'batch-2')
      expect(second.action).toBe('updated') // Matches via normalized natural key
      expect(second.id).toBe(first.id)
    })
  })

  describe('determineImportWindow', () => {
    it('should return min/max dates from bookings', () => {
      const bookings: ParsedBooking[] = [
        {
          guestName: 'Guest 1',
          suiteOrUnit: 'Suite 1',
          checkInDate: '2026-09-20',
          checkOutDate: '2026-09-22',
          status: 'arriving',
          lateCheckIn: false,
        },
        {
          guestName: 'Guest 2',
          suiteOrUnit: 'Suite 2',
          checkInDate: '2026-09-18',
          checkOutDate: '2026-09-25',
          status: 'inhouse',
          lateCheckIn: false,
        },
        {
          guestName: 'Guest 3',
          suiteOrUnit: 'Suite 3',
          checkInDate: '2026-09-21',
          checkOutDate: '2026-09-23',
          status: 'arriving',
          lateCheckIn: false,
        },
      ]

      const window = determineImportWindow(bookings)
      expect(window.minDate).toBe('2026-09-18')
      expect(window.maxDate).toBe('2026-09-25')
    })

    it('should return today for empty bookings', () => {
      const window = determineImportWindow([])
      expect(window.minDate).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
      expect(window.maxDate).toBe(window.minDate) // Same as minDate
    })
  })

  describe('softCancelDisappearedBookings', () => {
    const batchId = 'test-batch-123'

    it('should cancel booking within window but missing from import', () => {
      // Insert existing booking
      const existing: ParsedBooking = {
        guestName: 'Emma Thompson',
        suiteOrUnit: 'Garden Suite',
        checkInDate: '2026-09-21',
        checkOutDate: '2026-09-23',
        status: 'arriving',
        bookingId: 'NB_OLD',
        lateCheckIn: false,
      }

      const existingResult = upsertBooking(db, existing, tenantId, 'batch-0')

      // Import window covers this booking, but booking is missing from new import
      const importWindow = {
        minDate: '2026-09-20',
        maxDate: '2026-09-25',
      }

      const parsedBookings: ParsedBooking[] = [
        // Emma is NOT in this list
        {
          guestName: 'Sarah Henderson',
          suiteOrUnit: 'Luxury Suite 1',
          checkInDate: '2026-09-20',
          checkOutDate: '2026-09-22',
          status: 'arriving',
          lateCheckIn: false,
        },
      ]

      const cancelledCount = softCancelDisappearedBookings(db, tenantId, importWindow, batchId, parsedBookings)
      expect(cancelledCount).toBe(1)

      // Verify Emma is now cancelled
      const record = db.prepare('SELECT * FROM bookings WHERE id = ?').get(existingResult.id) as any
      expect(record.status).toBe('cancelled')
      expect(record.last_seen_import_at).toBeTruthy()
    })

    it('should NOT cancel booking outside import window', () => {
      // Insert booking for October (outside Sept 20-25 window)
      const existing: ParsedBooking = {
        guestName: 'James Wilson',
        suiteOrUnit: 'Family Suite',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-18',
        status: 'arriving',
        bookingId: 'NB_FUTURE',
        lateCheckIn: false,
      }

      const existingResult = upsertBooking(db, existing, tenantId, 'batch-0')

      // Import window does NOT cover James
      const importWindow = {
        minDate: '2026-09-20',
        maxDate: '2026-09-25',
      }

      const parsedBookings: ParsedBooking[] = [] // No bookings in import

      const cancelledCount = softCancelDisappearedBookings(db, tenantId, importWindow, batchId, parsedBookings)
      expect(cancelledCount).toBe(0) // James should NOT be cancelled

      // Verify James still has original status
      const record = db.prepare('SELECT * FROM bookings WHERE id = ?').get(existingResult.id) as any
      expect(record.status).toBe('arriving') // NOT cancelled
    })

    it('should reactivate cancelled booking when it reappears', () => {
      // Insert and cancel booking
      const booking: ParsedBooking = {
        guestName: 'Sarah Henderson',
        suiteOrUnit: 'Luxury Suite 1',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-22',
        status: 'arriving',
        bookingId: 'NB12345',
        lateCheckIn: false,
      }

      const first = upsertBooking(db, booking, tenantId, 'batch-1')
      db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('cancelled', first.id)

      // Booking reappears in new import with updated status
      const reappeared: ParsedBooking = {
        ...booking,
        status: 'inhouse',
      }

      const second = upsertBooking(db, reappeared, tenantId, 'batch-2')
      expect(second.action).toBe('updated')

      // Verify status is back to active (not cancelled)
      const record = db.prepare('SELECT * FROM bookings WHERE id = ?').get(second.id) as any
      expect(record.status).toBe('inhouse') // Reactivated
    })

    it('should match by nbid when cancelling', () => {
      // Insert booking with nbid
      const booking: ParsedBooking = {
        guestName: 'Test Guest',
        suiteOrUnit: 'Test Suite',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-21',
        status: 'arriving',
        bookingId: 'NB_UNIQUE',
        lateCheckIn: false,
      }

      const existing = upsertBooking(db, booking, tenantId, 'batch-0')

      const importWindow = {
        minDate: '2026-09-20',
        maxDate: '2026-09-25',
      }

      // Booking with same nbid is in import (should NOT be cancelled)
      const parsedBookings: ParsedBooking[] = [
        { ...booking, status: 'inhouse' },
      ]

      const cancelledCount = softCancelDisappearedBookings(db, tenantId, importWindow, batchId, parsedBookings)
      expect(cancelledCount).toBe(0)

      const record = db.prepare('SELECT * FROM bookings WHERE id = ?').get(existing.id) as any
      expect(record.status).toBe('arriving') // NOT cancelled (matched by nbid)
    })

    it('should match by natural key when nbid is missing', () => {
      // Insert booking without nbid
      const booking: ParsedBooking = {
        guestName: 'Natural Key Guest',
        suiteOrUnit: 'Natural Suite',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-21',
        status: 'arriving',
        lateCheckIn: false,
      }

      const existing = upsertBooking(db, booking, tenantId, 'batch-0')

      const importWindow = {
        minDate: '2026-09-20',
        maxDate: '2026-09-25',
      }

      // Same booking in import (matched by natural key, no nbid)
      const parsedBookings: ParsedBooking[] = [
        { ...booking, status: 'inhouse' },
      ]

      const cancelledCount = softCancelDisappearedBookings(db, tenantId, importWindow, batchId, parsedBookings)
      expect(cancelledCount).toBe(0)

      const record = db.prepare('SELECT * FROM bookings WHERE id = ?').get(existing.id) as any
      expect(record.status).toBe('arriving') // NOT cancelled (matched by natural key)
    })
  })
})
