/**
 * Heuristic extraction of booking/quote data from freeform inquiry text
 * NO LLM API calls - pure pattern matching
 */

import { Booking, Quote, ExtractionResult } from './types.js';

/**
 * Extract guest name from inquiry text
 */
function extractGuestName(text: string): string | undefined {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Look for common patterns like "Name: John Smith" or just a name at the start
  const namePatterns = [
    /^(?:name|from|guest):\s*(.+)$/i,
    /^my name is\s+(.+)$/i,
    /^(?:hi|hello|dear),?\s+(?:i'?m|this is)\s+(.+)$/i,
  ];
  
  for (const line of lines.slice(0, 5)) {
    for (const pattern of namePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
  }
  
  return undefined;
}

/**
 * Extract dates from text
 */
function extractDates(text: string): { checkIn?: string; checkOut?: string } {
  const result: { checkIn?: string; checkOut?: string } = {};
  
  // Date patterns: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, Month DD, YYYY
  const datePatterns = [
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/g,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/g,
    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})/gi,
    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})/gi,
  ];
  
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      dates.push(match[1]);
    }
  }
  
  // Look for check-in/check-out context
  const checkInPatterns = [
    /check[-\s]?in:?\s*(.+?)(?:\n|check[-\s]?out|\.|$)/i,
    /arrival:?\s*(.+?)(?:\n|departure|\.|$)/i,
    /arriving:?\s*(.+?)(?:\n|leaving|\.|$)/i,
  ];
  
  const checkOutPatterns = [
    /check[-\s]?out:?\s*(.+?)(?:\n|\.|$)/i,
    /departure:?\s*(.+?)(?:\n|\.|$)/i,
    /leaving:?\s*(.+?)(?:\n|\.|$)/i,
  ];
  
  for (const pattern of checkInPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.checkIn = match[1].trim();
      break;
    }
  }
  
  for (const pattern of checkOutPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.checkOut = match[1].trim();
      break;
    }
  }
  
  // If no explicit check-in/out labels but we have 2 dates, assume first is check-in
  if (!result.checkIn && !result.checkOut && dates.length >= 2) {
    result.checkIn = dates[0];
    result.checkOut = dates[1];
  } else if (!result.checkIn && dates.length >= 1) {
    result.checkIn = dates[0];
  }
  
  return result;
}

/**
 * Extract suite/unit information
 */
function extractSuiteOrUnit(text: string): string | undefined {
  const patterns = [
    /(?:suite|unit|room|cabin|cottage):\s*(.+?)(?:\n|\.|$)/i,
    /(studio|garden suite|main suite|luxury suite|deluxe room)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

/**
 * Extract number of adults
 */
function extractAdults(text: string): number | undefined {
  const patterns = [
    /(\d+)\s*adults?/i,
    /adults?:\s*(\d+)/i,
    /guests?:\s*(\d+)\s*adults?/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return undefined;
}

/**
 * Extract number of children
 */
function extractChildren(text: string): number | undefined {
  const patterns = [
    /(\d+)\s*child(?:ren)?/i,
    /child(?:ren)?:\s*(\d+)/i,
    /kids?:\s*(\d+)/i,
    /(\d+)\s*kids?/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return undefined;
}

/**
 * Extract late check-in flag
 */
function extractLateCheckIn(text: string): boolean {
  const patterns = [
    /late\s+check[-\s]?in/i,
    /arriving\s+late/i,
    /late\s+arrival/i,
  ];
  
  return patterns.some(pattern => pattern.test(text));
}

/**
 * Extract channel (email, whatsapp, etc.)
 */
function extractChannel(text: string): string {
  // Default heuristic: if text looks like email format, assume email
  if (text.includes('@') || text.toLowerCase().includes('subject:')) {
    return 'email';
  }
  if (text.toLowerCase().includes('whatsapp') || text.includes('+27') || text.includes('+1')) {
    return 'whatsapp';
  }
  return 'unknown';
}

/**
 * Extract amounts - ONLY if clearly present with currency
 * NEVER invent or calculate rates
 */
function extractAmounts(text: string): { 
  depositAmount?: number; 
  totalAmount?: number; 
  quoteAmount?: number;
  currency?: string;
} {
  const result: { 
    depositAmount?: number; 
    totalAmount?: number; 
    quoteAmount?: number;
    currency?: string;
  } = {};
  
  // Currency patterns
  const currencyPatterns = [
    /(?:R|ZAR)\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/i,
    /\$\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/,
    /(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)\s*(?:rand|rands)/i,
  ];
  
  // Deposit patterns
  const depositPatterns = [
    /deposit:?\s*(?:R|ZAR|\$)?\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/i,
  ];
  
  // Total patterns
  const totalPatterns = [
    /total:?\s*(?:R|ZAR|\$)?\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/i,
  ];
  
  // Quote patterns
  const quotePatterns = [
    /quote:?\s*(?:R|ZAR|\$)?\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/i,
    /price:?\s*(?:R|ZAR|\$)?\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/i,
  ];
  
  // Detect currency
  if (/(?:R|ZAR|rand)/i.test(text)) {
    result.currency = 'ZAR';
  } else if (/\$|USD|dollar/i.test(text)) {
    result.currency = 'USD';
  }
  
  // Extract deposit
  for (const pattern of depositPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.depositAmount = parseFloat(match[1].replace(/[,\s]/g, ''));
      break;
    }
  }
  
  // Extract total
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.totalAmount = parseFloat(match[1].replace(/[,\s]/g, ''));
      break;
    }
  }
  
  // Extract quote amount
  for (const pattern of quotePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.quoteAmount = parseFloat(match[1].replace(/[,\s]/g, ''));
      break;
    }
  }
  
  return result;
}

/**
 * Extract all available information from inquiry text
 */
export function extractInquiry(text: string): ExtractionResult {
  const guestName = extractGuestName(text);
  const dates = extractDates(text);
  const suiteOrUnit = extractSuiteOrUnit(text);
  const adults = extractAdults(text);
  const children = extractChildren(text);
  const lateCheckIn = extractLateCheckIn(text);
  const channel = extractChannel(text);
  const amounts = extractAmounts(text);
  
  const booking: Booking = {
    guestName,
    checkInDate: dates.checkIn,
    checkOutDate: dates.checkOut,
    suiteOrUnit,
    adults,
    children,
    lateCheckIn,
    channel,
    notes: text,
  };
  
  // Only add amounts if they were explicitly found
  if (amounts.depositAmount !== undefined) {
    booking.depositAmount = amounts.depositAmount;
  }
  if (amounts.totalAmount !== undefined) {
    booking.totalAmount = amounts.totalAmount;
  }
  if (amounts.currency) {
    booking.currency = amounts.currency;
  }
  
  const quote: Quote = {
    guestName,
    checkInDate: dates.checkIn,
    checkOutDate: dates.checkOut,
    suiteOrUnit,
    adults,
    children,
    channel,
    notes: text,
  };
  
  // Only add quote amount if explicitly found
  if (amounts.quoteAmount !== undefined) {
    quote.quoteAmount = amounts.quoteAmount;
  }
  if (amounts.currency) {
    quote.currency = amounts.currency;
  }
  
  // Track missing fields
  const missingFields: string[] = [];
  if (!guestName) missingFields.push('guestName');
  if (!dates.checkIn) missingFields.push('checkInDate');
  if (!dates.checkOut) missingFields.push('checkOutDate');
  if (!adults) missingFields.push('adults');
  
  return {
    booking,
    quote,
    missingFields,
  };
}

/**
 * Validate extraction result
 */
export function validateExtraction(result: ExtractionResult): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (result.missingFields.length > 0) {
    warnings.push(`Missing required fields: ${result.missingFields.join(', ')}`);
  }
  
  if (result.booking.depositAmount || result.booking.totalAmount || result.quote.quoteAmount) {
    // Amounts were found - this is OK but flag for review
    warnings.push('Amounts were extracted from text - please verify accuracy before using');
  }
  
  return {
    valid: result.missingFields.length < 4, // Valid if we got at least some data
    warnings,
  };
}
