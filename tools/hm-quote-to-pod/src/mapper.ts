/**
 * Map quote.json to pod.json stub
 * Field bridge only - never invents data
 */

import type { Quote, PodData, MappingReport } from './types.js';

/**
 * Map quote fields to pod fields
 * Rules:
 * - Copy customer, phone, volume, unit, location, date
 * - Take first material from materials array
 * - Leave signedBy undefined (NEVER invent)
 * - If volume missing in quote, leave missing in pod
 * - Append optional notes if provided
 */
export function mapQuoteToPod(
  quote: Quote,
  additionalNotes?: string
): { pod: PodData; report: MappingReport } {
  const pod: PodData = {};
  const carried: string[] = [];
  const missing: string[] = [];
  const notes: string[] = [];

  // Customer name
  if (quote.customerName) {
    pod.customer = quote.customerName;
    carried.push('customer (from customerName)');
  } else {
    missing.push('customer (customerName missing in quote)');
  }

  // Phone
  if (quote.customerPhone) {
    pod.phone = quote.customerPhone;
    carried.push('phone (from customerPhone)');
  } else {
    missing.push('phone (customerPhone missing in quote)');
  }

  // Material - take first from materials array
  if (quote.materials && quote.materials.length > 0) {
    pod.material = quote.materials[0];
    carried.push(`material (${quote.materials[0]} from materials[0])`);
    if (quote.materials.length > 1) {
      notes.push(
        `Multiple materials in quote: ${quote.materials.join(', ')}. Using first: ${quote.materials[0]}`
      );
    }
  } else {
    missing.push('material (materials missing or empty in quote)');
  }

  // Volume
  if (quote.volume !== undefined && quote.volume !== null) {
    pod.volume = quote.volume;
    carried.push('volume');
  } else {
    missing.push('volume (not present in quote)');
    notes.push('Volume missing in quote - do not invent. Must be confirmed before delivery.');
  }

  // Unit
  if (quote.volumeUnit) {
    pod.unit = quote.volumeUnit;
    carried.push('unit (from volumeUnit)');
  } else {
    missing.push('unit (volumeUnit missing in quote)');
  }

  // Delivery location
  if (quote.deliveryLocation) {
    pod.deliveryLocation = quote.deliveryLocation;
    carried.push('deliveryLocation');
  } else {
    missing.push('deliveryLocation (missing in quote)');
  }

  // Delivered at - use dateNeeded if present, otherwise leave missing
  if (quote.dateNeeded) {
    pod.deliveredAt = quote.dateNeeded;
    carried.push('deliveredAt (from dateNeeded - placeholder only, update with actual delivery time)');
    notes.push('deliveredAt copied from dateNeeded as placeholder. Update with actual delivery timestamp.');
  } else {
    missing.push('deliveredAt (dateNeeded missing in quote)');
  }

  // Vehicle - always missing (not in quote)
  missing.push('vehicle (not in quote schema)');

  // Driver - always missing (not in quote)
  missing.push('driver (not in quote schema)');

  // Notes - combine quote notes with optional additional notes
  const noteParts: string[] = [];
  if (quote.notes) {
    noteParts.push(quote.notes);
  }
  if (additionalNotes) {
    noteParts.push(additionalNotes);
  }
  if (noteParts.length > 0) {
    pod.notes = noteParts.join(' | ');
    carried.push('notes');
    if (additionalNotes) {
      notes.push('Additional notes appended from --notes argument');
    }
  } else {
    missing.push('notes (no quote notes or --notes provided)');
  }

  // signedBy - ALWAYS undefined (NEVER invent)
  missing.push('signedBy (NEVER populated by mapper - manual only)');
  notes.push('signedBy field intentionally left undefined. NEVER invent signatures.');

  // Price fields - not carried to pod (pod.json doesn't have pricing)
  if (quote.pricePerUnit || quote.totalPrice) {
    notes.push('Quote contains pricing fields. Not carried to pod.json (pricing not in POD schema).');
  }

  return {
    pod,
    report: { carried, missing, notes },
  };
}
