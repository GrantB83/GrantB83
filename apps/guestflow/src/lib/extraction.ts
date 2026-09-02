/**
 * Heuristic extraction of booking/quote data from freeform inquiry text
 * Mirrors tools/browns-inquiry-intake semantics
 * NO LLM - pure pattern matching
 * Phase 22: DRAFT/fixtures only
 */

export interface InquiryExtraction {
  guestName?: string
  email?: string
  phone?: string
  checkInDate?: string
  checkOutDate?: string
  suiteOrUnit?: string
  adults?: number
  children?: number
  lateCheckIn?: boolean
  specialRequests?: string[]
  channel?: string
  notes?: string
  // Amounts ONLY if explicitly present with currency
  depositAmount?: number
  totalAmount?: number
  quoteAmount?: number
  currency?: string
  // Missing field tracking
  missingFields?: string[]
}

/**
 * Extract guest name from inquiry text
 */
function extractGuestName(text: string): string | undefined {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  // Look for common patterns
  const namePatterns = [
    /^(?:name|from|guest):\s*(.+)$/i,
    /^my name is\s+(.+)$/i,
    /^(?:hi|hello|dear),?\s+(?:i'?m|this is)\s+(.+)$/i,
  ]
  
  for (const line of lines.slice(0, 5)) {
    for (const pattern of namePatterns) {
      const match = line.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
  }
  
  return undefined
}

/**
 * Extract email from text
 */
function extractEmail(text: string): string | undefined {
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  const match = text.match(emailPattern)
  return match ? match[1] : undefined
}

/**
 * Extract phone from text
 */
function extractPhone(text: string): string | undefined {
  const phonePatterns = [
    /(?:\+27\s*)?(\d{2}\s*\d{3}\s*\d{4})/,
    /(?:\+1\s*)?(\(\d{3}\)\s*\d{3}-\d{4})/,
    /(?:\+\d{1,3}\s*)?(\d{9,15})/,
  ]
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }
  
  return undefined
}

/**
 * Extract dates from text
 */
function extractDates(text: string): { checkIn?: string; checkOut?: string } {
  const result: { checkIn?: string; checkOut?: string } = {}
  
  // Date patterns
  const datePatterns = [
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/g,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/g,
    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})/gi,
    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})/gi,
  ]
  
  const dates: string[] = []
  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      dates.push(match[1])
    }
  }
  
  // Look for check-in/check-out context
  const checkInPatterns = [
    /check[-\s]?in:?\s*(.+?)(?:\n|check[-\s]?out|\.|$)/i,
    /arrival:?\s*(.+?)(?:\n|departure|\.|$)/i,
    /arriving:?\s*(.+?)(?:\n|leaving|\.|$)/i,
  ]
  
  const checkOutPatterns = [
    /check[-\s]?out:?\s*(.+?)(?:\n|\.|$)/i,
    /departure:?\s*(.+?)(?:\n|\.|$)/i,
    /leaving:?\s*(.+?)(?:\n|\.|$)/i,
  ]
  
  for (const pattern of checkInPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.checkIn = match[1].trim()
      break
    }
  }
  
  for (const pattern of checkOutPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.checkOut = match[1].trim()
      break
    }
  }
  
  // If no explicit check-in/out labels but we have 2 dates, assume first is check-in
  if (!result.checkIn && !result.checkOut && dates.length >= 2) {
    result.checkIn = dates[0]
    result.checkOut = dates[1]
  } else if (!result.checkIn && dates.length >= 1) {
    result.checkIn = dates[0]
  }
  
  return result
}

/**
 * Extract suite/unit information
 */
function extractSuiteOrUnit(text: string): string | undefined {
  const patterns = [
    /(?:suite|unit|room|cabin|cottage):\s*(.+?)(?:\n|\.|$)/i,
    /(studio|garden suite|main suite|luxury suite|deluxe room|riverside suite|mountain view)/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }
  
  return undefined
}

/**
 * Extract number of adults
 */
function extractAdults(text: string): number | undefined {
  const patterns = [
    /(\d+)\s*adults?/i,
    /adults?:\s*(\d+)/i,
    /guests?:\s*(\d+)\s*adults?/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return parseInt(match[1], 10)
    }
  }
  
  return undefined
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
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return parseInt(match[1], 10)
    }
  }
  
  return undefined
}

/**
 * Extract late check-in flag
 */
function extractLateCheckIn(text: string): boolean {
  const patterns = [
    /late\s+check[-\s]?in/i,
    /arriving\s+late/i,
    /late\s+arrival/i,
    /after[-\s]hours/i,
  ]
  
  return patterns.some(pattern => pattern.test(text))
}

/**
 * Extract special requests
 */
function extractSpecialRequests(text: string): string[] {
  const requests: string[] = []
  const patterns = [
    /(?:special\s+)?request(?:s)?:\s*(.+?)(?:\n|$)/gi,
    /(breakfast|dinner|lunch)/gi,
    /(pet|dog|cat)/gi,
    /(room with a view|view room|ocean view|mountain view)/gi,
    /(wheelchair|disabled access|accessibility)/gi,
  ]
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const req = match[1].trim()
      if (req && !requests.includes(req)) {
        requests.push(req)
      }
    }
  }
  
  return requests
}

/**
 * Extract channel (email, whatsapp, etc.)
 */
function extractChannel(text: string): string {
  if (text.includes('@') || text.toLowerCase().includes('subject:')) {
    return 'email'
  }
  if (text.toLowerCase().includes('whatsapp') || /\+27\s*\d{2}/.test(text)) {
    return 'whatsapp'
  }
  return 'unknown'
}

/**
 * Extract amounts - ONLY if clearly present with currency
 * NEVER invent or calculate rates
 */
function extractAmounts(text: string): { 
  depositAmount?: number
  totalAmount?: number
  quoteAmount?: number
  currency?: string
} {
  const result: { 
    depositAmount?: number
    totalAmount?: number
    quoteAmount?: number
    currency?: string
  } = {}
  
  // Detect currency
  if (/(?:R|ZAR|rand)/i.test(text)) {
    result.currency = 'ZAR'
  } else if (/\$|USD|dollar/i.test(text)) {
    result.currency = 'USD'
  }
  
  // Deposit patterns
  const depositPatterns = [
    /deposit:?\s*(?:R|ZAR|\$)?\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/i,
  ]
  
  // Total patterns
  const totalPatterns = [
    /total:?\s*(?:R|ZAR|\$)?\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/i,
  ]
  
  // Quote patterns
  const quotePatterns = [
    /quote:?\s*(?:R|ZAR|\$)?\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/i,
    /price:?\s*(?:R|ZAR|\$)?\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/i,
    /per\s+night:?\s*(?:R|ZAR|\$)?\s*(\d+(?:[,\s]\d{3})*(?:\.\d{2})?)/i,
  ]
  
  // Extract deposit
  for (const pattern of depositPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.depositAmount = parseFloat(match[1].replace(/[,\s]/g, ''))
      break
    }
  }
  
  // Extract total
  for (const pattern of totalPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.totalAmount = parseFloat(match[1].replace(/[,\s]/g, ''))
      break
    }
  }
  
  // Extract quote amount
  for (const pattern of quotePatterns) {
    const match = text.match(pattern)
    if (match) {
      result.quoteAmount = parseFloat(match[1].replace(/[,\s]/g, ''))
      break
    }
  }
  
  return result
}

/**
 * Main extraction function - mirrors tools/browns-inquiry-intake heuristics
 */
export function extractInquiry(text: string): InquiryExtraction {
  const guestName = extractGuestName(text)
  const email = extractEmail(text)
  const phone = extractPhone(text)
  const dates = extractDates(text)
  const suiteOrUnit = extractSuiteOrUnit(text)
  const adults = extractAdults(text)
  const children = extractChildren(text)
  const lateCheckIn = extractLateCheckIn(text)
  const specialRequests = extractSpecialRequests(text)
  const channel = extractChannel(text)
  const amounts = extractAmounts(text)
  
  const extraction: InquiryExtraction = {
    guestName,
    email,
    phone,
    checkInDate: dates.checkIn,
    checkOutDate: dates.checkOut,
    suiteOrUnit,
    adults,
    children,
    lateCheckIn,
    specialRequests: specialRequests.length > 0 ? specialRequests : undefined,
    channel,
    notes: text,
  }
  
  // Only add amounts if they were explicitly found
  if (amounts.depositAmount !== undefined) {
    extraction.depositAmount = amounts.depositAmount
  }
  if (amounts.totalAmount !== undefined) {
    extraction.totalAmount = amounts.totalAmount
  }
  if (amounts.quoteAmount !== undefined) {
    extraction.quoteAmount = amounts.quoteAmount
  }
  if (amounts.currency) {
    extraction.currency = amounts.currency
  }
  
  // Track missing fields
  const missingFields: string[] = []
  if (!guestName) missingFields.push('guestName')
  if (!email && !phone) missingFields.push('contact (email or phone)')
  if (!dates.checkIn) missingFields.push('checkInDate')
  if (!dates.checkOut) missingFields.push('checkOutDate')
  if (!adults) missingFields.push('adults')
  
  extraction.missingFields = missingFields
  
  return extraction
}

/**
 * Generate draft reply stub with placeholders
 */
export function generateDraftReply(extraction: InquiryExtraction, propertyName: string): string {
  const greeting = extraction.guestName ? `Dear ${extraction.guestName},` : 'Dear Guest,'
  
  const checkInText = extraction.checkInDate || '[CHECK-IN DATE]'
  const checkOutText = extraction.checkOutDate || '[CHECK-OUT DATE]'
  const adultsText = extraction.adults !== undefined ? `${extraction.adults} adult(s)` : '[NUMBER] adult(s)'
  const childrenText = extraction.children !== undefined ? ` and ${extraction.children} child(ren)` : ''
  
  const rateText = extraction.quoteAmount !== undefined
    ? `R${extraction.quoteAmount.toFixed(2)} per night`
    : '[RATE CARD REQUIRED]'
  
  const depositText = extraction.depositAmount !== undefined
    ? `R${extraction.depositAmount.toFixed(2)}`
    : '[DEPOSIT AMOUNT]'
  
  const suiteText = extraction.suiteOrUnit || '[SUITE/UNIT]'
  
  let reply = `${greeting}

Thank you for your inquiry regarding a stay at ${propertyName}.

We have noted your booking request for:
- Check-in: ${checkInText}
- Check-out: ${checkOutText}
- Guests: ${adultsText}${childrenText}
- Accommodation: ${suiteText}

Rate: ${rateText}
Deposit required: ${depositText}
`
  
  if (extraction.lateCheckIn) {
    reply += `\nWe have noted your late check-in request. Please confirm your expected arrival time.`
  }
  
  if (extraction.specialRequests && extraction.specialRequests.length > 0) {
    reply += `\nSpecial requests noted: ${extraction.specialRequests.join(', ')}`
  }
  
  if (extraction.missingFields && extraction.missingFields.length > 0) {
    reply += `\n\nTo proceed with your booking, please provide:\n`
    extraction.missingFields.forEach(field => {
      reply += `- ${field}\n`
    })
  }
  
  reply += `\nPlease confirm if you would like to proceed with this booking.

Best regards,
${propertyName} Team

[DRAFT - REQUIRES H1/H2 APPROVAL BEFORE SEND]`
  
  return reply
}
