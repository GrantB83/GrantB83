import type { BrownsBooking, HMQuoteFile, ExceptionSection } from './types.js';

export function generateHospitalitySection(
  date: string,
  bookings: BrownsBooking[] | null
): ExceptionSection {
  const items: string[] = [];
  
  if (!bookings || bookings.length === 0) {
    items.push('No Browns bookings data provided for this date.');
    return {
      title: 'Hospitality / The Browns',
      items,
      hasData: false,
    };
  }
  
  const targetDate = date;
  const exceptionalBookings: BrownsBooking[] = [];
  
  for (const booking of bookings) {
    const hasException = 
      (booking.specialRequests && booking.specialRequests.trim().length > 0) ||
      (booking.notes && (
        booking.notes.toLowerCase().includes('late') ||
        booking.notes.toLowerCase().includes('early') ||
        booking.notes.toLowerCase().includes('exception') ||
        booking.notes.toLowerCase().includes('urgent') ||
        booking.notes.toLowerCase().includes('important')
      ));
    
    if (hasException) {
      exceptionalBookings.push(booking);
    }
  }
  
  if (exceptionalBookings.length === 0) {
    items.push('No exceptional bookings identified for this date.');
    return {
      title: 'Hospitality / The Browns',
      items,
      hasData: true,
    };
  }
  
  for (const booking of exceptionalBookings) {
    const guestName = booking.guestName || '[Guest name missing]';
    const suite = booking.suite || '[Suite missing]';
    const reasons: string[] = [];
    
    if (booking.specialRequests && booking.specialRequests.trim().length > 0) {
      reasons.push(`Special request: ${booking.specialRequests.trim()}`);
    }
    
    if (booking.notes && booking.notes.trim().length > 0) {
      reasons.push(`Note: ${booking.notes.trim()}`);
    }
    
    const reasonText = reasons.join('. ');
    items.push(`${guestName} (${suite}): ${reasonText}`);
  }
  
  return {
    title: 'Hospitality / The Browns',
    items,
    hasData: true,
  };
}

export function generateHeavyMetalSection(
  date: string,
  quoteFiles: HMQuoteFile[] | null
): ExceptionSection {
  const items: string[] = [];
  
  if (!quoteFiles) {
    items.push('No Heavy Metal open quotes directory provided.');
    return {
      title: 'Heavy Metal Sand & Stone',
      items,
      hasData: false,
    };
  }
  
  if (quoteFiles.length === 0) {
    items.push('No open Heavy Metal quotes found in provided directory.');
    return {
      title: 'Heavy Metal Sand & Stone',
      items,
      hasData: true,
    };
  }
  
  items.push(`${quoteFiles.length} open quote(s) pending follow-up:`);
  
  for (const quote of quoteFiles) {
    items.push(`- ${quote.displayName}`);
  }
  
  return {
    title: 'Heavy Metal Sand & Stone',
    items,
    hasData: true,
  };
}

export function generateNotesSection(notes: string | null): ExceptionSection {
  const items: string[] = [];
  
  if (!notes || notes.trim().length === 0) {
    items.push('No exception notes provided.');
    return {
      title: 'Exception Notes',
      items,
      hasData: false,
    };
  }
  
  const lines = notes.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length === 0) {
    items.push('No exception notes provided.');
    return {
      title: 'Exception Notes',
      items,
      hasData: false,
    };
  }
  
  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('##')) {
      continue;
    }
    
    if (line.startsWith('-') || line.startsWith('*')) {
      items.push(line);
    } else {
      items.push(`- ${line}`);
    }
  }
  
  return {
    title: 'Exception Notes',
    items,
    hasData: true,
  };
}
