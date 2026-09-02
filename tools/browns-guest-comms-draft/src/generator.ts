import type { BookingData, BrandFacts, SeedSamples, DraftOutputs } from './types.js';
import { analyzeTone } from './seed-loader.js';

/**
 * Format phone number for wa.me link (strip spaces, +, and other non-digits except leading +)
 */
function formatWaLink(phone: string): string {
  // Remove spaces and keep only digits and leading +
  const cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  // Remove + from the path (wa.me expects just digits)
  return `https://wa.me/${cleaned.replace(/^\+/, '')}`;
}

/**
 * Generates all draft communications from booking data
 */
export function generateDrafts(
  booking: BookingData,
  facts: BrandFacts,
  seeds: SeedSamples
): DraftOutputs {
  const tone = analyzeTone(seeds);

  return {
    welcomeWhatsApp: generateWelcomeWhatsApp(booking, facts, tone),
    welcomeEmail: generateWelcomeEmail(booking, facts, tone),
    lateCheckIn: generateLateCheckInDraft(booking, facts, tone),
    teamCheckIn: generateTeamCheckIn(booking, facts),
    approval: generateApprovalNotice(booking),
    manifest: {
      booking,
      generatedAt: new Date().toISOString(),
      outputFiles: [
        'draft-welcome-whatsapp.txt',
        'draft-welcome-email.txt',
        'draft-late-checkin.txt',
        'draft-team-checkin.txt',
        'APPROVAL.md',
        'manifest.json'
      ]
    }
  };
}

function generateWelcomeWhatsApp(
  booking: BookingData,
  facts: BrandFacts,
  tone: ReturnType<typeof analyzeTone>
): string {
  return `Good morning ${booking.guestName},

Thank you for your booking at The Browns Luxury Guest Suites Dullstroom.

Your reservation is confirmed:

Dates: ${booking.checkInDate} to ${booking.checkOutDate}
Suite: ${booking.suiteOrUnit}
Guests: ${booking.adults} adult(s)${booking.children ? ` + ${booking.children} child(ren)` : ''}
${booking.lateCheckIn ? '\nLate check-in: Noted - we\'ll coordinate timing with you' : ''}
${booking.notes ? `\nNote: ${booking.notes}` : ''}

Check-in details and WiFi info will be sent closer to your arrival. Team will confirm timing.

Looking forward to hosting you${tone.includesEmoji ? ' :)' : '!'}

Kind regards,
Grant Brown`;
}

function generateWelcomeEmail(
  booking: BookingData,
  facts: BrandFacts,
  tone: ReturnType<typeof analyzeTone>
): { subject: string; body: string } {
  const subject = `The Browns Dullstroom - Booking Confirmed`;

  const body = `Good ${getTimeOfDay()} ${booking.guestName},

Thank you for your booking at The Browns Luxury Guest Suites Dullstroom.

Your reservation is confirmed for ${booking.checkInDate} to ${booking.checkOutDate}.

Suite: ${booking.suiteOrUnit}
Guests: ${booking.adults} adult(s)${booking.children ? ` and ${booking.children} child(ren)` : ''}
${booking.lateCheckIn ? '\nLate check-in: Noted - we\'ll coordinate timing with you\n' : ''}
${booking.notes ? `Note: ${booking.notes}\n` : ''}
We'll send full check-in details closer to your arrival date.

Property address: ${facts.address}
Contact: ${facts.contactEmail} | ${facts.contactWhatsApp}

Looking forward to hosting you${tone.includesEmoji ? ' :)' : '!'}

Kindest regards,
Grant Brown
The Browns Luxury Guest Suites
Dullstroom

---
DRAFT - Do not send without Grant's approval.`;

  return { subject, body };
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function generateLateCheckInDraft(
  booking: BookingData,
  facts: BrandFacts,
  tone: ReturnType<typeof analyzeTone>
): string {
  if (!booking.lateCheckIn) {
    return `N/A - This booking does not require late check-in coordination.

If guest later requests late arrival, use this template:

Hi ${booking.guestName},

Thank you for letting me know about your late arrival.

We'll arrange secure key access and send full entry instructions.

Please confirm your estimated arrival time when you're closer.

Kind regards,
Grant`;
  }

  return `Hi ${booking.guestName},

I've noted your late arrival on ${booking.checkInDate}.

We'll arrange everything for a smooth after-hours check-in.

Please WhatsApp me your estimated arrival time when you're on the way.

Full entry instructions will be sent closer to your date.

Kind regards,
Grant Brown
${facts.contactWhatsApp}

---
DRAFT ONLY - Do not send without Grant's approval.`;
}

function generateTeamCheckIn(booking: BookingData, facts: BrandFacts): string {
  const dateStr = new Date(booking.checkInDate).toLocaleDateString('en-ZA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const phoneSection = booking.guestPhone 
    ? `Guest phone: ${booking.guestPhone}\nWhatsApp link: ${formatWaLink(booking.guestPhone)}\n`
    : '';

  return `Team Check-In - ${dateStr}

ARRIVAL:
Guest: ${booking.guestName}
Suite: ${booking.suiteOrUnit}
Guests: ${booking.adults} adult(s)${booking.children ? ` + ${booking.children} child(ren)` : ''}
${phoneSection}${booking.lateCheckIn ? 'Late check-in: YES - coordinate timing\n' : ''}${booking.notes ? `Notes: ${booking.notes}\n` : ''}
PREP:
☐ Suite ready and inspected
☐ Amenities in place
☐ Access/keys ready
${booking.lateCheckIn ? '☐ After-hours instructions prepared\n' : ''}
---
DRAFT - Internal use only.`;
}

function generateApprovalNotice(booking: BookingData): string {
  const phoneSection = booking.guestPhone
    ? `\n## Guest Contact\n\nGuest phone: ${booking.guestPhone}\nWhatsApp link: ${formatWaLink(booking.guestPhone)}\n`
    : '';

  return `# APPROVAL REQUIRED

**CRITICAL:** These are DRAFT communications only.
${phoneSection}
## Grant Must Approve Before ANY Send

All guest-facing communications require explicit approval from Grant before sending.

**NO AUTO-SEND.** Human approval required for every message.

## Actions Required

1. ✅ Review all draft content for accuracy
2. ✅ Verify booking details against NightsBridge/calendar
3. ✅ Validate special requests and notes
4. ✅ Get Grant's approval before sending (H1/H2 gate)

## What This Tool Does NOT Do

❌ Send WhatsApp messages
❌ Send emails  
❌ Make payment requests (use [PAYMENT_LINK] placeholder only)
❌ Invent rates, deposits, or amounts
❌ Invent check-in/check-out times
❌ Access live booking systems

## Tone Rules Applied

✅ Short warm sentences from real stay@ tone seeds
✅ Sign-off: "Kind regards," / "Kindest regards," + Grant Brown or Grant
✅ Smileys sparingly
✅ Never invents rates/amounts
✅ Property: The Browns Luxury Guest Suites Dullstroom only
✅ Directions/WiFi/times: "Team will confirm" (never invented)

## Approval Gates

- Guest communications: \`H1\` (APPROVE SEND) or \`H2\` (APPROVE SEQUENCE)
- See: \`docs/automation/approval-gates.md\`

## Next Steps

1. Review drafts in this folder
2. Edit if needed
3. Get Grant's approval
4. Send manually or via approved automation

---

**Remember:** DRAFT ONLY. Grant must approve before ANY send. No auto-send.
`;
}
