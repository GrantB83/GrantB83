import type { BookingRecord, GuestFacts, WelcomeStub } from './types.js';

/**
 * Generate welcome stubs from filtered bookings
 * Never invents guest phone or rates - uses placeholders
 */
export function generateWelcomeStubs(
  bookings: BookingRecord[],
  guestFactsMap: Map<string, GuestFacts>
): WelcomeStub[] {
  return bookings.map((booking) => {
    const normalizedName = normalizeGuestName(booking.guestName);
    const facts = guestFactsMap.get(normalizedName);

    // Check for phone (only phone can block; rate is ops-only and never blocks)
    const hasPhone = !!(booking.guestPhone || facts?.phone);
    const hasRate = !!(booking.ratePerNight && booking.currency);

    // Grant Law: Only missing phone blocks CoS Admin post
    // Missing rate is ops-only tracking; never blocks, never mentioned in guest body
    const placeholders: string[] = [];
    if (!hasPhone) placeholders.push('[GUEST_PHONE]');

    // Generate safe filename
    const safeName = generateSafeName(booking.guestName, booking.checkInDate);

    // Generate warm, practical Dullstroom-toned welcome stub
    const content = generateWelcomeContent(booking, facts, hasPhone, hasRate);

    return {
      guestName: booking.guestName,
      safeName,
      checkInDate: booking.checkInDate,
      hasPhone,
      hasRate,
      placeholders,
      content,
    };
  });
}

function normalizeGuestName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function generateSafeName(guestName: string, checkInDate: string): string {
  const nameSlug = guestName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const dateSlug = checkInDate.replace(/\D/g, '');
  return `${nameSlug}-${dateSlug}`;
}

function generateWelcomeContent(
  booking: BookingRecord,
  facts: GuestFacts | undefined,
  hasPhone: boolean,
  hasRate: boolean
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Welcome Message Stub — ${booking.guestName}`);
  lines.push('');
  lines.push(`**Check-in:** ${formatDate(booking.checkInDate)}`);
  
  if (booking.checkOutDate) {
    lines.push(`**Check-out:** ${formatDate(booking.checkOutDate)}`);
  }
  
  if (booking.suiteOrUnit) {
    lines.push(`**Suite:** ${booking.suiteOrUnit}`);
  }

  const guestCount = buildGuestCount(booking.adults, booking.children);
  if (guestCount) {
    lines.push(`**Guests:** ${guestCount}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Welcome stub (warm, practical, Dullstroom tone)
  lines.push('Hi there,');
  lines.push('');
  lines.push(`Looking forward to welcoming you to The Browns in Dullstroom on ${formatDate(booking.checkInDate)}!`);
  lines.push('');

  // Add known facts if available
  if (facts?.preferences) {
    lines.push(`We've noted: ${facts.preferences}`);
    lines.push('');
  }

  if (facts?.allergies) {
    lines.push(`⚠️ Dietary: ${facts.allergies}`);
    lines.push('');
  }

  // NEVER include rate cards or guest phone in guest-facing WhatsApp draft body
  // Missing rate → ops-only tracking (missing-fields.md); never mentioned in guest message
  // Missing phone → hold/flag in queue + missing-fields.md; omit phone line from guest body OR leave draft offline

  // Booking notes
  if (booking.notes) {
    lines.push('**Notes:**');
    lines.push(booking.notes);
    lines.push('');
  }

  lines.push('Let us know if you have any questions ahead of your stay.');
  lines.push('');
  lines.push('Warm regards,');
  lines.push('The Browns Team');
  lines.push('Dullstroom');

  return lines.join('\n');
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch {
    return dateStr;
  }
}

function buildGuestCount(adults?: number, children?: number): string {
  const parts: string[] = [];
  if (adults) parts.push(`${adults} adult${adults > 1 ? 's' : ''}`);
  if (children) parts.push(`${children} child${children > 1 ? 'ren' : ''}`);
  return parts.join(', ');
}
