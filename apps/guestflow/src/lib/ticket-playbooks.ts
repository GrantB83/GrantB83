/**
 * Ticket Playbooks for Outlier/Exception Guest Messages
 * 
 * Templates for each outlier category with:
 * - Guest reply (approve-gated, never auto-sent)
 * - Staff brief (for Admin/staff channel, may be ready-to-post)
 * - Known Browns facts (no invention)
 * - Escalation contacts
 */

import type { OutlierCategory } from './inbound-classifier'

export interface TicketPlaybook {
  category: OutlierCategory
  guestReplyTemplate: string
  staffBriefTemplate: string
  escalationContact?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  knownFacts: string[]
  askStaffFlags: string[]
}

/**
 * The Browns Luxury Guest Suites — Known Facts
 * DO NOT INVENT. Use these exact details or flag [ASK STAFF].
 */
const BROWNS_KNOWN_FACTS = {
  property: 'The Browns Luxury Guest Suites',
  location: 'Dullstroom, Mpumalanga, South Africa',
  checkInTime: '14:00',
  checkOutTime: '10:00',
  emergencyContact: '[STAFF CONTACT - ASK GRANT]',
  maintenanceContact: '[MAINTENANCE CONTACT - ASK GRANT]',
  gateCode: '[GATE CODE - ASK STAFF]',
  wifiPassword: '[WIFI PASSWORD - ASK STAFF]',
  nearbyRestaurants: [
    '[RESTAURANT 1 - ASK STAFF]',
    '[RESTAURANT 2 - ASK STAFF]',
    '[RESTAURANT 3 - ASK STAFF]'
  ],
  spareKeyLocation: '[SPARE KEY LOCATION - ASK STAFF]',
  refrigeratorPolicy: '[FRIDGE POLICY - ASK STAFF]'
}

/**
 * Playbooks for each outlier category
 */
export const TICKET_PLAYBOOKS: Record<OutlierCategory, TicketPlaybook> = {
  lost_key: {
    category: 'lost_key',
    priority: 'high',
    knownFacts: [
      'Spare key location available',
      'Staff can bring replacement',
      'Emergency locksmith if after hours'
    ],
    askStaffFlags: ['spare_key_location', 'staff_availability', 'locksmith_contact'],
    guestReplyTemplate: `Hi {{guestName}},

So sorry to hear about the key issue!

{{spareKeyInstructions}}

If you need immediate assistance, please call: {{emergencyContact}}

We'll make sure this is resolved quickly.

Warm regards,
The Browns Team`,
    staffBriefTemplate: `🔑 LOST KEY — {{guestName}} ({{property}})

**Issue:** Guest cannot access room
**Status:** {{status}}
**Priority:** HIGH

**Action Required:**
- [ ] Check spare key availability: {{spareKeyLocation}}
- [ ] Contact guest to confirm location
- [ ] Arrange key delivery or replacement
- [ ] If after-hours: {{maintenanceContact}}

**Guest Contact:** {{guestPhone}}
**Booking:** {{bookingRef}}
**Time:** {{timestamp}}`,
    escalationContact: 'maintenance'
  },

  gate_access: {
    category: 'gate_access',
    priority: 'high',
    knownFacts: [
      'Gate code changes seasonally',
      'Backup entry instructions available'
    ],
    askStaffFlags: ['current_gate_code', 'backup_entry_method'],
    guestReplyTemplate: `Hi {{guestName}},

Let me help you with gate access!

{{gateInstructions}}

If the code isn't working, please try: {{backupInstructions}}

Still having trouble? Call us: {{emergencyContact}}

Best regards,
The Browns Team`,
    staffBriefTemplate: `🚪 GATE ACCESS — {{guestName}} ({{property}})

**Issue:** Guest cannot access gate
**Status:** {{status}}
**Priority:** HIGH

**Action Required:**
- [ ] Verify current gate code: {{gateCode}}
- [ ] Confirm guest is at correct entrance
- [ ] Check if gate mechanism working
- [ ] Provide backup entry instructions

**Guest Contact:** {{guestPhone}}
**Time:** {{timestamp}}`,
    escalationContact: 'property_manager'
  },

  cant_find_entrance: {
    category: 'cant_find_entrance',
    priority: 'medium',
    knownFacts: [
      'Property has clear signage',
      'GPS coordinates available',
      'What3Words location available'
    ],
    askStaffFlags: ['gps_coordinates', 'what3words', 'landmark_directions'],
    guestReplyTemplate: `Hi {{guestName}},

Let me guide you to The Browns!

{{directionInstructions}}

Look for: {{landmarks}}

If you're still having trouble finding us, please call: {{emergencyContact}}

We're looking forward to welcoming you!

The Browns Team`,
    staffBriefTemplate: `📍 CAN'T FIND ENTRANCE — {{guestName}} ({{property}})

**Issue:** Guest lost/confused about location
**Status:** {{status}}
**Priority:** MEDIUM

**Action Required:**
- [ ] Call guest immediately: {{guestPhone}}
- [ ] Provide clear landmark-based directions
- [ ] Share GPS/What3Words if needed
- [ ] Consider meeting guest at entrance

**Estimated Arrival:** {{estimatedArrival}}
**Time:** {{timestamp}}`,
    escalationContact: 'front_desk'
  },

  refrigerator_space: {
    category: 'refrigerator_space',
    priority: 'low',
    knownFacts: [
      'Each suite has private fridge',
      'Additional cooler available on request'
    ],
    askStaffFlags: ['fridge_capacity', 'cooler_availability'],
    guestReplyTemplate: `Hi {{guestName}},

Happy to help with refrigerator space!

{{fridgePolicy}}

If you need additional cold storage, we can provide: {{additionalOptions}}

Just let us know!

Best regards,
The Browns Team`,
    staffBriefTemplate: `❄️ REFRIGERATOR SPACE — {{guestName}} ({{property}})

**Issue:** Guest needs extra cold storage
**Status:** {{status}}
**Priority:** LOW

**Action Required:**
- [ ] Check cooler availability
- [ ] Confirm fridge capacity in {{suiteNumber}}
- [ ] Arrange delivery if approved

**Guest Contact:** {{guestPhone}}
**Time:** {{timestamp}}`,
    escalationContact: 'housekeeping'
  },

  restaurant_recs: {
    category: 'restaurant_recs',
    priority: 'low',
    knownFacts: [
      'Dullstroom has several dining options',
      'Recommendations vary by cuisine preference'
    ],
    askStaffFlags: ['restaurant_list', 'booking_assistance'],
    guestReplyTemplate: `Hi {{guestName}},

Great question! Here are some excellent dining options near The Browns:

{{restaurantList}}

Would you like us to make a reservation for you?

Enjoy your meal!

The Browns Team`,
    staffBriefTemplate: `🍽️ RESTAURANT RECS — {{guestName}} ({{property}})

**Issue:** Guest requesting dining recommendations
**Status:** {{status}}
**Priority:** LOW

**Action Required:**
- [ ] Provide curated restaurant list
- [ ] Offer to make reservations
- [ ] Share special dietary options if applicable

**Guest Contact:** {{guestPhone}}
**Time:** {{timestamp}}`,
    escalationContact: 'concierge'
  },

  special_event: {
    category: 'special_event',
    priority: 'medium',
    knownFacts: [
      'Special occasions can be accommodated',
      'Advance notice required for arrangements'
    ],
    askStaffFlags: ['event_type', 'available_services', 'pricing'],
    guestReplyTemplate: `Hi {{guestName}},

How wonderful! We'd love to help make {{occasionType}} special.

We can arrange:
{{availableServices}}

[RATE CARD REQUIRED - Do not quote prices without approval]

Let us know what you have in mind, and we'll create something memorable!

The Browns Team`,
    staffBriefTemplate: `🎉 SPECIAL EVENT — {{guestName}} ({{property}})

**Issue:** Guest requesting special occasion arrangements
**Occasion:** {{occasionType}}
**Status:** {{status}}
**Priority:** MEDIUM

**Action Required:**
- [ ] Confirm guest preferences (flowers, cake, etc.)
- [ ] Check availability of special services
- [ ] Prepare rate card for add-ons
- [ ] Coordinate with housekeeping/kitchen

**Guest Contact:** {{guestPhone}}
**Booking:** {{bookingRef}}
**Time:** {{timestamp}}`,
    escalationContact: 'property_manager'
  },

  maintenance_other: {
    category: 'maintenance_other',
    priority: 'high',
    knownFacts: [
      'Maintenance issues addressed promptly',
      'Emergency repairs available 24/7'
    ],
    askStaffFlags: ['issue_details', 'technician_availability'],
    guestReplyTemplate: `Hi {{guestName}},

Thank you for letting us know about this issue.

We're on it! {{maintenanceAction}}

Expected resolution: {{estimatedTime}}

If this is urgent, please call: {{emergencyContact}}

Apologies for the inconvenience!

The Browns Team`,
    staffBriefTemplate: `🔧 MAINTENANCE — {{guestName}} ({{property}})

**Issue:** {{issueDescription}}
**Status:** {{status}}
**Priority:** HIGH

**Action Required:**
- [ ] Assess issue severity
- [ ] Contact maintenance: {{maintenanceContact}}
- [ ] Provide ETA to guest
- [ ] Follow up after resolution

**Guest Contact:** {{guestPhone}}
**Suite:** {{suiteNumber}}
**Time:** {{timestamp}}`,
    escalationContact: 'maintenance'
  },

  general_problem: {
    category: 'general_problem',
    priority: 'medium',
    knownFacts: [],
    askStaffFlags: ['problem_details', 'appropriate_contact'],
    guestReplyTemplate: `Hi {{guestName}},

Thank you for reaching out.

{{acknowledgement}}

We're looking into this and will get back to you shortly.

If this is urgent, please call: {{emergencyContact}}

Best regards,
The Browns Team`,
    staffBriefTemplate: `❓ GENERAL PROBLEM — {{guestName}} ({{property}})

**Issue:** {{issueDescription}}
**Status:** {{status}}
**Priority:** MEDIUM

**Action Required:**
- [ ] Review guest message for details
- [ ] Determine appropriate response
- [ ] Route to correct department if needed
- [ ] Respond within 30 minutes

**Guest Contact:** {{guestPhone}}
**Time:** {{timestamp}}`,
    escalationContact: 'property_manager'
  }
}

/**
 * Generate ticket drafts from playbook
 */
export function generateTicketDrafts(
  category: OutlierCategory,
  context: {
    guestName?: string
    guestPhone?: string
    property?: string
    suiteNumber?: string
    bookingRef?: string
    issueDescription?: string
    occasionType?: string
  }
): {
  guestReply: string
  staffBrief: string
  staffBriefReady: boolean
  priority: string
  askStaffFlags: string[]
} {
  const playbook = TICKET_PLAYBOOKS[category]
  
  // Replace template variables
  let guestReply = playbook.guestReplyTemplate
  let staffBrief = playbook.staffBriefTemplate

  const replacements: Record<string, string> = {
    guestName: context.guestName || '[GUEST NAME]',
    guestPhone: context.guestPhone || '[PHONE]',
    property: context.property || BROWNS_KNOWN_FACTS.property,
    suiteNumber: context.suiteNumber || '[SUITE]',
    bookingRef: context.bookingRef || '[BOOKING REF]',
    issueDescription: context.issueDescription || '[DETAILS NEEDED]',
    occasionType: context.occasionType || 'your special occasion',
    emergencyContact: BROWNS_KNOWN_FACTS.emergencyContact,
    maintenanceContact: BROWNS_KNOWN_FACTS.maintenanceContact,
    gateCode: BROWNS_KNOWN_FACTS.gateCode,
    spareKeyLocation: BROWNS_KNOWN_FACTS.spareKeyLocation,
    timestamp: new Date().toISOString(),
    status: 'new'
  }

  for (const [key, value] of Object.entries(replacements)) {
    guestReply = guestReply.replace(new RegExp(`{{${key}}}`, 'g'), value)
    staffBrief = staffBrief.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }

  // Staff brief is ready to post if no [ASK STAFF] flags
  const hasAskStaffFlags = playbook.askStaffFlags.length > 0 || 
                           guestReply.includes('[ASK STAFF]') ||
                           staffBrief.includes('[ASK STAFF]')

  return {
    guestReply,
    staffBrief,
    staffBriefReady: !hasAskStaffFlags,
    priority: playbook.priority,
    askStaffFlags: playbook.askStaffFlags
  }
}
