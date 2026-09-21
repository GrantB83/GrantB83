import { describe, it, expect } from 'vitest'
import { mapNbSectionRow } from '../route'

describe('mapNbSectionRow - Phone/Email Mapping (Phase 014)', () => {
  describe('Phone Number mapping', () => {
    it('should map "phonenumber" header to guestPhone', () => {
      const headers = ['roomname', 'guestname', 'phonenumber', 'bookingid']
      const row = ['Cottage Falcon', 'Jane Doe', '+27821234567', 'NB-12345']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestName).toBe('Jane Doe')
      expect(result.suiteOrUnit).toBe('Cottage Falcon')
      expect(result.guestPhone).toBe('+27821234567')
      expect(result.guestPhone2).toBeUndefined()
    })

    it('should map "phonenumber2" header to guestPhone2', () => {
      const headers = ['roomname', 'guestname', 'phonenumber', 'phonenumber2', 'bookingid']
      const row = ['Cottage Hawk', 'Alice & Bob', '+27829876543', '+27828765432', 'NB-11111']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestPhone).toBe('+27829876543')
      expect(result.guestPhone2).toBe('+27828765432')
    })

    it('should map "phonenumber*2" header (with asterisk) to guestPhone2', () => {
      const headers = ['roomname', 'guestname', 'phonenumber', 'phonenumber*2']
      const row = ['Cottage Eagle', 'John & Mary', '+27821111111', '+27822222222']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestPhone).toBe('+27821111111')
      expect(result.guestPhone2).toBe('+27822222222')
    })

    it('should handle local SA phone format (082...)', () => {
      const headers = ['roomname', 'guestname', 'phonenumber', 'bookingid']
      const row = ['Cottage Raven', 'Charlie Brown', '082 555 6789', 'NB-22222']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestPhone).toBe('082 555 6789')
      // Note: E.164 normalization happens in upsertGuestContact, not in parser
    })

    it('should handle "phone" shorthand header', () => {
      const headers = ['roomname', 'guestname', 'phone', 'bookingid']
      const row = ['Cottage Test', 'Test Guest', '+27823456789', 'NB-99999']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestPhone).toBe('+27823456789')
    })
  })

  describe('Email mapping', () => {
    it('should map "email" header to guestEmail', () => {
      const headers = ['roomname', 'guestname', 'email', 'bookingid']
      const row = ['Cottage Falcon', 'Jane Doe', 'jane@example.com', 'NB-12345']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestEmail).toBe('jane@example.com')
      expect(result.guestEmail2).toBeUndefined()
    })

    it('should map "email2" header to guestEmail2', () => {
      const headers = ['roomname', 'guestname', 'email', 'email2']
      const row = ['Cottage Hawk', 'Alice & Bob', 'alice@example.com', 'bob@example.com']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestEmail).toBe('alice@example.com')
      expect(result.guestEmail2).toBe('bob@example.com')
    })

    it('should map "email*2" header (with asterisk) to guestEmail2', () => {
      const headers = ['roomname', 'guestname', 'email', 'email*2']
      const row = ['Cottage Eagle', 'John & Mary', 'john@example.com', 'mary@example.com']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestEmail).toBe('john@example.com')
      expect(result.guestEmail2).toBe('mary@example.com')
    })
  })

  describe('Phone + Email together', () => {
    it('should map both phone and email from same row', () => {
      const headers = ['roomname', 'guestname', 'phonenumber', 'email', 'numberofguests', 'bookingid', 'nights']
      const row = ['Cottage Falcon', 'Jane Doe', '+27821234567', 'jane@example.com', 2, 'NB-12345', 3]

      const result = mapNbSectionRow(headers, row)

      expect(result.guestName).toBe('Jane Doe')
      expect(result.suiteOrUnit).toBe('Cottage Falcon')
      expect(result.guestPhone).toBe('+27821234567')
      expect(result.guestEmail).toBe('jane@example.com')
      expect(result.adults).toBe(2)
      expect(result.bookingId).toBe('NB-12345')
      expect(result.nights).toBe(3)
    })

    it('should map all four contact fields when present', () => {
      const headers = ['roomname', 'guestname', 'phonenumber', 'email', 'phonenumber*2', 'email*2', 'bookingid']
      const row = ['Cottage Hawk', 'Alice & Bob', '+27829876543', 'alice@example.com', '+27828765432', 'bob@example.com', 'NB-11111']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestPhone).toBe('+27829876543')
      expect(result.guestEmail).toBe('alice@example.com')
      expect(result.guestPhone2).toBe('+27828765432')
      expect(result.guestEmail2).toBe('bob@example.com')
    })
  })

  describe('Sections without phone/email columns', () => {
    it('should handle rows without phone/email headers (no crash)', () => {
      const headers = ['roomname', 'guestname', 'numberofguests', 'bookingid', 'nights']
      const row = ['Cottage Eagle', 'John Smith', 2, 'NB-67890', 2]

      const result = mapNbSectionRow(headers, row)

      expect(result.guestName).toBe('John Smith')
      expect(result.suiteOrUnit).toBe('Cottage Eagle')
      expect(result.guestPhone).toBeUndefined()
      expect(result.guestEmail).toBeUndefined()
      expect(result.guestPhone2).toBeUndefined()
      expect(result.guestEmail2).toBeUndefined()
      expect(result.adults).toBe(2)
    })

    it('should handle departure section with minimal headers', () => {
      const headers = ['roomname', 'guestname', 'bookingid']
      const row = ['Cottage Test', 'Test Guest', 'NB-88888']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestName).toBe('Test Guest')
      expect(result.suiteOrUnit).toBe('Cottage Test')
      expect(result.bookingId).toBe('NB-88888')
      expect(result.guestPhone).toBeUndefined()
      expect(result.guestEmail).toBeUndefined()
    })
  })

  describe('Empty and edge cases', () => {
    it('should handle empty phone/email cells', () => {
      const headers = ['roomname', 'guestname', 'phonenumber', 'email', 'bookingid']
      const row = ['Cottage Falcon', 'Jane Doe', '', '', 'NB-12345']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestPhone).toBe('')
      expect(result.guestEmail).toBe('')
    })

    it('should handle null/undefined values in row', () => {
      const headers = ['roomname', 'guestname', 'phonenumber', 'email']
      const row = ['Cottage Test', 'Test Guest', null, undefined]

      const result = mapNbSectionRow(headers, row)

      expect(result.guestPhone).toBe('')
      expect(result.guestEmail).toBe('')
    })

    it('should trim whitespace from phone/email values', () => {
      const headers = ['roomname', 'guestname', 'phonenumber', 'email']
      const row = ['Cottage Test', 'Test Guest', '  +27821234567  ', '  test@example.com  ']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestPhone).toBe('+27821234567')
      expect(result.guestEmail).toBe('test@example.com')
    })
  })

  describe('Header normalization compatibility', () => {
    it('should work with real Nightsbridge header normalization (lowercase, no spaces)', () => {
      // Simulates what happens when "Phone Number" becomes "phonenumber" after .toLowerCase().replace(/[^a-z0-9]/g, '')
      const headers = ['roomname', 'guestname', 'phonenumber', 'email', 'numberofguests', 'bookingid']
      const row = ['Cottage Falcon', 'Jane Doe', '+27821234567', 'jane@example.com', 2, 'NB-12345']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestPhone).toBe('+27821234567')
      expect(result.guestEmail).toBe('jane@example.com')
    })

    it('should work with "Phone Number *2" normalized to "phonenumber*2"', () => {
      // The asterisk and number stay after normalization
      const headers = ['roomname', 'guestname', 'phonenumber', 'email', 'phonenumber*2', 'email*2']
      const row = ['Cottage Hawk', 'Alice & Bob', '+27829876543', 'alice@example.com', '+27828765432', 'bob@example.com']

      const result = mapNbSectionRow(headers, row)

      expect(result.guestPhone).toBe('+27829876543')
      expect(result.guestEmail).toBe('alice@example.com')
      expect(result.guestPhone2).toBe('+27828765432')
      expect(result.guestEmail2).toBe('bob@example.com')
    })
  })

  describe('Existing field mappings (regression)', () => {
    it('should still map all existing fields correctly', () => {
      const headers = [
        'roomname',
        'guestname',
        'guest2',
        'phonenumber',
        'email',
        'numberofguests',
        'bookingid',
        'notes',
        'nights'
      ]
      const row = [
        'Cottage Falcon',
        'Jane Doe',
        'John Doe',
        '+27821234567',
        'jane@example.com',
        2,
        'NB-12345',
        'Late check-in',
        3
      ]

      const result = mapNbSectionRow(headers, row)

      expect(result.suiteOrUnit).toBe('Cottage Falcon')
      expect(result.guestName).toBe('Jane Doe')
      expect(result.guest2).toBe('John Doe')
      expect(result.guestPhone).toBe('+27821234567')
      expect(result.guestEmail).toBe('jane@example.com')
      expect(result.adults).toBe(2)
      expect(result.bookingId).toBe('NB-12345')
      expect(result.notes).toBe('Late check-in')
      expect(result.nights).toBe(3)
    })
  })
})
