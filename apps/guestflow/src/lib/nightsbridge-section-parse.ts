/**
 * Nightsbridge section row parser
 * Maps normalized headers to booking fields including phone/email columns
 */

export interface ParsedBooking {
  guestName: string
  guest2?: string
  suiteOrUnit: string
  status: string
  checkInDate: string
  checkOutDate: string
  lateCheckIn: boolean
  adults?: number
  children?: number
  notes?: string
  bookingId?: string
  guestPhone?: string
  guestEmail?: string
  guestPhone2?: string
  guestEmail2?: string
  nights?: number
}

/**
 * Maps Nightsbridge section row data to booking fields based on normalized headers.
 * Handles phone/email mapping including *2 variants.
 * 
 * @param headers - Array of normalized header names (lowercase, no spaces/special chars)
 * @param row - Array of cell values corresponding to headers
 * @returns Partial booking object with mapped fields
 */
export function mapNbSectionRow(headers: string[], row: any[]): Partial<ParsedBooking> {
  const booking: Partial<ParsedBooking> = {}

  headers.forEach((header, index) => {
    const value = row[index] ? String(row[index]).trim() : ''

    if (header.includes('room') || header.includes('roomname')) {
      booking.suiteOrUnit = value
    } else if (header.includes('guestname') || (header.includes('guest') && !header.includes('2') && !header.includes('number'))) {
      booking.guestName = value
    } else if (header.includes('guest2')) {
      booking.guest2 = value
    } else if (header.includes('numberofguests') || header.includes('numberguests')) {
      const num = parseInt(value) || 0
      booking.adults = Math.max(1, num)
      booking.children = 0
    } else if (header.includes('bookingid') || header.includes('booking')) {
      booking.bookingId = value
    } else if (header.includes('note')) {
      booking.notes = value
    } else if (header.includes('night')) {
      booking.nights = parseInt(value) || 0
    } else if (header.includes('phonenumber') || header.includes('phone')) {
      // Map phone number columns: "phonenumber" → guestPhone, "phonenumber2" or "phonenumber*2" → guestPhone2
      if (header.includes('2') || header.includes('*2')) {
        booking.guestPhone2 = value
      } else {
        booking.guestPhone = value
      }
    } else if (header.includes('email')) {
      // Map email columns: "email" → guestEmail, "email2" or "email*2" → guestEmail2
      if (header.includes('2') || header.includes('*2')) {
        booking.guestEmail2 = value
      } else {
        booking.guestEmail = value
      }
    }
  })

  return booking
}
