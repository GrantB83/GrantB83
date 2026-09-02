import { readFileSync, existsSync } from 'fs';
import type { BrandFacts } from './types.js';

/**
 * Loads brand facts from a markdown or JSON file
 */
export function loadFacts(factsPath: string | undefined): BrandFacts {
  if (!factsPath || !existsSync(factsPath)) {
    return getDefaultFacts();
  }

  const content = readFileSync(factsPath, 'utf-8');

  if (factsPath.endsWith('.json')) {
    return JSON.parse(content) as BrandFacts;
  }

  // Simple markdown parsing for key facts
  return parseMarkdownFacts(content);
}

function parseMarkdownFacts(markdown: string): BrandFacts {
  const facts: BrandFacts = getDefaultFacts();

  const lines = markdown.split('\n');
  for (const line of lines) {
    const lower = line.toLowerCase().trim();

    if (lower.includes('address:')) {
      facts.address = line.split(':')[1]?.trim();
    } else if (lower.includes('email:')) {
      facts.contactEmail = line.split(':')[1]?.trim();
    } else if (lower.includes('whatsapp:')) {
      facts.contactWhatsApp = line.split(':')[1]?.trim();
    } else if (lower.includes('wifi:')) {
      facts.wifi = line.split(':')[1]?.trim();
    } else if (lower.includes('parking:')) {
      facts.parking = line.split(':')[1]?.trim();
    } else if (lower.includes('check-in:')) {
      facts.checkInTime = line.split(':')[1]?.trim();
    } else if (lower.includes('check-out:')) {
      facts.checkOutTime = line.split(':')[1]?.trim();
    }
  }

  return facts;
}

/**
 * Returns safe default facts (no invented rates or check-in times)
 */
export function getDefaultFacts(): BrandFacts {
  return {
    address: 'The Browns Luxury Guest Suites, Dullstroom',
    suites: ['The Browns Suite', 'Garden Suite'],
    wifi: 'Available (details provided at check-in)',
    parking: 'On-site parking available',
    contactEmail: 'stay@hospitality.partners',
    contactWhatsApp: '+27 83 645 8313',
    checkInTime: 'Team will confirm',
    checkOutTime: 'Team will confirm'
  };
}
