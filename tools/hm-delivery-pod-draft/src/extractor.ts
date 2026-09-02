/**
 * Heuristic extraction logic for Heavy Metal delivery POD from paste text
 */

import type { PodData, ExtractionResult } from './types.js';

/**
 * Material keywords to detect in POD text
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
 * Extract POD data from paste text
 */
export function extractFromText(text: string): ExtractionResult {
  const pod: PodData = {};
  const missingFields: string[] = [];

  // Normalize text
  const normalized = text.trim();
  const lines = normalized.split('\n').map(l => l.trim());

  // Extract customer
  pod.customer = extractCustomer(lines, normalized);
  if (!pod.customer) {
    missingFields.push('customer');
  }

  // Extract phone
  pod.phone = extractPhone(normalized);

  // Extract material
  pod.material = extractMaterial(normalized);
  if (!pod.material) {
    missingFields.push('material');
  }

  // Extract volume and unit
  const volumeData = extractVolume(normalized);
  if (volumeData) {
    pod.volume = volumeData.volume;
    pod.unit = volumeData.unit;
  }
  if (!pod.volume) {
    missingFields.push('volume');
  }
  if (!pod.unit) {
    missingFields.push('unit');
  }

  // Extract delivery location
  pod.deliveryLocation = extractDeliveryLocation(normalized);
  if (!pod.deliveryLocation) {
    missingFields.push('deliveryLocation');
  }

  // Extract delivery date/time
  pod.deliveredAt = extractDeliveredAt(normalized);
  if (!pod.deliveredAt) {
    missingFields.push('deliveredAt');
  }

  // Extract vehicle
  pod.vehicle = extractVehicle(normalized);

  // Extract driver
  pod.driver = extractDriver(normalized);

  // Extract notes
  pod.notes = extractNotes(normalized);

  // Extract signature - NEVER invent
  pod.signedBy = extractSignature(normalized);

  return { pod, missingFields };
}

/**
 * Extract customer name from text
 */
function extractCustomer(lines: string[], text: string): string | undefined {
  // Look for "Customer:", "Name:", "Client:", etc.
  for (const line of lines) {
    const match = line.match(/^(?:customer|name|client|to):\s*(.+)$/i);
    if (match) {
      return match[1].trim();
    }
  }

  // Try first line if it looks like a name
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
    /\+27\s?\d{2}\s?\d{3}\s?\d{4}/,
    /0\d{2}\s?\d{3}\s?\d{4}/,
    /\d{10}/,
    /\+27\d{9}/,
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
 * Extract material from text
 */
function extractMaterial(text: string): string | undefined {
  const lowerText = text.toLowerCase();

  for (const material of MATERIAL_KEYWORDS) {
    if (lowerText.includes(material)) {
      return material.charAt(0).toUpperCase() + material.slice(1);
    }
  }

  return undefined;
}

/**
 * Extract volume and unit from text
 */
function extractVolume(text: string): { volume: number; unit: string } | undefined {
  const lowerText = text.toLowerCase();

  for (const unit of VOLUME_UNITS) {
    const unitPattern = unit.replace(/[³3]/g, '[³3]?');
    // Only match if number and unit are close together (within 2 chars)
    const pattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s{0,2}${unitPattern}\\b`, 'i');
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
    /(?:deliver(?:y|ed)?\s+(?:to|at)|location|address|site):\s*([^\n]+)/i,
    /deliver(?:y|ed)?\s+(?:to|at)\s+([^\n]+?)(?:\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const location = match[1].trim();
      // Remove any trailing keywords or newlines but keep commas
      return location.replace(/\s*(?:\n.*)?$/, '').trim();
    }
  }

  return undefined;
}

/**
 * Extract delivery date/time
 */
function extractDeliveredAt(text: string): string | undefined {
  // ISO format: YYYY-MM-DD or YYYY-MM-DD HH:MM
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)\b/);
  if (isoMatch) {
    return isoMatch[1];
  }

  // DD/MM/YYYY format
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

/**
 * Extract vehicle information
 */
function extractVehicle(text: string): string | undefined {
  const patterns = [
    /vehicle:\s*([^\n]+)/i,
    /truck:\s*([^\n]+)/i,
    /registration:\s*([A-Z0-9\s-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract driver name
 */
function extractDriver(text: string): string | undefined {
  const patterns = [
    /driver:\s*([^\n]+)/i,
    /delivered\s+by:\s*([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract notes
 */
function extractNotes(text: string): string | undefined {
  const patterns = [
    /notes?:\s*([^\n]+(?:\n(?!^\w+:)[^\n]+)*)/im,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract signature - NEVER invent this
 */
function extractSignature(text: string): string | undefined {
  const patterns = [
    /signed\s+by:\s*([^\n]+)/i,
    /signature:\s*([^\n]+)/i,
    /received\s+by:\s*([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().toLowerCase() !== 'n/a' && match[1].trim() !== '') {
      return match[1].trim();
    }
  }

  return undefined;
}
