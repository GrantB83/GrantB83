/**
 * Inbound Message Classifier Tests
 * 
 * Tests heuristic classification rules for WhatsApp/SMS messages
 */

import { describe, it, expect } from 'vitest'
import { classifyMessage, generateDraftReply } from '@/lib/inbound-classifier'

describe('Message Classification', () => {
  describe('Booking Inquiry Detection', () => {
    it('should detect booking inquiry with dates', () => {
      const result = classifyMessage({
        messageText: 'Hi, I would like to book The Browns for 15-17 December for 2 adults',
        fromNumber: '+27821234567'
      })

      expect(result.intent).toBe('booking_inquiry')
      expect(result.confidence).toBeGreaterThan(0.6)
      expect(result.extractedData.checkIn).toBeDefined()
      expect(result.extractedData.adults).toBe(2)
    })

    it('should extract ISO date format', () => {
      const result = classifyMessage({
        messageText: 'Can I reserve from 2026-12-20 to 2026-12-22?',
        fromNumber: '+27821234567'
      })

      expect(result.intent).toBe('booking_inquiry')
      expect(result.extractedData.checkIn).toBe('2026-12-20')
      expect(result.extractedData.checkOut).toBe('2026-12-22')
    })

    it('should extract DD/MM/YYYY format', () => {
      const result = classifyMessage({
        messageText: 'I want to book for 20/12/2026 to 22/12/2026',
        fromNumber: '+27821234567'
      })

      expect(result.intent).toBe('booking_inquiry')
      expect(result.signals).toContain('dates_found')
    })

    it('should detect guest name introduction', () => {
      const result = classifyMessage({
        messageText: 'My name is John Smith and I want to book for next weekend',
        fromNumber: '+27821234567'
      })

      expect(result.extractedData.guestName).toBe('John Smith')
      expect(result.signals).toContain('name_introduced')
    })

    it('should flag missing fields', () => {
      const result = classifyMessage({
        messageText: 'Do you have availability for booking?',
        fromNumber: '+27821234567'
      })

      expect(result.intent).toBe('booking_inquiry')
      expect(result.missingFields).toContain('check_in')
      expect(result.missingFields).toContain('check_out')
      expect(result.missingFields).toContain('guest_count')
    })
  })

  describe('Date Query Detection', () => {
    it('should detect date query without booking keywords', () => {
      const result = classifyMessage({
        messageText: 'Are you available from 25 Jan to 28 Jan?',
        fromNumber: '+27821234567'
      })

      expect(result.intent).toBe('date_query')
      expect(result.extractedData.checkIn).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0.5)
    })
  })

  describe('Suite Preference Detection', () => {
    it('should detect property mentions', () => {
      const result = classifyMessage({
        messageText: 'Tell me about the Browns suites',
        fromNumber: '+27821234567'
      })

      expect(result.intent).toBe('suite_preference')
      expect(result.extractedData.property).toBeDefined()
      expect(result.signals).toContain('property:browns')
    })

    it('should detect Rivendell property', () => {
      const result = classifyMessage({
        messageText: 'What rooms do you have at Rivendell?',
        fromNumber: '+27821234567'
      })

      expect(result.extractedData.property).toBe('rivendell')
    })
  })

  describe('Existing Guest Detection', () => {
    it('should detect returning guest signals', () => {
      const result = classifyMessage({
        messageText: 'Hi, I stayed with you last year. Can I book again?',
        fromNumber: '+27821234567'
      })

      expect(result.intent).toBe('existing_guest')
      expect(result.signals).toContain('returning_guest_signal')
    })
  })

  describe('Spam Detection', () => {
    it('should detect spam messages', () => {
      const result = classifyMessage({
        messageText: 'Congratulations! You have won a prize. Click here to claim your lottery winnings!',
        fromNumber: '+27821234567'
      })

      expect(result.intent).toBe('spam')
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should detect investment scams', () => {
      const result = classifyMessage({
        messageText: 'Make money fast! Bitcoin investment opportunity. Work from home.',
        fromNumber: '+27821234567'
      })

      expect(result.intent).toBe('spam')
    })
  })

  describe('Guest Count Extraction', () => {
    it('should extract adults count', () => {
      const result = classifyMessage({
        messageText: 'Booking for 4 adults next weekend',
        fromNumber: '+27821234567'
      })

      expect(result.extractedData.adults).toBe(4)
    })

    it('should extract children count', () => {
      const result = classifyMessage({
        messageText: 'We have 2 adults and 3 children',
        fromNumber: '+27821234567'
      })

      expect(result.extractedData.adults).toBe(2)
      expect(result.extractedData.children).toBe(3)
    })
  })

  describe('Unknown Intent', () => {
    it('should classify unclear messages as unknown', () => {
      const result = classifyMessage({
        messageText: 'Hello',
        fromNumber: '+27821234567'
      })

      expect(result.intent).toBe('general_question')
      expect(result.confidence).toBeLessThan(0.6)
    })
  })
})

describe('Draft Reply Generation', () => {
  describe('Booking Inquiry Drafts', () => {
    it('should generate draft with extracted data', () => {
      const classification = classifyMessage({
        messageText: 'Hi, my name is Alice. I want to book for 15-17 Dec, 2 adults',
        fromNumber: '+27821234567'
      })

      const { draft, requiresApproval, missingInfo } = generateDraftReply(classification)

      expect(draft).toContain('Alice')
      expect(draft).toContain('15')
      expect(draft).toContain('2 guest')
      expect(requiresApproval).toBe(true)
      expect(missingInfo).toContain('rate_card_lookup')
    })

    it('should ask for missing fields', () => {
      const classification = classifyMessage({
        messageText: 'Can I book?',
        fromNumber: '+27821234567'
      })

      const { draft, missingInfo } = generateDraftReply(classification)

      expect(draft).toContain('check-in date')
      expect(draft).toContain('check-out date')
      expect(draft).toContain('Number of guests')
      expect(missingInfo).toContain('check_in_date')
      expect(missingInfo).toContain('check_out_date')
      expect(missingInfo).toContain('guest_count')
    })

    it('should never invent rates', () => {
      const classification = classifyMessage({
        messageText: 'I want to book for 15-17 Dec, 2 adults',
        fromNumber: '+27821234567'
      })

      const { draft } = generateDraftReply(classification)

      expect(draft).toContain('[RATE CARD REQUIRED')
      expect(draft).not.toMatch(/R\d+/)
      expect(draft).not.toMatch(/\$\d+/)
      expect(draft).not.toMatch(/\d+\s*(rand|ZAR|dollars?)/)
    })
  })

  describe('Date Query Drafts', () => {
    it('should generate draft for date query', () => {
      const classification = classifyMessage({
        messageText: 'Are you available 25-28 Jan?',
        fromNumber: '+27821234567'
      })

      const { draft, missingInfo } = generateDraftReply(classification)

      expect(draft).toContain('25')
      expect(draft).toContain('28')
      expect(draft).toContain('[RATE CARD REQUIRED')
      expect(missingInfo).toContain('guest_count')
      expect(missingInfo).toContain('rate_card')
    })
  })

  describe('Existing Guest Drafts', () => {
    it('should generate welcoming draft for returning guests', () => {
      const classification = classifyMessage({
        messageText: 'I stayed with you last year',
        fromNumber: '+27821234567'
      })

      const { draft } = generateDraftReply(classification)

      expect(draft).toContain('Welcome back')
      expect(draft).toContain('love to host you')
    })
  })

  describe('Spam Handling', () => {
    it('should not generate draft for spam', () => {
      const classification = classifyMessage({
        messageText: 'You won a prize! Claim now!',
        fromNumber: '+27821234567'
      })

      const { draft, requiresApproval } = generateDraftReply(classification)

      expect(draft).toContain('[SPAM DETECTED')
      expect(requiresApproval).toBe(false)
    })
  })

  describe('General Question Drafts', () => {
    it('should generate helpful prompt for unclear messages', () => {
      const classification = classifyMessage({
        messageText: 'Tell me more',
        fromNumber: '+27821234567'
      })

      const { draft, missingInfo } = generateDraftReply(classification)

      expect(draft).toContain('How can we assist')
      expect(draft).toContain('preferred dates')
      expect(draft).toContain('Number of guests')
      expect(missingInfo).toContain('intent_unclear')
    })
  })
})

describe('Edge Cases', () => {
  it('should handle empty message', () => {
    const result = classifyMessage({
      messageText: '',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('general_question')
  })

  it('should handle very long message', () => {
    const longText = 'I want to book '.repeat(100)
    const result = classifyMessage({
      messageText: longText,
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('booking_inquiry')
  })

  it('should handle special characters', () => {
    const result = classifyMessage({
      messageText: 'Booking for 15/12 - 17/12 😊 2 adults 🏡',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('booking_inquiry')
    expect(result.extractedData.adults).toBe(2)
  })

  it('should handle mixed case and extra whitespace', () => {
    const result = classifyMessage({
      messageText: '  BOOK    for   2   ADULTS  ',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('booking_inquiry')
    expect(result.extractedData.adults).toBe(2)
  })
})
