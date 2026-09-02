import type { GuestFacts } from './types.js';

interface Section {
  heading: string;
  content: string;
  level: number;
}

export function parseMarkdown(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
      }
      
      currentSection = {
        heading: headingMatch[2].trim(),
        content: '',
        level: headingMatch[1].length
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    sections.push(currentSection);
  }

  return sections;
}

export function extractFacts(sections: Section[]): GuestFacts {
  const facts: GuestFacts = {};

  for (const section of sections) {
    const heading = section.heading.toLowerCase();
    const content = section.content.trim();

    if (!content) continue;

    // Direction extraction
    if (heading.includes('direction') || heading.includes('getting here') || heading.includes('how to find')) {
      facts.directions = extractCleanText(content);
    }

    // WiFi extraction
    if (heading.includes('wi-fi') || heading.includes('wifi') || heading.includes('internet')) {
      const wifiInfo = extractWiFiInfo(content);
      if (wifiInfo.ssid) {
        facts.wifi = wifiInfo.ssid;
      }
      if (wifiInfo.password) {
        facts.wifiPassword = wifiInfo.password;
      }
    }

    // Late check-in
    if (heading.includes('late check-in') || heading.includes('late arrival') || heading.includes('after hours')) {
      facts.lateCheckIn = extractCleanText(content);
    }

    // Blue Crane
    if (heading.includes('blue crane') || heading.includes('restaurant') || (heading.includes('dining') && content.toLowerCase().includes('blue crane'))) {
      facts.blueCrane = extractCleanText(content);
    }

    // Check-in/out times
    if (heading.includes('check-in') && !heading.includes('late')) {
      const checkInTime = extractTime(content, 'check-in');
      if (checkInTime) {
        facts.checkInTime = checkInTime;
      }
    }

    if (heading.includes('check-out') || heading.includes('checkout')) {
      const checkOutTime = extractTime(content, 'check-out');
      if (checkOutTime) {
        facts.checkOutTime = checkOutTime;
      }
    }

    // Address
    if (heading.includes('address') || heading.includes('location')) {
      const address = extractAddress(content);
      if (address) {
        facts.address = address;
      }
    }

    // Parking
    if (heading.includes('parking')) {
      facts.parking = extractCleanText(content);
    }

    // Contact
    if (heading.includes('contact') || heading.includes('phone') || heading.includes('email')) {
      const contact = extractContact(content);
      if (contact) {
        facts.contact = contact;
      }
    }

    // Breakfast
    if (heading.includes('breakfast')) {
      facts.breakfast = extractCleanText(content);
    }
  }

  return facts;
}

function extractCleanText(text: string): string {
  return text
    .split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('**') && !line.trim().startsWith('##'))
    .map(line => line.replace(/^[-*•]\s*/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractWiFiInfo(text: string): { ssid?: string; password?: string } {
  const result: { ssid?: string; password?: string } = {};
  
  const lines = text.split('\n');
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if ((lowerLine.includes('network') || lowerLine.includes('ssid')) && lowerLine.includes(':')) {
      const match = line.match(/:\s*(.+?)$/);
      if (match) {
        result.ssid = match[1].trim().replace(/[*_`]/g, '');
      }
    }
    
    if (lowerLine.includes('password') && lowerLine.includes(':')) {
      const match = line.match(/:\s*(.+?)$/);
      if (match) {
        result.password = match[1].trim().replace(/[*_`]/g, '');
      }
    }
  }
  
  return result;
}

function extractTime(text: string, type: string): string | undefined {
  const timePatterns = [
    /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/,
    /(\d{1,2}\s*(?:AM|PM|am|pm))/,
    /(\d{1,2}h\d{2})/
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

function extractAddress(text: string): string | undefined {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  for (const line of lines) {
    if (line.toLowerCase().includes('street') || 
        line.toLowerCase().includes('road') ||
        line.toLowerCase().includes('avenue') ||
        /\d{4}/.test(line)) {
      return line.replace(/^[-*•]\s*/, '').trim();
    }
  }
  
  if (lines.length > 0) {
    return lines[0].replace(/^[-*•]\s*/, '').trim();
  }
  
  return undefined;
}

function extractContact(text: string): string | undefined {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const contacts: string[] = [];
  
  for (const line of lines) {
    if (line.includes('@') || /[\d\s\-+()]{8,}/.test(line)) {
      contacts.push(line.replace(/^[-*•]\s*/, '').trim());
    }
  }
  
  return contacts.length > 0 ? contacts.join(', ') : undefined;
}
