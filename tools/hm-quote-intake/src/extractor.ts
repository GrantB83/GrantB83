/**
 * Heuristic extraction logic for Heavy Metal quote inquiries
 */

import type { Quote, ExtractionResult } from './types.js';

/**
 * Material keywords to detect in inquiry text
 */
const MATERIAL_KEYWORDS = [
  'sand',
  'stone',
  'gravel',
  'crusher dust',
  'crusher-dust',
  'crushed stone',
  'fill',
  'aggregate',
  'rock',
  'pebble',
  'ballast',
  'g5',
  'g7',
];

/**
 * Volume unit patterns
 */
const VOLUME_UNITS = ['m³', 'm3', 'ton', 'tons', 'tonne', 'tonnes', 'load', 'loads', 'cubic meter', 'cubic metres'];

/**
 * Extract structured quote data from inquiry text
 */
export function extractQuote(text: string): ExtractionResult {
  const quote: Quote = {};
  const missingFields: string[] = [];

  // Normalize text
  const normalized = text.trim();
  const lines = normalized.split('\n').map(l => l.trim());

  // Extract customer name
  quote.customerName = extractCustomerName(lines);
  if (!quote.customerName) {
    missingFields.push('customerName');
  }

  // Extract customer phone
  quote.customerPhone = extractPhone(normalized);
  if (!quote.customerPhone) {
    missingFields.push('customerPhone');
  }

  // Extract materials
  quote.materials = extractMaterials(normalized);
  if (!quote.materials || quote.materials.length === 0) {
    missingFields.push('materials');
  }

  // Extract volume and unit
  const volumeData = extractVolume(normalized);
  if (volumeData) {
    quote.volume = volumeData.volume;
    quote.volumeUnit = volumeData.unit;
  }
  if (!quote.volume) {
    missingFields.push('volume');
  }
  if (!quote.volumeUnit) {
    missingFields.push('volumeUnit');
  }

  // Extract delivery location
  quote.deliveryLocation = extractDeliveryLocation(normalized);
  if (!quote.deliveryLocation) {
    missingFields.push('deliveryLocation');
  }

  // Extract date needed
  quote.dateNeeded = extractDate(normalized);
  if (!quote.dateNeeded) {
    missingFields.push('dateNeeded');
  }

  // Extract pricing (ONLY if explicitly present)
  const pricing = extractPricing(normalized);
  if (pricing) {
    quote.pricePerUnit = pricing.pricePerUnit;
    quote.totalPrice = pricing.totalPrice;
    quote.currency = pricing.currency;
  }

  // Extract notes (any additional context)
  quote.notes = extractNotes(normalized);

  return { quote, missingFields };
}

/**
 * Extract customer name from text
 */
function extractCustomerName(lines: string[]): string | undefined {
  // Look for "Name:", "From:", or first line patterns
  for (const line of lines) {
    const nameMatch = line.match(/^(?:name|from|customer|contact):\s*(.+)$/i);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
  }

  // Try first line if it looks like a name (2-4 words, capitalized)
  const firstLine = lines[0];
  if (firstLine && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(firstLine)) {
    return firstLine;
  }

  return undefined;
}

/**
 * Extract phone number from text
 */
function extractPhone(text: string): string | undefined {
  // South African phone patterns
  const phonePatterns = [
    /\+27\s?\d{2}\s?\d{3}\s?\d{4}/,  // +27 12 345 6789
    /0\d{2}\s?\d{3}\s?\d{4}/,        // 012 345 6789
    /\d{10}/,                         // 0123456789
    /\+27\d{9}/,                      // +27123456789
  ];

  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].replace(/\s/g, '');
    }
  }

  return undefined;
}

/**
 * Extract materials from text
 */
function extractMaterials(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const material of MATERIAL_KEYWORDS) {
    if (lowerText.includes(material)) {
      // Capitalize first letter for output
      const capitalized = material.charAt(0).toUpperCase() + material.slice(1);
      if (!found.includes(capitalized)) {
        found.push(capitalized);
      }
    }
  }

  return found;
}

/**
 * Extract volume and unit from text
 */
function extractVolume(text: string): { volume: number; unit: string } | undefined {
  const lowerText = text.toLowerCase();

  // Try to find number + unit patterns
  for (const unit of VOLUME_UNITS) {
    const unitPattern = unit.replace(/[³3]/g, '[³3]?');
    const pattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unitPattern}`, 'i');
    const match = lowerText.match(pattern);
    
    if (match) {
      return {
        volume: parseFloat(match[1]),
        unit: unit.includes('3') || unit.includes('³') ? 'm³' : unit,
      };
    }
  }

  return undefined;
}

/**
 * Extract delivery location from text
 */
function extractDeliveryLocation(text: string): string | undefined {
  const patterns = [
    // "Delivery: Location" or "Delivery to: Location" or "Location: Location"
    /(?:deliver(?:y)?(?:\s+to)?|location|address|site):\s*([^\n]+)/i,
    // "delivered to Location" or "deliver to Location"
    /deliver(?:y|ed)?\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    // "to Location" or "at Location" (with capital letter start)
    /\b(?:to|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const location = match[1].trim();
      // Remove any trailing punctuation or newlines
      return location.replace(/[.,;:\n].*$/, '').trim();
    }
  }

  return undefined;
}

/**
 * Extract date from text
 */
function extractDate(text: string): string | undefined {
  // ISO format: YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return isoMatch[0];
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slashMatch) {
    // Assume DD/MM/YYYY (SA standard)
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Natural language: "15 September", "September 15"
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
  
  for (let i = 0; i < monthNames.length; i++) {
    const month = monthNames[i];
    const pattern = new RegExp(`\\b(\\d{1,2})\\s+${month}|${month}\\s+(\\d{1,2})\\b`, 'i');
    const match = text.match(pattern);
    if (match) {
      const day = (match[1] || match[2]).padStart(2, '0');
      const monthNum = (i + 1).toString().padStart(2, '0');
      const year = new Date().getFullYear();
      return `${year}-${monthNum}-${day}`;
    }
  }

  return undefined;
}

/**
 * Extract pricing information (ONLY if explicitly present)
 */
function extractPricing(text: string): { pricePerUnit?: number; totalPrice?: number; currency?: string } | undefined {
  const currencyPatterns = [
    { symbol: 'R', name: 'ZAR' },
    { symbol: 'ZAR', name: 'ZAR' },
    { symbol: '$', name: 'USD' },
  ];

  let result: { pricePerUnit?: number; totalPrice?: number; currency?: string } | undefined;

  for (const { symbol, name } of currencyPatterns) {
    // Price per unit pattern - "Price: R500 per ton" or "R500 per ton"
    const perUnitPattern = new RegExp(`${symbol}\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?)\\s+per\\s+(?:ton|m³|m3|unit|load)`, 'i');
    const perUnitMatch = text.match(perUnitPattern);
    if (perUnitMatch) {
      result = result || {};
      result.pricePerUnit = parseFloat(perUnitMatch[1].replace(/,/g, ''));
      result.currency = name;
    }

    // Total price pattern - "Total: R2500" or "Total quote: R2500"
    const totalPattern = new RegExp(`total(?:\\s+(?:quote|price|cost))?\\s*:?\\s*${symbol}\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{2})?)`, 'i');
    const totalMatch = text.match(totalPattern);
    if (totalMatch) {
      result = result || {};
      result.totalPrice = parseFloat(totalMatch[1].replace(/,/g, ''));
      result.currency = name;
    }
  }

  return result;
}

/**
 * Extract notes/additional context
 */
function extractNotes(text: string): string {
  // Return the full text as notes for now
  // In production, this could be more selective
  return text.substring(0, 500); // Limit to 500 chars
}
