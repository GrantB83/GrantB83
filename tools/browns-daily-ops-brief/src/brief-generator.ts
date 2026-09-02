import { BookingRecord, BriefSections } from './types.js';

export function groupByStatus(bookings: BookingRecord[]): BriefSections {
  return {
    arrivals: bookings.filter(b => b.status === 'arriving'),
    inhouse: bookings.filter(b => b.status === 'inhouse'),
    departures: bookings.filter(b => b.status === 'departing'),
  };
}

export function generateTeamBrief(
  day: string,
  sections: BriefSections,
  facts?: Record<string, string>
): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push(`THE BROWNS DAILY OPS BRIEF`);
  lines.push(`${formatDate(day)}`);
  lines.push('='.repeat(60));
  lines.push('');
  
  if (facts) {
    const factKeys = Object.keys(facts);
    if (factKeys.length > 0) {
      lines.push('📋 TODAY\'S FACTS:');
      factKeys.forEach(key => {
        lines.push(`  • ${key}: ${facts[key]}`);
      });
      lines.push('');
    }
  }
  
  lines.push('─'.repeat(60));
  lines.push('🛬 ARRIVALS');
  lines.push('─'.repeat(60));
  if (sections.arrivals.length === 0) {
    lines.push('  No arrivals today');
  } else {
    sections.arrivals.forEach(booking => {
      lines.push('');
      lines.push(`  Guest: ${booking.guestName}`);
      lines.push(`  Suite: ${booking.suiteOrUnit}`);
      if (booking.checkInDate) {
        lines.push(`  Check-in: ${booking.checkInDate}`);
      }
      if (booking.lateCheckIn) {
        lines.push(`  ⚠️  LATE CHECK-IN - Coordinate timing`);
      }
      if (booking.adults || booking.children) {
        const adultsStr = booking.adults ? `${booking.adults} adult${booking.adults > 1 ? 's' : ''}` : '';
        const childrenStr = booking.children ? `${booking.children} child${booking.children > 1 ? 'ren' : ''}` : '';
        const guestCount = [adultsStr, childrenStr].filter(Boolean).join(', ');
        lines.push(`  Guests: ${guestCount}`);
      }
      if (booking.notes) {
        lines.push(`  Notes: ${booking.notes}`);
      }
    });
  }
  lines.push('');
  
  lines.push('─'.repeat(60));
  lines.push('🏠 IN-HOUSE');
  lines.push('─'.repeat(60));
  if (sections.inhouse.length === 0) {
    lines.push('  No guests in-house');
  } else {
    sections.inhouse.forEach(booking => {
      lines.push('');
      lines.push(`  Guest: ${booking.guestName}`);
      lines.push(`  Suite: ${booking.suiteOrUnit}`);
      if (booking.checkInDate && booking.checkOutDate) {
        lines.push(`  Stay: ${booking.checkInDate} → ${booking.checkOutDate}`);
      }
      if (booking.notes) {
        lines.push(`  Notes: ${booking.notes}`);
      }
    });
  }
  lines.push('');
  
  lines.push('─'.repeat(60));
  lines.push('🛫 DEPARTURES');
  lines.push('─'.repeat(60));
  if (sections.departures.length === 0) {
    lines.push('  No departures today');
  } else {
    sections.departures.forEach(booking => {
      lines.push('');
      lines.push(`  Guest: ${booking.guestName}`);
      lines.push(`  Suite: ${booking.suiteOrUnit}`);
      if (booking.checkOutDate) {
        lines.push(`  Check-out: ${booking.checkOutDate}`);
      }
      if (booking.notes) {
        lines.push(`  Notes: ${booking.notes}`);
      }
    });
  }
  lines.push('');
  
  lines.push('='.repeat(60));
  lines.push('DRAFT ONLY - DO NOT SEND WITHOUT APPROVAL');
  lines.push('Generated for Dullstroom The Browns Luxury Guest Suites');
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}

export function generateGuestWelcomeStub(booking: BookingRecord): string {
  const lines: string[] = [];
  
  lines.push(`Welcome stub for: ${booking.guestName}`);
  lines.push(`Suite: ${booking.suiteOrUnit}`);
  lines.push('');
  lines.push('This is a STUB ONLY.');
  lines.push('');
  lines.push('For a full draft welcome message, use:');
  lines.push('  browns-guest-comms-draft');
  lines.push('');
  lines.push('Do NOT send welcome messages without approval.');
  
  return lines.join('\n');
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-ZA', options);
  } catch {
    return isoDate;
  }
}
