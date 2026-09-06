/**
 * Inbound Message Classifier
 * 
 * Heuristic rules for classifying WhatsApp/SMS/email messages
 * into booking inquiries, dates, suite preferences, existing guest, spam
 * 
 * Hard rules:
 * - Never invent facts
 * - Flag missing fields explicitly
 * - Confidence scoring for manual review
 */

export interface ClassificationResult {
  intent: 'booking_inquiry' | 'date_query' | 'suite_preference' | 'existing_guest' | 'general_question' | 'spam' | 'unknown' | 
          'checkin_event' | 'outlier_exception'
  confidence: number // 0.0 to 1.0
  extractedData: {
    guestName?: string
    checkIn?: string
    checkOut?: string
    adults?: number
    children?: number
    property?: string
    specialRequests?: string
    eventType?: 'arrived' | 'in_house' | 'checked_out' | 'late_arrival'
    outlierCategory?: OutlierCategory
  }
  missingFields: string[]
  signals: string[] // Evidence used for classification
}

export type OutlierCategory = 
  | 'lost_key'
  | 'gate_access'
  | 'cant_find_entrance'
  | 'refrigerator_space'
  | 'restaurant_recs'
  | 'special_event'
  | 'maintenance_other'
  | 'general_problem'

interface ClassifierInput {
  messageText: string
  fromNumber: string
  threadHistory?: string[] // Previous messages in thread for context
}

/**
 * Date extraction patterns
 */
const DATE_PATTERNS = [
  // ISO format
  /\b(\d{4}-\d{2}-\d{2})\b/gi,
  // DD/MM/YYYY or DD-MM-YYYY
  /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/gi,
  // Month name formats with year
  /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})\b/gi,
  // Month name formats without year (e.g., "15 December", "25 Jan")
  /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b/gi,
  // Date ranges (e.g., "15-17 December")
  /\b(\d{1,2}-\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b/gi,
  // Relative dates
  /\b(next\s+(?:week|month|weekend|friday|saturday|sunday|monday))\b/gi,
  /\b(this\s+(?:week|month|weekend|friday|saturday|sunday|monday))\b/gi,
]

/**
 * Booking inquiry signals
 */
const BOOKING_SIGNALS = [
  'book', 'booking', 'reserve', 'reservation', 'availability', 'available',
  'stay', 'visit', 'weekend', 'nights', 'check in', 'check-in', 'checkin',
  'check out', 'check-out', 'checkout', 'arrive', 'arrival', 'depart', 'departure'
]

/**
 * Property/suite signals
 */
const PROPERTY_SIGNALS = [
  'browns', 'dullstroom', 'rivendell', 'trout', 'estate',
  'suite', 'room', 'chalet', 'cottage', 'lodge'
]

/**
 * Spam signals
 */
const SPAM_SIGNALS = [
  'congratulations', 'winner', 'prize', 'claim', 'lottery',
  'urgent', 'act now', 'limited time', 'click here', 'bitcoin',
  'investment opportunity', 'make money', 'work from home'
]

/**
 * Check-in event signals
 */
const CHECKIN_SIGNALS = {
  arrived: ['arrived', 'we\'re here', 'just arrived', 'checked in', 'at the property'],
  in_house: ['in the room', 'settled in', 'everything is great', 'enjoying'],
  late_arrival: ['running late', 'delayed', 'arriving late', 'eta', 'expected arrival'],
  checked_out: ['checking out', 'checked out', 'leaving', 'departed']
}

/**
 * Outlier category signals
 */
const OUTLIER_SIGNALS: Record<OutlierCategory, string[]> = {
  lost_key: ['lost key', 'can\'t find key', 'key not working', 'locked out', 'lost the key'],
  gate_access: ['gate code', 'can\'t open gate', 'gate not working', 'entry code', 'access code'],
  cant_find_entrance: ['can\'t find', 'where is the entrance', 'how do i get in', 'lost', 'confused'],
  refrigerator_space: ['fridge', 'refrigerator', 'cooler', 'ice', 'cold storage'],
  restaurant_recs: ['restaurant', 'where to eat', 'dinner', 'breakfast', 'food recommendation'],
  special_event: ['birthday', 'anniversary', 'celebration', 'surprise', 'special occasion'],
  maintenance_other: ['broken', 'not working', 'repair', 'fix', 'maintenance', 'issue'],
  general_problem: ['problem', 'issue', 'help', 'need assistance', 'urgent']
}

/**
 * Classify an inbound message
 */
export function classifyMessage(input: ClassifierInput): ClassificationResult {
  const text = input.messageText.toLowerCase()
  const originalText = input.messageText // Keep original for name extraction
  const signals: string[] = []
  const extractedData: ClassificationResult['extractedData'] = {}
  const missingFields: string[] = []

  // Spam detection (highest priority - early exit)
  const spamScore = SPAM_SIGNALS.filter(sig => text.includes(sig)).length
  if (spamScore >= 2) {
    return {
      intent: 'spam',
      confidence: Math.min(0.9, spamScore * 0.3),
      extractedData: {},
      missingFields: [],
      signals: ['spam_keywords_detected']
    }
  }

  // Extract dates
  const dates: string[] = []
  for (const pattern of DATE_PATTERNS) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      dates.push(match[0])
    }
  }

  if (dates.length > 0) {
    signals.push('dates_found')
    extractedData.checkIn = dates[0]
    if (dates.length > 1) {
      extractedData.checkOut = dates[1]
    } else {
      missingFields.push('check_out')
    }
  }

  // Extract guest count
  const adultsMatch = text.match(/(\d+)\s*(?:adults?|people|guests?|pax)/i)
  if (adultsMatch) {
    extractedData.adults = parseInt(adultsMatch[1], 10)
    signals.push('guest_count_found')
  }

  const childrenMatch = text.match(/(\d+)\s*(?:children|kids|child)/i)
  if (childrenMatch) {
    extractedData.children = parseInt(childrenMatch[1], 10)
    signals.push('children_count_found')
  }

  // Detect property mentions
  for (const propSignal of PROPERTY_SIGNALS) {
    if (text.includes(propSignal)) {
      signals.push(`property:${propSignal}`)
      if (!extractedData.property) {
        extractedData.property = propSignal
      }
    }
  }

  // Detect booking intent
  let bookingScore = 0
  for (const bookingSignal of BOOKING_SIGNALS) {
    if (text.includes(bookingSignal)) {
      bookingScore++
      signals.push(`booking:${bookingSignal}`)
    }
  }

  // Extract name (simple heuristic: capitalized words not in common words list)
  const nameMatch = originalText.match(/(?:my name is|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (nameMatch) {
    extractedData.guestName = nameMatch[1]
    signals.push('name_introduced')
  }

  // Check for check-in events (guests group context)
  let checkinEventType: 'arrived' | 'in_house' | 'checked_out' | 'late_arrival' | undefined
  let checkinScore = 0

  for (const [eventType, keywords] of Object.entries(CHECKIN_SIGNALS)) {
    const matchCount = keywords.filter(kw => text.includes(kw)).length
    if (matchCount > 0) {
      checkinEventType = eventType as 'arrived' | 'in_house' | 'checked_out' | 'late_arrival'
      checkinScore = matchCount
      signals.push(`checkin:${eventType}`)
      break
    }
  }

  // Check for outlier categories (exceptions/problems)
  let outlierCategory: OutlierCategory | undefined
  let outlierScore = 0

  for (const [category, keywords] of Object.entries(OUTLIER_SIGNALS)) {
    // Use word boundary matching to avoid false positives (e.g., "ice" in "Alice")
    const matchCount = keywords.filter(kw => {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      return regex.test(text)
    }).length
    if (matchCount > outlierScore) {
      outlierCategory = category as OutlierCategory
      outlierScore = matchCount
    }
  }

  if (outlierScore > 0) {
    signals.push(`outlier:${outlierCategory}`)
  }

  // Classification logic
  let intent: ClassificationResult['intent'] = 'unknown'
  let confidence = 0.0

  // Check for returning guest signals first (before booking_inquiry)
  const hasReturningGuestSignal = text.includes('previous') || text.includes('stayed before') || 
                                  text.includes('returning') || text.includes('last year') || 
                                  text.includes('stayed with you')
  
  if (checkinScore >= 1) {
    // Check-in event detected (guests group)
    intent = 'checkin_event'
    confidence = Math.min(0.9, 0.6 + (checkinScore * 0.15))
    extractedData.eventType = checkinEventType
  } else if (outlierScore >= 1) {
    // Outlier/exception detected
    intent = 'outlier_exception'
    confidence = Math.min(0.9, 0.55 + (outlierScore * 0.15))
    extractedData.outlierCategory = outlierCategory
  } else if (hasReturningGuestSignal) {
    // Existing guest - prioritize this even if booking keywords present
    intent = 'existing_guest'
    confidence = 0.7
    signals.push('returning_guest_signal')
    if (!extractedData.checkIn) missingFields.push('dates')
    if (!extractedData.adults) missingFields.push('guest_count')
  } else if (bookingScore >= 2 || 
             (bookingScore >= 1 && dates.length >= 1 && !text.includes('available')) || 
             (bookingScore >= 1 && extractedData.adults) ||
             (bookingScore >= 1 && (text.includes('book') || text.includes('reserve') || text.includes('reservation')))) {
    // Booking inquiry - include strong keywords like "book", "reserve", "reservation" even without dates
    intent = 'booking_inquiry'
    confidence = Math.min(0.95, 0.5 + (bookingScore * 0.1) + (dates.length * 0.15))
    
    // Flag missing critical fields
    if (!extractedData.checkIn) missingFields.push('check_in')
    if (!extractedData.checkOut) missingFields.push('check_out')
    if (!extractedData.adults) missingFields.push('guest_count')
    if (!extractedData.guestName) missingFields.push('guest_name')
  } else if (dates.length >= 2 || (dates.length >= 1 && text.includes('available'))) {
    // Date query - includes "available" with dates
    intent = 'date_query'
    confidence = 0.7
    if (!extractedData.adults) missingFields.push('guest_count')
  } else if (extractedData.property) {
    intent = 'suite_preference'
    confidence = 0.6
    missingFields.push('dates', 'guest_count')
  } else {
    intent = 'general_question'
    confidence = 0.4
    signals.push('no_clear_intent')
  }

  return {
    intent,
    confidence,
    extractedData,
    missingFields,
    signals
  }
}

/**
 * Generate draft reply based on classification
 * 
 * Uses existing welcome-drafts patterns
 * Never invents rates or facts
 */
export function generateDraftReply(
  classification: ClassificationResult,
  propertyName: string = 'The Browns Luxury Guest Suites'
): { draft: string; requiresApproval: boolean; missingInfo: string[] } {
  
  const missingInfo: string[] = []
  let draft = ''
  let requiresApproval = true

  switch (classification.intent) {
    case 'booking_inquiry':
      draft = `Hi${classification.extractedData.guestName ? ` ${classification.extractedData.guestName}` : ' there'},

Thank you for your interest in ${propertyName}!

`
      if (classification.extractedData.checkIn && classification.extractedData.checkOut) {
        draft += `I can see you're looking at:\n📅 ${classification.extractedData.checkIn} to ${classification.extractedData.checkOut}\n`
        if (classification.extractedData.adults) {
          draft += `👥 ${classification.extractedData.adults} guest${classification.extractedData.adults > 1 ? 's' : ''}\n`
        }
        draft += '\n'
      }

      // Only show missing fields if there are booking-critical ones
      const hasBookingCriticalMissing = classification.missingFields.includes('check_in') ||
                                        classification.missingFields.includes('check_out') ||
                                        classification.missingFields.includes('guest_count')
      
      if (hasBookingCriticalMissing) {
        draft += `To provide you with accurate availability and rates, I'll need:\n`
        if (classification.missingFields.includes('check_in')) {
          draft += `• Your check-in date\n`
          missingInfo.push('check_in_date')
        }
        if (classification.missingFields.includes('check_out')) {
          draft += `• Your check-out date\n`
          missingInfo.push('check_out_date')
        }
        if (classification.missingFields.includes('guest_count')) {
          draft += `• Number of guests\n`
          missingInfo.push('guest_count')
        }
        draft += '\n'
      } else {
        draft += `[RATE CARD REQUIRED - Do not guess rates]\n\n`
        missingInfo.push('rate_card_lookup')
      }

      draft += `Looking forward to welcoming you!\n\nWarm regards,\n${propertyName} Team`
      break

    case 'date_query':
      draft = `Hi there,

Thank you for your inquiry about ${classification.extractedData.checkIn}${classification.extractedData.checkOut ? ` to ${classification.extractedData.checkOut}` : ''}.

To check availability and provide accurate pricing, please confirm:
• Number of adults${classification.extractedData.children ? '' : ' and children (if applicable)'}
${classification.extractedData.children ? `• ${classification.extractedData.children} children noted` : ''}

[RATE CARD REQUIRED - Do not quote rates without approval]

Best regards,
${propertyName} Team`
      missingInfo.push('guest_count', 'rate_card')
      break

    case 'spam':
      draft = '[SPAM DETECTED - No reply recommended]'
      requiresApproval = false
      break

    case 'existing_guest':
      draft = `Welcome back!

Thank you for reaching out again. We'd love to host you.

Could you please share your preferred dates and number of guests?

Best regards,
${propertyName} Team`
      missingInfo.push('dates', 'guest_count')
      break

    default:
      draft = `Hi there,

Thank you for contacting ${propertyName}!

How can we assist you today? If you're looking to make a booking, please share:
• Your preferred dates
• Number of guests
• Any special requests

We look forward to hearing from you!

Best regards,
${propertyName} Team`
      missingInfo.push('intent_unclear', 'dates', 'guest_count')
  }

  return { draft, requiresApproval, missingInfo }
}
