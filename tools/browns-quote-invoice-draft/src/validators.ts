import type { QuoteInput, ValidationResult } from './types.js';

export function validateQuoteInput(input: QuoteInput): ValidationResult {
  const errors: string[] = [];

  if (!input.guestName || input.guestName.trim() === '') {
    errors.push('guestName is required');
  }

  if (!input.checkInDate || input.checkInDate.trim() === '') {
    errors.push('checkInDate is required');
  }

  if (!input.checkOutDate || input.checkOutDate.trim() === '') {
    errors.push('checkOutDate is required');
  }

  if (!input.suiteOrUnit || input.suiteOrUnit.trim() === '') {
    errors.push('suiteOrUnit is required');
  }

  if (input.checkInDate && input.checkOutDate) {
    const checkIn = new Date(input.checkInDate);
    const checkOut = new Date(input.checkOutDate);
    
    if (isNaN(checkIn.getTime())) {
      errors.push('checkInDate must be a valid date');
    }
    
    if (isNaN(checkOut.getTime())) {
      errors.push('checkOutDate must be a valid date');
    }
    
    if (checkIn >= checkOut) {
      errors.push('checkOutDate must be after checkInDate');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function hasAmounts(input: QuoteInput): boolean {
  return !!(
    (input.nightlyRate !== undefined && input.nightlyRate > 0) ||
    (input.nights !== undefined && input.nights > 0) ||
    (input.total !== undefined && input.total > 0)
  );
}
