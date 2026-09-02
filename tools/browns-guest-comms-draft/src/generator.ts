import type { BookingData, BrandFacts, SeedSamples, DraftOutputs } from './types.js';
import { analyzeTone } from './seed-loader.js';

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
    approval: generateApprovalNotice(),
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
  const greeting = tone.warmGreeting ? 'We\'re delighted' : 'Thank you';
  const pronoun = tone.firstPersonPlural ? 'we' : 'the team';

  return `Hi ${booking.guestName},

${greeting} to confirm your reservation at ${facts.address}!

📅 Check-in: ${booking.checkInDate}
📅 Check-out: ${booking.checkOutDate}
🏠 Suite: ${booking.suiteOrUnit}
👥 Guests: ${booking.adults} adult(s)${booking.children ? ` + ${booking.children} child(ren)` : ''}

${facts.wifi ? `📶 WiFi: ${facts.wifi}\n` : ''}${facts.parking ? `🅿️ Parking: ${facts.parking}\n` : ''}
Your exact check-in time will be confirmed closer to your arrival${booking.lateCheckIn ? ' (late check-in noted)' : ''}.

${booking.notes ? `\nNote: ${booking.notes}\n` : ''}
Looking forward to hosting you!

The Browns Team
${facts.contactWhatsApp}
${facts.contactEmail}`;
}

function generateWelcomeEmail(
  booking: BookingData,
  facts: BrandFacts,
  tone: ReturnType<typeof analyzeTone>
): { subject: string; body: string } {
  const subject = `Welcome to The Browns - Reservation Confirmed (${booking.checkInDate})`;

  const greeting = tone.warmGreeting ? 'We\'re thrilled' : 'Thank you';

  const body = `Dear ${booking.guestName},

${greeting} to confirm your upcoming stay at The Browns Luxury Guest Suites in Dullstroom.

RESERVATION DETAILS

Check-in: ${booking.checkInDate}
Check-out: ${booking.checkOutDate}
Accommodation: ${booking.suiteOrUnit}
Guests: ${booking.adults} adult(s)${booking.children ? ` and ${booking.children} child(ren)` : ''}

PROPERTY INFORMATION

Address: ${facts.address}
${facts.wifi ? `WiFi: ${facts.wifi}\n` : ''}${facts.parking ? `Parking: ${facts.parking}\n` : ''}
${booking.lateCheckIn ? '\nLate Check-In: We have noted your late arrival and will coordinate timing with you closer to your stay.\n' : ''}
${booking.notes ? `\nSpecial Notes: ${booking.notes}\n` : ''}
Check-in and check-out times will be confirmed by our team as your arrival date approaches.

CONTACT

For any questions or changes to your reservation, please reach out:
Email: ${facts.contactEmail}
WhatsApp: ${facts.contactWhatsApp}

We look forward to welcoming you to Dullstroom!

Warm regards,
The Browns Team

---
This is a DRAFT communication. Do not send without approval.`;

  return { subject, body };
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

We've noted you'll be arriving after hours. To ensure a smooth check-in:

1. Please confirm your estimated arrival time
2. We'll arrange secure key access
3. Full property details will be sent 24h before arrival

Please WhatsApp us your ETA when you're on the way.

The Browns Team
${facts.contactWhatsApp}`;
  }

  return `Hi ${booking.guestName},

We understand you'll be arriving after hours for your ${booking.checkInDate} check-in.

To coordinate your late arrival:

1. Please confirm your estimated arrival time
2. We'll arrange secure key access and detailed property entry instructions
3. All access codes and directions will be sent 24 hours before your arrival

Please message us your estimated time of arrival when you're en route.

Safe travels!

The Browns Team
${facts.contactWhatsApp}
${facts.contactEmail}

---
DRAFT ONLY - Do not send without approval.`;
}

function generateTeamCheckIn(booking: BookingData, facts: BrandFacts): string {
  const dateStr = new Date(booking.checkInDate).toLocaleDateString('en-ZA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return `📋 Daily Team Check-In - ${dateStr}

ARRIVAL TODAY:
• Guest: ${booking.guestName}
• Suite: ${booking.suiteOrUnit}
• Guests: ${booking.adults} adult(s)${booking.children ? ` + ${booking.children} child(ren)` : ''}
• Late check-in: ${booking.lateCheckIn ? 'YES - coordinate timing' : 'No'}
${booking.notes ? `• Notes: ${booking.notes}` : ''}

PRE-ARRIVAL CHECKLIST:
☐ Suite prepared and inspected
☐ Welcome amenities in place
☐ WiFi tested
☐ Keys/access ready
${booking.lateCheckIn ? '☐ Late check-in instructions prepared' : ''}

Contact: ${facts.contactWhatsApp}

---
DRAFT - For internal team use only.`;
}

function generateApprovalNotice(): string {
  return `# APPROVAL REQUIRED

**CRITICAL:** These are DRAFT communications only.

## Actions Required Before Sending

1. ✅ Review all guest-facing content for accuracy
2. ✅ Verify booking details against source of truth (NightsBridge/calendar)
3. ✅ Confirm check-in/check-out times with team
4. ✅ Validate any special requests or notes
5. ✅ Get explicit approval from Grant or Liana before sending

## What This Tool Does NOT Do

❌ Send WhatsApp messages
❌ Send emails
❌ Make payment requests
❌ Invent rates, deposits, or pricing
❌ Confirm availability
❌ Access live booking systems

## Approval Gates

- Guest communications: Requires \`H1\` (APPROVE SEND) or \`H2\` (APPROVE SEQUENCE)
- See: \`docs/automation/approval-gates.md\`

## Next Steps

1. Review all draft files in this output directory
2. Make any necessary edits
3. Obtain approval using established workflow
4. Send manually or via approved automation

---

**Remember:** Draft only. No auto-send. Human approval required.
`;
}
