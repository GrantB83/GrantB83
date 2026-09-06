/**
 * Outlier/Exception Ticket Tests
 * 
 * Tests outlier category detection and ticket draft generation
 */

import { describe, it, expect } from 'vitest'
import { classifyMessage } from '@/lib/inbound-classifier'
import { generateTicketDrafts, TICKET_PLAYBOOKS } from '@/lib/ticket-playbooks'

describe('Outlier Category Detection', () => {
  it('should detect lost_key', () => {
    const result = classifyMessage({
      messageText: 'Help! I lost the key to my room',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('outlier_exception')
    expect(result.extractedData.outlierCategory).toBe('lost_key')
  })

  it('should detect gate_access', () => {
    const result = classifyMessage({
      messageText: 'The gate code isn\'t working, can you help?',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('outlier_exception')
    expect(result.extractedData.outlierCategory).toBe('gate_access')
  })

  it('should detect cant_find_entrance', () => {
    const result = classifyMessage({
      messageText: 'We can\'t find the entrance, we\'re lost',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('outlier_exception')
    expect(result.extractedData.outlierCategory).toBe('cant_find_entrance')
  })

  it('should detect refrigerator_space', () => {
    const result = classifyMessage({
      messageText: 'Is there extra fridge space available?',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('outlier_exception')
    expect(result.extractedData.outlierCategory).toBe('refrigerator_space')
  })

  it('should detect restaurant_recs', () => {
    const result = classifyMessage({
      messageText: 'Can you recommend a good restaurant for dinner?',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('outlier_exception')
    expect(result.extractedData.outlierCategory).toBe('restaurant_recs')
  })

  it('should detect special_event', () => {
    const result = classifyMessage({
      messageText: 'It\'s my wife\'s birthday, can you help us celebrate?',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('outlier_exception')
    expect(result.extractedData.outlierCategory).toBe('special_event')
  })

  it('should detect maintenance_other', () => {
    const result = classifyMessage({
      messageText: 'The shower is not working properly',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('outlier_exception')
    expect(result.extractedData.outlierCategory).toBe('maintenance_other')
  })

  it('should detect general_problem', () => {
    const result = classifyMessage({
      messageText: 'We have a problem and need help',
      fromNumber: '+27821234567'
    })

    expect(result.intent).toBe('outlier_exception')
    expect(result.extractedData.outlierCategory).toBe('general_problem')
  })
})

describe('Ticket Draft Generation', () => {
  it('should generate guest reply and staff brief for lost_key', () => {
    const { guestReply, staffBrief, priority, askStaffFlags } = generateTicketDrafts(
      'lost_key',
      {
        guestName: 'John Smith',
        guestPhone: '+27821234567',
        property: 'The Browns',
        suiteNumber: 'Suite 3'
      }
    )

    expect(guestReply).toContain('John Smith')
    expect(guestReply).toContain('key')
    expect(staffBrief).toContain('LOST KEY')
    expect(staffBrief).toContain('John Smith')
    expect(staffBrief).toContain('Suite 3')
    expect(priority).toBe('high')
    expect(askStaffFlags.length).toBeGreaterThan(0)
  })

  it('should never invent contact details', () => {
    const { guestReply, staffBrief } = generateTicketDrafts(
      'gate_access',
      {
        guestName: 'Jane Doe',
        guestPhone: '+27829999999'
      }
    )

    // Should contain placeholder for unknown facts
    expect(guestReply).toContain('[')
    expect(staffBrief).toContain('[')
  })

  it('should never invent rates for special events', () => {
    const { guestReply } = generateTicketDrafts(
      'special_event',
      {
        guestName: 'Bob Johnson',
        occasionType: 'Anniversary'
      }
    )

    expect(guestReply).toContain('[RATE CARD REQUIRED')
    expect(guestReply).not.toMatch(/R\d+/)
    expect(guestReply).not.toMatch(/\$\d+/)
  })

  it('should set correct priority levels', () => {
    expect(TICKET_PLAYBOOKS.lost_key.priority).toBe('high')
    expect(TICKET_PLAYBOOKS.gate_access.priority).toBe('high')
    expect(TICKET_PLAYBOOKS.maintenance_other.priority).toBe('high')
    expect(TICKET_PLAYBOOKS.refrigerator_space.priority).toBe('low')
    expect(TICKET_PLAYBOOKS.restaurant_recs.priority).toBe('low')
    expect(TICKET_PLAYBOOKS.special_event.priority).toBe('medium')
  })

  it('should include escalation contacts for urgent issues', () => {
    expect(TICKET_PLAYBOOKS.lost_key.escalationContact).toBe('maintenance')
    expect(TICKET_PLAYBOOKS.gate_access.escalationContact).toBe('property_manager')
    expect(TICKET_PLAYBOOKS.maintenance_other.escalationContact).toBe('maintenance')
  })

  it('should flag staff_brief_ready correctly', () => {
    const { staffBriefReady: readyWithAskFlags } = generateTicketDrafts(
      'lost_key',
      { guestName: 'Test' }
    )

    // Lost key has askStaffFlags, so should not be ready
    expect(readyWithAskFlags).toBe(false)
  })
})

describe('Ticket Playbook Content', () => {
  it('should have templates for all outlier categories', () => {
    const categories: Array<keyof typeof TICKET_PLAYBOOKS> = [
      'lost_key',
      'gate_access',
      'cant_find_entrance',
      'refrigerator_space',
      'restaurant_recs',
      'special_event',
      'maintenance_other',
      'general_problem'
    ]

    for (const category of categories) {
      const playbook = TICKET_PLAYBOOKS[category]
      expect(playbook).toBeDefined()
      expect(playbook.guestReplyTemplate).toBeTruthy()
      expect(playbook.staffBriefTemplate).toBeTruthy()
      expect(playbook.priority).toBeTruthy()
    }
  })

  it('should use known Browns facts in templates', () => {
    const { guestReply } = generateTicketDrafts(
      'restaurant_recs',
      { guestName: 'Test Guest' }
    )

    // Should reference Browns property
    expect(guestReply).toContain('Browns')
  })
})
