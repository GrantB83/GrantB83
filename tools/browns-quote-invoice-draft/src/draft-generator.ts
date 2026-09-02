import type { QuoteInput, DraftOutputs, DraftManifest } from './types.js';
import { hasAmounts } from './validators.js';
import { 
  formatDate, 
  getGreeting, 
  getClosing, 
  formatCurrency,
  DEFAULT_TONE 
} from './tone.js';

export function generateDrafts(input: QuoteInput): DraftOutputs {
  const language = input.language || 'en';
  const hasAmountsData = hasAmounts(input);
  const includeProforma = input.includeProforma || 
    (input.depositRequired !== undefined && input.depositRequired > 0);

  const whatsappQuote = generateWhatsAppQuote(input, hasAmountsData, language);
  const emailQuote = generateEmailQuote(input, hasAmountsData, language);
  const proformaEmail = includeProforma 
    ? generateProformaEmail(input, hasAmountsData, language)
    : undefined;
  const approval = generateApproval(input, hasAmountsData, includeProforma);
  
  const files: string[] = [
    'draft-quote-whatsapp.txt',
    'draft-quote-email.txt'
  ];
  
  if (proformaEmail) {
    files.push('draft-proforma-email.txt');
  }
  
  files.push('APPROVAL.md', 'manifest.json');

  const manifest: DraftManifest = {
    generatedAt: new Date().toISOString(),
    guestName: input.guestName,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    suiteOrUnit: input.suiteOrUnit,
    hasAmounts: hasAmountsData,
    includesProforma: includeProforma,
    files
  };

  return {
    whatsappQuote,
    emailQuote,
    proformaEmail,
    approval,
    manifest
  };
}

function generateWhatsAppQuote(
  input: QuoteInput, 
  hasAmountsData: boolean, 
  language: 'en' | 'af'
): string {
  const greeting = getGreeting(language);
  const closing = getClosing(language);
  const checkIn = formatDate(input.checkInDate);
  const checkOut = formatDate(input.checkOutDate);

  let message = `${greeting} ${input.guestName}\n\n`;
  message += `Thank you for your inquiry about ${DEFAULT_TONE.propertyName}.\n\n`;

  if (hasAmountsData && input.nights && input.nightlyRate && input.total) {
    const currency = input.currency || 'ZAR';
    message += `*Your Quote:*\n`;
    message += `Suite: ${input.suiteOrUnit}\n`;
    message += `Check-in: ${checkIn}\n`;
    message += `Check-out: ${checkOut}\n`;
    message += `Nights: ${input.nights}\n`;
    message += `Rate: ${formatCurrency(input.nightlyRate, currency)} per night\n`;
    message += `Total: ${formatCurrency(input.total, currency)}\n\n`;

    if (input.depositRequired && input.depositRequired > 0) {
      message += `Deposit required: ${formatCurrency(input.depositRequired, currency)}\n\n`;
    }

    message += `Please let me know if you would like to proceed with the booking.\n\n`;
  } else {
    message += `I can confirm availability for:\n`;
    message += `Suite: ${input.suiteOrUnit}\n`;
    message += `Check-in: ${checkIn}\n`;
    message += `Check-out: ${checkOut}\n\n`;
    
    if (input.adults || input.children) {
      message += `Guests: `;
      const guests = [];
      if (input.adults) guests.push(`${input.adults} adult${input.adults > 1 ? 's' : ''}`);
      if (input.children) guests.push(`${input.children} child${input.children > 1 ? 'ren' : ''}`);
      message += guests.join(', ') + '\n\n';
    }

    message += `I will send you the formal quote and booking details shortly.\n\n`;
  }

  if (input.notes) {
    message += `${input.notes}\n\n`;
  }

  message += `${closing}\nGrant Brown`;

  return message;
}

function generateEmailQuote(
  input: QuoteInput, 
  hasAmountsData: boolean, 
  language: 'en' | 'af'
): string {
  const greeting = getGreeting(language);
  const closing = getClosing(language, true);
  const checkIn = formatDate(input.checkInDate);
  const checkOut = formatDate(input.checkOutDate);

  let email = `Subject: Your Booking Inquiry - ${DEFAULT_TONE.propertyName}\n\n`;
  email += `${greeting} ${input.guestName},\n\n`;
  email += `Thank you for your interest in ${DEFAULT_TONE.propertyName}.\n\n`;

  if (hasAmountsData && input.nights && input.nightlyRate && input.total) {
    const currency = input.currency || 'ZAR';
    email += `I am pleased to confirm availability and provide you with the following quote:\n\n`;
    
    email += `ACCOMMODATION DETAILS\n`;
    email += `Suite: ${input.suiteOrUnit}\n`;
    email += `Check-in: ${checkIn}\n`;
    email += `Check-out: ${checkOut}\n`;
    email += `Number of nights: ${input.nights}\n\n`;

    if (input.adults || input.children) {
      email += `Guests: `;
      const guests = [];
      if (input.adults) guests.push(`${input.adults} adult${input.adults > 1 ? 's' : ''}`);
      if (input.children) guests.push(`${input.children} child${input.children > 1 ? 'ren' : ''}`);
      email += guests.join(', ') + '\n\n';
    }

    email += `PRICING\n`;
    email += `Nightly rate: ${formatCurrency(input.nightlyRate, currency)}\n`;
    email += `Total accommodation: ${formatCurrency(input.total, currency)}\n\n`;

    if (input.depositRequired && input.depositRequired > 0) {
      email += `A deposit of ${formatCurrency(input.depositRequired, currency)} is required to confirm your reservation.\n\n`;
    }

    email += `Please let me know if you would like to proceed with this booking.\n\n`;
  } else {
    email += `I can confirm availability for the following dates:\n\n`;
    email += `Suite: ${input.suiteOrUnit}\n`;
    email += `Check-in: ${checkIn}\n`;
    email += `Check-out: ${checkOut}\n\n`;

    if (input.adults || input.children) {
      email += `Guests: `;
      const guests = [];
      if (input.adults) guests.push(`${input.adults} adult${input.adults > 1 ? 's' : ''}`);
      if (input.children) guests.push(`${input.children} child${input.children > 1 ? 'ren' : ''}`);
      email += guests.join(', ') + '\n\n';
    }

    email += `Our reservations team will send you the formal quote and booking confirmation shortly.\n\n`;
  }

  if (input.notes) {
    email += `${input.notes}\n\n`;
  }

  email += `${closing},\n\nGrant Brown\n`;
  email += `${DEFAULT_TONE.propertyName}\n`;
  email += `grant@thebrowns.co.za`;

  return email;
}

function generateProformaEmail(
  input: QuoteInput, 
  hasAmountsData: boolean, 
  language: 'en' | 'af'
): string {
  const greeting = getGreeting(language);
  const closing = getClosing(language, true);
  const checkIn = formatDate(input.checkInDate);
  const checkOut = formatDate(input.checkOutDate);

  let email = `Subject: Proforma Invoice - ${input.guestName} - ${input.suiteOrUnit}\n\n`;
  email += `${greeting} ${input.guestName},\n\n`;
  email += `Please find below your proforma invoice for your upcoming stay at ${DEFAULT_TONE.propertyName}.\n\n`;

  email += `PROFORMA INVOICE\n`;
  email += `Guest: ${input.guestName}\n`;
  email += `Suite: ${input.suiteOrUnit}\n`;
  email += `Check-in: ${checkIn}\n`;
  email += `Check-out: ${checkOut}\n\n`;

  if (hasAmountsData && input.nights && input.nightlyRate && input.total) {
    const currency = input.currency || 'ZAR';
    
    if (input.adults || input.children) {
      email += `Guests: `;
      const guests = [];
      if (input.adults) guests.push(`${input.adults} adult${input.adults > 1 ? 's' : ''}`);
      if (input.children) guests.push(`${input.children} child${input.children > 1 ? 'ren' : ''}`);
      email += guests.join(', ') + '\n\n';
    }

    email += `CHARGES\n`;
    email += `Accommodation (${input.nights} night${input.nights > 1 ? 's' : ''} @ ${formatCurrency(input.nightlyRate, currency)}): ${formatCurrency(input.total, currency)}\n\n`;

    email += `TOTAL: ${formatCurrency(input.total, currency)}\n\n`;

    if (input.depositRequired && input.depositRequired > 0) {
      email += `DEPOSIT REQUIRED: ${formatCurrency(input.depositRequired, currency)}\n\n`;
      email += `Payment details will be provided upon confirmation.\n\n`;
    } else {
      email += `Payment details: [PAYMENT_LINK]\n\n`;
    }
  } else {
    email += `Our reservations team will provide the detailed pricing and payment information shortly.\n\n`;
  }

  email += `${closing},\n\nGrant Brown\n`;
  email += `${DEFAULT_TONE.propertyName}\n`;
  email += `grant@thebrowns.co.za`;

  return email;
}

function generateApproval(
  input: QuoteInput, 
  hasAmountsData: boolean,
  includeProforma: boolean
): string {
  let approval = `# APPROVAL REQUIRED\n\n`;
  approval += `**Generated:** ${new Date().toISOString()}\n\n`;
  approval += `## Booking Details\n\n`;
  approval += `- Guest: ${input.guestName}\n`;
  approval += `- Suite: ${input.suiteOrUnit}\n`;
  approval += `- Check-in: ${input.checkInDate}\n`;
  approval += `- Check-out: ${input.checkOutDate}\n`;
  
  if (input.channel) {
    approval += `- Channel: ${input.channel}\n`;
  }
  
  approval += `\n## Amounts\n\n`;
  
  if (hasAmountsData) {
    if (input.nightlyRate) approval += `- Nightly rate: ${input.nightlyRate}\n`;
    if (input.nights) approval += `- Nights: ${input.nights}\n`;
    if (input.total) approval += `- Total: ${input.total}\n`;
    if (input.depositRequired) approval += `- Deposit: ${input.depositRequired}\n`;
    if (input.currency) approval += `- Currency: ${input.currency}\n`;
  } else {
    approval += `⚠️ **NO AMOUNTS PROVIDED** - Drafts indicate availability only.\n`;
    approval += `No rates or totals were invented.\n`;
  }

  approval += `\n## Generated Files\n\n`;
  approval += `- \`draft-quote-whatsapp.txt\` - WhatsApp message draft\n`;
  approval += `- \`draft-quote-email.txt\` - Email quote draft\n`;
  
  if (includeProforma) {
    approval += `- \`draft-proforma-email.txt\` - Proforma invoice draft\n`;
  }
  
  approval += `\n## Next Steps\n\n`;
  approval += `1. Review all draft files\n`;
  approval += `2. Verify amounts match source data\n`;
  approval += `3. Adjust tone or content if needed\n`;
  approval += `4. Grant must approve before sending\n\n`;
  approval += `**⚠️ NEVER SEND WITHOUT EXPLICIT APPROVAL**\n\n`;
  approval += `## Approval Gates\n\n`;
  approval += `- [ ] Amounts verified correct (or confirmed as availability-only)\n`;
  approval += `- [ ] Tone appropriate for guest\n`;
  approval += `- [ ] Ready to send via appropriate channel\n`;

  return approval;
}
